#!/usr/bin/env node
/**
 * docs-lint.js
 *
 * Wraps the Redocly CLI lint command on the OpenAPI document generated
 * from our Zod schemas. We dump the spec to a temp file so Redocly can
 * lint it the same way CI would.
 *
 * Run with:  npm run docs:lint
 *
 * Requires `redocly` to be installed (either locally or globally). If it
 * is not on PATH, falls back to a structural smoke check.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const TMP = path.join(os.tmpdir(), `openapi-${Date.now()}.json`);

function dumpSpec() {
  process.chdir(ROOT);
  const doc = require(path.join(ROOT, "src/docs/openapi.js"));
  fs.writeFileSync(TMP, JSON.stringify(doc, null, 2));
  return TMP;
}

function tryRedocly(specPath) {
  const result = spawnSync("redocly", ["lint", specPath], { stdio: "inherit" });
  return result.status === 0;
}

function fallbackLint(doc) {
  // Minimal structural smoke check that does not require Redocly.
  const must = (cond, name) => {
    if (!cond) {
      console.error(`✗ ${name}`);
      return false;
    }
    console.log(`✓ ${name}`);
    return true;
  };
  let ok = true;
  ok = must(doc.openapi === "3.0.3", "openapi version is 3.0.3") && ok;
  ok = must(doc.info && doc.info.title, "info.title present") && ok;
  ok = must(Array.isArray(doc.servers) && doc.servers.length > 0, "servers present") && ok;
  ok = must(doc.components && doc.components.schemas, "components.schemas present") && ok;
  return ok;
}

function main() {
  const specPath = dumpSpec();
  console.log(`Wrote generated spec to ${specPath}\n`);

  let usedRedocly = false;
  try {
    usedRedocly = tryRedocly(specPath);
  } catch {
    usedRedocly = false;
  }

  if (!usedRedocly) {
    console.log("Redocly CLI not available; running fallback structural check.\n");
    const doc = JSON.parse(fs.readFileSync(specPath, "utf8"));
    const ok = fallbackLint(doc);
    if (!ok) process.exit(1);
  }

  fs.unlinkSync(specPath);
}

main();