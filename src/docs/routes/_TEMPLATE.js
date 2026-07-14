// ────────────────────────────────────────────────────────────────────────────
// TEMPLATE: copy this file into src/docs/routes/<feature>.routes.docs.js
// and uncomment the example block. Replace the placeholders, then add the
// module to src/docs/openapi.js's require list.
// ────────────────────────────────────────────────────────────────────────────
//
//   const { routeDocument } = require("../routeDocument");
//   const {
//     SuccessEnvelope,
//     ErrorEnvelope,
//     ObjectIdParam,
//     PaginationQuery,
//     bearerAuth,
//   } = require("../schemas");
//
//   const listThings = routeDocument({
//     tag: "Things",                         // group in Swagger UI
//     method: "get",
//     path: "/api/things",
//     summary: "List all things",
//     description: "Returns a paginated list of things.",
//     parameters: {
//       // "location:name": <Zod schema>
//       "query:page": PaginationQuery.shape.page,
//       "query:limit": PaginationQuery.shape.limit,
//     },
//     security: [{ bearerAuth: [] }],
//     responses: {
//       200: {
//         description: "List returned",
//         schema: SuccessEnvelope(
//           z.object({ items: z.array(Thing), page: z.number(), limit: z.number() }),
//           "ListThingsResponse"
//         ),
//       },
//       401: { description: "Missing or invalid token", schema: ErrorEnvelope },
//     },
//   });
//
//   module.exports = [listThings];
//
// ────────────────────────────────────────────────────────────────────────────
// CHECKLIST for new endpoints (paste into your PR description):
//   [ ] Zod schema defined in controllers/<x>.controller.js
//       with .openapi("Name", { description, example })
//   [ ] Response schema defined and registered in src/docs/schemas/
//       (or inline above using SuccessEnvelope / ErrorEnvelope)
//   [ ] routeDocument() block added to src/docs/routes/<x>.routes.docs.js
//   [ ] src/docs/openapi.js updated to require the new doc module
//   [ ] npm run docs:check  →  exits 0
//   [ ] npm run docs:lint   →  exits 0
//   [ ] /api-docs shows the new endpoint with example body
//   [ ] Live request still returns the expected status codes
// ────────────────────────────────────────────────────────────────────────────

// Delete everything below this line once you've copied what you need.
// This is here so the file is technically a valid CommonJS module even when
// unused — the linter / CI won't trip on it.
module.exports = [];