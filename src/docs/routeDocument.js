// Theory:
// `routeDocument()` is the ONE place a developer touches when documenting
// a new endpoint. It hides OpenAPI 3 plumbing (paths, requestBody, responses,
// security) behind a tiny declarative shape:
//
//   routeDocument({
//     tag: "Auth",
//     method: "post",
//     path: "/api/auth/register",
//     summary: "...",
//     request:  { schema: RegisterRequest },
//     responses: {
//       201: { description: "User created", schema: RegisterResponse },
//       409: { description: "Email already exists" },
//     },
//   });
//
// Adding a new endpoint is then three steps:
//   1. Define Zod schema with `.openapi("Name", { description, example })`
//   2. Call `routeDocument()` with the route shape
//   3. Import the route-doc module from `src/docs/openapi.js`

const { OpenAPIRegistry } = require("@asteasolutions/zod-to-openapi");

// One shared registry used by the generator. Module-scope singleton so the
// helper can be imported from any file without callers having to pass it in.
const registry = new OpenAPIRegistry();

/**
 * @typedef {Object} RequestSpec
 * @property {import("zod").ZodTypeAny} schema    Zod schema for the body.
 * @property {string} [contentType]                Defaults to "application/json".
 * @property {string} [description]
 * @property {boolean} [required]                  Defaults to true.
 * @property {Record<string, { summary?: string, value: object }>} [examples]
 *
 * @typedef {Object} ResponseSpec
 * @property {string} description
 * @property {import("zod").ZodTypeAny} [schema]  Zod schema for the response body.
 * @property {Record<string, { summary?: string, value: object }>} [examples]
 *
 * @typedef {Object} RouteDocArgs
 * @property {string} tag
 * @property {"get"|"post"|"put"|"patch"|"delete"} method
 * @property {string} path
 * @property {string} summary
 * @property {string} [description]
 * @property {RequestSpec} [request]
 * @property {Record<string, ResponseSpec>} responses
 * @property {Array<{ [scheme: string]: string[] }>} [security]
 * @property {Record<string, unknown>} [parameters]   Path/query params (Zod schemas keyed by name+in).
 */

/**
 * Register one OpenAPI operation against the shared registry.
 * Returns the registry so callers can chain if they want.
 *
 * @param {RouteDocArgs} args
 */
function routeDocument({
  tag,
  method,
  path,
  summary,
  description,
  request,
  responses,
  security,
  parameters,
}) {
  if (!summary) throw new Error(`routeDocument: 'summary' is required for ${method.toUpperCase()} ${path}`);
  if (!responses || Object.keys(responses).length === 0) {
    throw new Error(`routeDocument: at least one response is required for ${method.toUpperCase()} ${path}`);
  }

  // Build OpenAPI-shaped `request` (library shape: { body, params, query, ... })
  // from a Zod schema + examples.
  const requestBody = request
    ? {
        body: {
          description: request.description,
          required: request.required !== false,
          content: {
            [request.contentType || "application/json"]: {
              schema: request.schema,
              ...(request.examples ? { examples: request.examples } : {}),
            },
          },
        },
      }
    : undefined;

  // Build OpenAPI-shaped responses from { status: { description, schema?, examples? } }.
  // Schema + examples must live in ONE media-type object; two sibling spreads would
  // overwrite each other on `content["application/json"]`.
  const openApiResponses = {};
  for (const [status, spec] of Object.entries(responses)) {
    const mediaType = {
      ...(spec.schema ? { schema: spec.schema } : {}),
      ...(spec.examples ? { examples: spec.examples } : {}),
    };
    openApiResponses[status] = {
      description: spec.description,
      ...(Object.keys(mediaType).length ? { content: { "application/json": mediaType } } : {}),
    };
  }

  // Map parameters: { "path:id": idSchema, "query:page": pageSchema }
  const openApiParameters = [];
  if (parameters) {
    for (const [key, schema] of Object.entries(parameters)) {
      const [location, name] = key.split(":");
      openApiParameters.push({
        name,
        in: location,
        required: location === "path",
        schema,
      });
    }
  }

  registry.registerPath({
    tags: [tag],
    method,
    path,
    summary,
    description,
    ...(requestBody ? { request: requestBody } : {}),
    ...(openApiParameters.length ? { parameters: openApiParameters } : {}),
    responses: openApiResponses,
    ...(security ? { security } : {}),
  });

  return registry;
}

module.exports = { routeDocument, registry };