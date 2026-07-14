#!/usr/bin/env node
/**
 * docs-build.js
 *
 * Builds the OpenAPI document from the Zod schemas into a static JSON
 * file at openapi.json. Useful for static hosting, CI diffing, or
 * feeding external tools.
 *
 * Run with:  npm run docs:build
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "openapi.json");

process.chdir(ROOT);

const doc = require(path.join(ROOT, "src/docs/openapi.js"));
fs.writeFileSync(OUT, JSON.stringify(doc, null, 2));
console.log(`✓ wrote ${OUT}`);
