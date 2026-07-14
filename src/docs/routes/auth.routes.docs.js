// This file documents the routes in src/routes/auth.routes.js.
// The Zod schemas themselves live next to the controller in
// src/controllers/auth.controller.js — that is the whole point of this
// pattern: validation, types, and OpenAPI are derived from the same source.

const { z } = require("zod");
const { extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");
const { routeDocument } = require("../routeDocument");
const { ErrorEnvelope } = require("../schemas");
const {
  registerSchema,
  registerResponseSchema,
} = require("../../controllers/auth.controller");

extendZodWithOpenApi(z);

const register = routeDocument({
  tag: "Auth",
  method: "post",
  path: "/api/auth/register",
  summary: "Register a customer account",
  description:
    "Creates a new user with the `customer` role. " +
    "Email must be unique (DB-level unique index). " +
    "Password is bcrypt-hashed before storage; the hash is never returned.",
  request: {
    schema: registerSchema,
    examples: {
      default: {
        summary: "Sample registration",
        value: {
          name: "Fahim Ahmed",
          email: "fahim@example.com",
          password: "secret123",
        },
      },
    },
  },
  responses: {
    201: {
      description: "User created",
      schema: registerResponseSchema,
      examples: {
        default: {
          summary: "Created user",
          value: {
            success: true,
            message: "User registered successfully",
            data: {
              user: {
                _id: "66a3e9b2f1c2a4b5c6d7e8f9",
                name: "Fahim Ahmed",
                email: "fahim@example.com",
                role: "customer",
                emailVerified: false,
                createdAt: "2026-07-14T07:46:08.271Z",
                updatedAt: "2026-07-14T07:46:08.271Z",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Validation failed (bad name, email, or short password)",
      schema: ErrorEnvelope,
    },
    409: {
      description: "Email already exists",
      schema: ErrorEnvelope,
    },
  },
});

module.exports = [register];