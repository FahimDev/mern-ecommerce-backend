# MERN E-commerce — Backend

Express 5 + Mongoose 9 + Zod 4 backend. API documentation is written
inline next to each route using JSDoc `@openapi` blocks, and served
by Swagger UI at `/api-docs`.

## Quick start

```bash
# 1. start MongoDB + UI via docker compose
npm run db:up

# 2. install deps
npm install

# 3. run the API on http://localhost:5000
npm run dev
```

When the server starts it prints a banner with the URLs for the API,
Swagger UI, the raw OpenAPI JSON, and the Mongo Express UI
(`teacher` / `teacher123`).

## Scripts

| Command           | What it does                                          |
|-------------------|-------------------------------------------------------|
| `npm run dev`     | Start the server with nodemon                         |
| `npm run start`   | Start the server without nodemon                      |
| `npm run db:up`   | Start mongo + mongo-express containers                |
| `npm run db:down` | Stop them                                             |
| `npm run db:logs` | Tail mongo logs                                       |
| `npm run check`   | `node --check server.js` smoke check                  |

## Useful URLs

- API base: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI JSON: `http://localhost:5000/openapi.json`
- Mongo Express: `http://localhost:8081` (user `teacher`, pass `teacher123`)

## How docs work

The OpenAPI definition lives in two places and only two:

1. **`src/docs/swagger.js`** — the OpenAPI metadata (info, server,
   bearer-auth scheme, shared response envelopes) and the glob of
   files swagger-jsdoc scans for JSDoc.
2. **`@openapi` JSDoc blocks** placed directly above each
   `router.<method>(...)` call in `src/routes/*.js`.

The spec is **generated at boot time** — there is no `openapi.json`
to commit and no build step to remember. Restart the server, and
the spec reflects whatever the route files say.

## Adding a documented endpoint

There is exactly **one rule**: each `router.<method>(path, ...)` line
must have a JSDoc `@openapi` block directly above it. That's it.

```js
// src/routes/auth.routes.js

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate and receive a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessEnvelope"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         token: { type: string }
 *                         user:  { $ref: "#/components/schemas/User" }
 *       401:
 *         description: Invalid credentials.
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorEnvelope" }
 */
router.post("/login", login);
```

For endpoints that need a JWT, add `security: [{ bearerAuth: [] }]`
at the operation level; the padlock icon in Swagger UI will light
up automatically.

For new shared component schemas (a new resource type, a new envelope,
etc.), add them under `components.schemas` in `src/docs/swagger.js`
and reference them with `$ref`.

## Source-of-truth map

- **OpenAPI metadata, schemas, security**: `src/docs/swagger.js`
- **Endpoint docs**: JSDoc blocks in `src/routes/*.js`
- **Runtime validation**: Zod schemas in `src/controllers/*.controller.js`

## How requests flow

The diagram below shows how a request travels through the running
system — Express, controllers/services, Mongo, and Redis — for each
auth lifecycle event. Arrows are top-down; labels on arrows are the
action or payload being moved.

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Express as Express app
    participant MW as Middleware<br/>(helmet, cors,<br/>cookie-parser, morgan)
    participant Auth as Auth Controller
    participant User as User Model<br/>(Mongoose)
    participant Mongo as MongoDB
    participant TS as token.service
    participant SS as session.service
    participant Redis as Redis

    %% Bootstrap
    rect rgb(40, 44, 52)
    note over Express,Redis: Bootstrap (npm run dev)
    Express->>Express: server.js loads .env
    Express->>Mongo: mongoose.connect(MONGO_URI)
    Mongo-->>Express: connected
    Express->>Redis: redis.connect() (lazy, retried)
    Redis-->>Express: ready
    Express->>Client: listen on :5000
    end

    %% Register
    rect rgb(35, 60, 45)
    note over Client,Redis: POST /api/auth/register
    Client->>Express: POST /register {name,email,password}
    Express->>MW: helmet, cors, json, cookie-parser, morgan
    MW->>Auth: register(req)
    Auth->>Auth: Zod parse (registerSchema)
    Auth->>User: User.findOne({email})
    User->>Mongo: query users
    Mongo-->>User: null
    User-->>Auth: null
    Auth->>User: User.create({name,email,password})
    User->>User: pre("save") -> bcrypt.hash
    User->>Mongo: insert
    Mongo-->>User: doc
    User-->>Auth: user (toJSON strips password)
    Auth-->>Client: 201 {success,message,data:{user}}
    end

    %% Login
    rect rgb(35, 50, 70)
    note over Client,Redis: POST /api/auth/login
    Client->>Express: POST /login {email,password}
    Express->>MW: middleware chain
    MW->>Auth: login(req)
    Auth->>Auth: Zod parse (loginSchema)
    Auth->>User: User.findOne({email})
    User->>Mongo: query users
    Mongo-->>User: user
    User-->>Auth: user
    Auth->>User: user.comparePassword(pw)
    User->>Mongo: (bcrypt.compare, no DB hit)
    User-->>Auth: true
    Auth->>TS: newSessionId()
    TS-->>Auth: sid
    Auth->>TS: signAccessToken(user)
    TS-->>Auth: accessToken (JWT, JWT_SECRET, ~15m)
    Auth->>TS: signRefreshToken(user, sid)
    TS-->>Auth: refreshToken (JWT, REFRESH_TOKEN_SECRET, ~7d)
    Auth->>SS: saveSession({userId, refreshToken, ua})
    SS->>TS: hashToken(refreshToken) (sha256)
    SS->>Redis: HSET auth:session:<sid><br/>{userId, refreshHash, ua, createdAt}
    Redis-->>SS: ok
    Auth->>Express: res.cookie("rt", refreshToken, HttpOnly)
    Auth-->>Client: 200 {accessToken}<br/>+ Set-Cookie: rt=...
    end

    %% Me
    rect rgb(70, 55, 30)
    note over Client,Redis: GET /api/auth/me
    Client->>Express: GET /me<br/>Authorization: Bearer <accessToken>
    Express->>MW: middleware chain
    MW->>Express: protect(req,res,next)
    Express->>Express: jwt.verify(token, JWT_SECRET)
    Express->>User: User.findById(decoded.id).select("-password")
    User->>Mongo: query users
    Mongo-->>User: user
    User-->>Express: user
    Express->>Auth: next() (req.user set)
    Auth-->>Client: 200 {user}
    end

    %% Refresh (current state)
    rect rgb(70, 35, 40)
    note over Client,Redis: POST /api/auth/refresh  (currently a stub)
    Client->>Express: POST /refresh<br/>Cookie: rt=<refreshToken>
    Express->>MW: middleware chain
    MW->>Auth: refresh(req)
    Auth-->>Client: 200 {message:"Use POST /api/auth/refresh", data:null}
    note right of Auth: Intended flow once enabled:<br/>1) jwt.verify(rt, REFRESH_TOKEN_SECRET)<br/>2) session.service.getSession(sid)<br/>3) session.service.rotateSession(...)<br/>4) sign + set new access + new refresh cookie
    end

    %% Logout
    rect rgb(60, 40, 70)
    note over Client,Redis: POST /api/auth/logout
    Client->>Express: POST /logout<br/>Cookie: rt=<refreshToken>
    Express->>MW: middleware chain
    MW->>Auth: logout(req)
    Auth->>Auth: jwt.decode(rt) -> sid (unverified)
    Auth->>SS: deleteSession(sid)
    SS->>Redis: DEL auth:session:<sid>
    Redis-->>SS: ok
    Auth->>Express: res.clearCookie("rt")
    Auth-->>Client: 200 {message:"Logged out"}
    end
```

### Reading the diagram

- **Bootstrap** is one-time at process start: Mongo is connected
  eagerly (the process exits if it fails), Redis is connected
  lazily with retries so missing `docker compose up -d` doesn't
  crash boot.
- **Register** writes to Mongo only. No session, no Redis, no JWT.
- **Login** is the only path that touches **all three** stores at
  once: Mongo for the user record, Redis for the session hash
  keyed by `sid`, and the response carries an HttpOnly refresh
  cookie alongside a short-lived access JWT.
- **Me** validates the access JWT, then re-reads the user from
  Mongo so deleted users cannot keep using a still-valid token.
- **Refresh** is currently a stub — the intended flow (shown in
  the note on the diagram) verifies the refresh JWT, looks up
  the session in Redis, rotates it, and mints a new access
  token + cookie.
- **Logout** is best-effort: it decodes the cookie without
  verifying the signature, deletes the matching session from
  Redis if present, and clears the cookie.

## Components: what each one actually does

The diagrams above show *what happens* during a request. This section
shows **what each component owns and which wire-level operations it
performs**. Three diagrams, one per backend piece.

### Backend (Express + controllers + services)

The backend is a stateless HTTP layer. It owns **request shape**
(validation, routing, error formatting), **token signing**, and
**business rules**. It does not own user records or session records —
both of those live in Mongo and Redis respectively.

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant E as Express app<br/>(routes + middleware)
    participant A as Auth controller
    participant T as token.service
    participant S as session.service

    C->>E: POST /api/auth/login {email,password}
    E->>E: helmet, cors, cookie-parser,<br/>json, morgan
    E->>A: register/login/refresh/me/logout(req)
    A->>A: Zod schema.parse(body)
    A->>T: signAccessToken(user)
    T-->>A: access JWT
    A->>T: signRefreshToken(user, sid)
    T-->>A: refresh JWT
    A->>S: saveSession / getSession /<br/>rotateSession / deleteSession
    S-->>A: ok | session | null
    A->>E: res.cookie("rt", ...) or<br/>res.clearCookie("rt")
    A-->>C: JSON envelope<br/>{success, message, data}
    E->>C: Set-Cookie, status code
```

**Wire-level ops the backend performs**

| Op | Library | Target |
| --- | --- | --- |
| HTTP parse | `express.json()` + `cookie-parser` | request body, cookies |
| Validation | `zod` | request DTO |
| JWT sign | `jsonwebtoken.sign` | in-memory secret (`JWT_SECRET`, `REFRESH_TOKEN_SECRET`) |
| JWT verify | `jsonwebtoken.verify` | in-memory secret |
| Hash | `crypto.createHash("sha256")` | refresh token bytes |
| Session | delegates to `session.service` | Redis |
| Bcrypt | `bcryptjs` | password vs stored hash (no DB hit) |

> **Why this matters:** everything in this column is **stateless** and
> **in-process**. Killing the server loses nothing — Mongo and Redis
> are the only sources of truth.

### MongoDB (durable storage)

MongoDB owns the **User** collection — the only durable business
record in the system. It is reached **only** through Mongoose models
from controllers. No session, token, or cookie data ever lives here.

```mermaid
sequenceDiagram
    autonumber
    participant A as Auth controller
    participant M as Mongoose<br/>(User model)
    participant DB as MongoDB<br/>users collection

    A->>M: User.findOne({email})
    M->>DB: query users<br/>(uses unique index on email)
    DB-->>M: doc | null
    M-->>A: user | null

    A->>M: user.comparePassword(pw)
    M->>M: bcrypt.compare<br/>(no DB hit)

    A->>M: User.create({name,email,password})
    M->>M: pre("save") hook<br/>bcrypt.hash
    M->>DB: insertOne(users)
    DB-->>M: doc
    M-->>A: user

    A->>M: User.findById(id).select("-password")
    M->>DB: findOne({_id})
    DB-->>M: doc
    M-->>A: user (toJSON strips password)
```

**MongoDB operations in this app**

| Op | When | Index used |
| --- | --- | --- |
| `findOne({email})` | `register` (uniqueness check), `login` | unique index on `email` |
| `insertOne` | `register` (after bcrypt hash) | writes implicit `_id` |
| `findById(id)` | `me`, `refresh` | implicit `_id` |
| `comparePassword` | `login` (in-process) | none — bcrypt against stored hash |
| `pre("save")` hook | `User.create` | none — pure CPU |

> **Why Mongo and not Redis:** passwords are **durable**, **slow to
> re-derive**, and only need lookup-by-email — a perfect fit for an
> index-backed RDBMS-shaped store. Redis is volatile-by-design; the
> session store is fine to lose on a Redis restart because the worst
> case is a forced re-login.

### Redis (session store + cache)

Redis owns **session records** keyed by the refresh JWT's `sid`
claim. It is reached only via `session.service.js`. Login writes a
hash with a TTL; every subsequent request that involves a session
reads it; rotation deletes the old key and writes a new one.

```mermaid
sequenceDiagram
    autonumber
    participant A as Auth controller
    participant S as session.service
    participant R as Redis<br/>(hash auth:session:<sid>)

    A->>S: saveSession({sid,userId,refreshToken,ua})
    S->>S: hashToken(refreshToken)<br/>(sha256)
    S->>R: HSET auth:session:<sid><br/>userId, refreshHash, ua, createdAt
    S->>R: EXPIRE auth:session:<sid> 604800<br/>(mirrors REFRESH_TOKEN_EXPIRES_IN)
    R-->>S: ok

    A->>S: getSession(sid)
    S->>R: HGETALL auth:session:<sid>
    R-->>S: {userId,refreshHash,ua,createdAt} | empty
    S-->>A: session | null

    A->>S: rotateSession({oldSid,sid,<br/>userId,refreshToken,ua})
    S->>R: DEL auth:session:<oldSid>
    S->>S: hashToken(newRefreshToken)
    S->>R: HSET auth:session:<sid> ... + EXPIRE
    R-->>S: ok

    A->>S: deleteSession(sid)
    S->>R: DEL auth:session:<sid>
    R-->>S: ok
```

**Key shape**

```
auth:session:<sid>          (Redis hash)
  userId        -> ObjectId-as-string
  refreshHash   -> sha256(refreshToken)
  ua            -> User-Agent at login
  createdAt     -> ISO timestamp
  TTL           -> 7d (mirrors REFRESH_TOKEN_EXPIRES_IN)
```

**Redis ops in this app**

| Op | When | Purpose |
| --- | --- | --- |
| `HSET` + `EXPIRE` | login | create session row + self-destruct timer |
| `HGETALL` | refresh, `me`-adjacent flows | prove the cookie matches a live session |
| `DEL` (old) + `HSET` + `EXPIRE` | refresh | rotate (one-shot token) |
| `DEL` | logout | revoke |

> **Why hash, not string:** we want to store several fields under one
> `sid` without serializing JSON in user code. `HGETALL` returns the
> whole record in one call.
>
> **Why TTL:** Redis is volatile-by-design. A fixed-window TTL means
> abandoned sessions **cannot outlive** their refresh JWT's `exp` —
> which is the property that lets you stop worrying about cleanup.

### How the three pieces connect

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant B as Backend<br/>(Express + services)
    participant DB as MongoDB
    participant R as Redis

    C->>B: HTTP request
    B->>DB: durable reads/writes<br/>(User collection)
    B->>R: session reads/writes<br/>(auth:session:<sid>)
    B-->>C: Set-Cookie + JSON response

    note over DB: source of truth for users
    note over R: source of truth for active sessions
    note over B: stateless; signs/verifies JWTs,<br/>calls both stores
```