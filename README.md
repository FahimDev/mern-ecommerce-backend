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