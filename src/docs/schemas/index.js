// Theory:
// Reusable component schemas live here so route docs can import them by name.
// `extendZodWithOpenApi(z)` is called once below — this is required by
// @asteasolutions/zod-to-openapi to attach the `.openapi()` method to Zod.

const { z } = require("zod");
const { extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");

extendZodWithOpenApi(z);

// --- Domain: User ---------------------------------------------------------

const UserRole = z
  .enum(["customer", "admin", "vendor"])
  .openapi("UserRole", {
    description: "Role assigned to the user account.",
    example: "customer",
  });

const User = z
  .object({
    _id: z.string().openapi({ example: "66a3e9b2f1c2a4b5c6d7e8f9" }),
    name: z.string().min(2).openapi({ example: "Fahim Ahmed" }),
    email: z.email().openapi({ example: "fahim@example.com" }),
    role: UserRole,
    emailVerified: z.boolean().openapi({ example: false }),
    createdAt: z.string().datetime().openapi({ example: "2026-07-14T07:46:08.271Z" }),
    updatedAt: z.string().datetime().openapi({ example: "2026-07-14T07:46:08.271Z" }),
  })
  .openapi("User", {
    description: "Public user object. Never includes the password hash.",
  });

// --- Envelopes ------------------------------------------------------------

const SuccessEnvelope = (dataSchema, name) =>
  z
    .object({
      success: z.literal(true),
      message: z.string(),
      data: dataSchema,
    })
    .openapi(name, {
      description: "Standard success envelope used by every successful response.",
    });

const ErrorEnvelope = z
  .object({
    success: z.literal(false),
    message: z.string(),
    errors: z
      .array(
        z.object({
          path: z.array(z.union([z.string(), z.number()])),
          message: z.string(),
        })
      )
      .optional(),
  })
  .openapi("ErrorResponse", {
    description: "Standard error envelope returned by the central error middleware.",
  });

// --- Path parameters ------------------------------------------------------

const ObjectIdParam = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, "Invalid ObjectId")
  .openapi("ObjectIdParam", {
    description: "MongoDB ObjectId of the resource.",
    example: "66a3e9b2f1c2a4b5c6d7e8f9",
  });

// --- Query ----------------------------------------------------------------

const PaginationQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
    limit: z.coerce.number().int().min(1).max(100).default(20).openapi({ example: 20 }),
  })
  .openapi("PaginationQuery", {
    description: "Standard offset pagination query.",
  });

// --- Security scheme ------------------------------------------------------

const bearerAuth = {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "JWT issued by POST /api/auth/login (coming soon).",
};

module.exports = {
  // domain
  User,
  UserRole,
  // envelopes
  SuccessEnvelope,
  ErrorEnvelope,
  // params / query
  ObjectIdParam,
  PaginationQuery,
  // security
  bearerAuth,
};