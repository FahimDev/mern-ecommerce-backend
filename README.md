# MERN E-commerce — Backend

Express 5 + Mongoose 9 + Zod 4 backend. Validation, types, and OpenAPI
are all generated from the same Zod schemas, so the docs cannot drift
out of sync with the code that runs.

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

| Command           | What it does                                                    |
|-------------------|-----------------------------------------------------------------|
| `npm run dev`     | Start the server with nodemon                                   |
| `npm run start`   | Start the server without nodemon                                |
| `npm run db:up`   | Start mongo + mongo-express containers                          |
| `npm run db:down` | Stop them                                                       |
| `npm run db:logs` | Tail mongo logs                                                 |
| `npm run check`   | `node --check server.js` smoke check                            |
| `npm run docs:build` | Dump the generated spec to `openapi.json`                   |
| `npm run docs:check` | Verify every router op has a matching `*.routes.docs.js`    |
| `npm run docs:lint`  | Lint the generated spec (Redocly if available, fallback otherwise) |

## Useful URLs

- API base: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI JSON: `http://localhost:5000/openapi.json`
- Mongo Express: `http://localhost:8081` (user `teacher`, pass `teacher123`)

## Adding a documented endpoint

The contract is: **one Zod schema per request/response, registered with
`.openapi()`, and one `routeDocument()` call per HTTP operation.**

### 1. Define the request and response schemas in the controller

Use `extendZodWithOpenApi(z)` once (already done in `src/controllers/`)
so Zod gets the `.openapi()` method, then annotate each schema:

```js
// src/controllers/auth.controller.js
const { z } = require("zod");
const { extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");
const { SuccessEnvelope, User: UserDoc } = require("../docs/schemas");

extendZodWithOpenApi(z);

const loginRequestSchema = z
  .object({
    email: z.email().openapi({ example: "fahim@example.com" }),
    password: z.string().min(6).openapi({
      example: "secret123",
      description: "Minimum 6 characters.",
    }),
  })
  .openapi("LoginRequest", {
    description: "Payload for logging in.",
  });

const loginResponseSchema = SuccessEnvelope(
  z.object({ token: z.string(), user: UserDoc }),
  "LoginResponse"
);

module.exports.loginRequestSchema = loginRequestSchema;
module.exports.loginResponseSchema = loginResponseSchema;
```

### 2. Add a `*.routes.docs.js` next to the router

Each router file under `src/routes/` should have a matching doc file
under `src/docs/routes/`. The doc file calls `routeDocument()` for each
operation on the router:

```js
// src/docs/routes/auth.routes.docs.js
const { routeDocument } = require("../routeDocument");
const {
  loginRequestSchema,
  loginResponseSchema,
} = require("../../controllers/auth.controller");

routeDocument({
  tag: "Auth",
  method: "post",
  path: "/api/auth/login",
  summary: "Authenticate and receive a JWT",
  request: { schema: loginRequestSchema },
  responses: {
    200: { description: "Login successful", schema: loginResponseSchema },
    401: { description: "Invalid credentials" },
  },
  security: [{ bearerAuth: [] }],
});
```

### 3. Wire the doc file into the assembler

Open `src/docs/openapi.js` and add a `require()` for the new doc file:

```js
require("./routes/auth.routes.docs");
```

That's it. The next `npm run dev` will serve the new endpoint in both
the API and Swagger UI, and `npm run docs:check` will enforce parity
between `src/routes/` and `src/docs/routes/`.

## Source-of-truth map

- **Domain types and envelopes**: `src/docs/schemas/index.js`
- **Per-feature OpenAPI registration**: `src/docs/routes/*.routes.docs.js`
- **Helper**: `src/docs/routeDocument.js`
- **Generator / assembler**: `src/docs/openapi.js`
- **Static checks**: `scripts/docs-check.js`, `scripts/docs-lint.js`