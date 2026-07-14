#!/usr/bin/env node
/**
 * docs-check.js
 *
 * Static parity check between `src/routes/**` and `src/docs/routes/**`.
 * Every router file should have a matching `*.routes.docs.js` and every
 * `(method, path)` pair declared on the router should appear in its doc
 * counterpart.
 *
 * Run with:  npm run docs:check
 *
 * Exit code 0 when parity is clean, 1 otherwise.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ROUTES_DIR = path.join(ROOT, "src/routes");
const DOCS_DIR = path.join(ROOT, "src/docs/routes");

const TEMPLATE_FILE = "_TEMPLATE.js";
const INDEX_FILE = "index.js";

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
]);
const METHOD_ALIASES = {
  del: "delete",
};

/** Join a mount prefix and a sub-path so we can compare full URLs. */
function joinPaths(prefix, sub) {
  const a = (prefix || "").replace(/\/+$/, "");
  const b = (sub || "").replace(/^\/+/, "");
  const joined = `${a}/${b}`.replace(/\/+$/, "");
  return joined || "/";
}

/* -------- 1. collect router files -------- */
function listRouterFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".routes.js") && f !== INDEX_FILE);
}

function findDocFileFor(routerFile) {
  const base = routerFile.replace(/\.routes\.js$/, "");
  const candidate = path.join(DOCS_DIR, `${base}.routes.docs.js`);
  return fs.existsSync(candidate) ? candidate : null;
}

/**
 * Returns a map of { baseName: mountPrefix } derived from `routes/index.js`.
 *   const authRoutes = require("./auth.routes");
 *   router.use("/api/auth", authRoutes);   // → { auth: "/api/auth" }
 */
function readMountPrefixes() {
  const indexPath = path.join(ROUTES_DIR, INDEX_FILE);
  if (!fs.existsSync(indexPath)) return {};
  const src = fs.readFileSync(indexPath, "utf8");
  // imports: const xxxRoutes = require("./xxx.routes");
  const importRe = /const\s+(\w+Routes)\s*=\s*require\s*\(\s*['"`]\.\/([^'"`]+)\.routes['"`]\s*\)/g;
  const imports = new Map();
  let m;
  while ((m = importRe.exec(src))) {
    imports.set(m[1], m[2]); // var → base name
  }
  // mounts: router.use("/api/...", xxxRoutes);
  const mountRe = /router\s*\.\s*use\s*\(\s*(['"`])([^'"`]+)\1\s*,\s*(\w+)\s*\)/g;
  const prefixes = {};
  while ((m = mountRe.exec(src))) {
    const varName = m[3];
    const prefix = m[2];
    const base = imports.get(varName);
    if (base) prefixes[base] = prefix;
  }
  return prefixes;
}

/* -------- 2. extract operations from a router -------- */
/**
 * Naive but sufficient: we look for patterns like
 *   router.post("/foo", ...)
 * If a real-world project adopts a layered structure (controllers, services),
 * swap this implementation for an AST walk with the same output shape.
 */
function extractOperationsFromRouter(routerPath) {
  const src = fs.readFileSync(routerPath, "utf8");
  const ops = [];
  const re = /router\s*\.\s*(get|post|put|patch|delete|del)\s*\(\s*(['"`])([^'"`]+)\2/g;
  let m;
  while ((m = re.exec(src))) {
    const method = METHOD_ALIASES[m[1]] || m[1];
    const routePath = m[3];
    if (!HTTP_METHODS.has(method)) continue;
    ops.push({ method: method.toUpperCase(), path: routePath });
  }
  return ops;
}

/* -------- 3. extract (method, path) pairs from doc files -------- */
/**
 * Scans for `routeDocument({ ... method: "post", path: "/api/auth/register" })`
 * blocks. Multiline-aware, scoped to `routeDocument(`.
 */
function extractOperationsFromDocs(docPath) {
  if (!docPath) return [];
  const src = fs.readFileSync(docPath, "utf8");
  const ops = [];
  const re =
    /routeDocument\s*\(\s*\{([\s\S]*?)\}\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const body = m[1];
    const methodMatch = body.match(/method\s*:\s*['"`]([a-z]+)['"`]/i);
    const pathMatch = body.match(/path\s*:\s*['"`]([^'"`]+)['"`]/i);
    if (methodMatch && pathMatch) {
      ops.push({
        method: methodMatch[1].toUpperCase(),
        path: pathMatch[1],
      });
    }
  }
  return ops;
}

/* -------- 4. compare -------- */
function compare(key) {
  return (a, b) => {
    if (a.method < b.method) return -1;
    if (a.method > b.method) return 1;
    return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
  };
}

function diff(label, expected, actual) {
  const norm = (arr) => arr.map((o) => `${o.method} ${o.path}`).sort();
  const want = norm(expected);
  const got = norm(actual);
  const missing = want.filter((x) => !got.includes(x));
  const extra = got.filter((x) => !want.includes(x));
  return { label, missing, extra };
}

/* -------- main -------- */
function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`✗ ${DOCS_DIR} does not exist.`);
    process.exit(1);
  }

  const routerFiles = listRouterFiles(ROUTES_DIR);
  if (routerFiles.length === 0) {
    console.log("No router files found — nothing to check.");
    return;
  }

  let totalMissing = 0;
  let totalExtra = 0;
  let totalOrphanDocs = 0;
  let totalMissingDocs = 0;

  console.log("Docs parity check");
  console.log("=================\n");

  const mountPrefixes = readMountPrefixes();
  for (const file of routerFiles) {
    const routerPath = path.join(ROUTES_DIR, file);
    const docPath = findDocFileFor(file);
    const label = file.replace(/\.routes\.js$/, "");
    const mountPrefix = mountPrefixes[label] || "";

    if (!docPath) {
      totalMissingDocs++;
      console.error(`✗ ${label}: no doc file at src/docs/routes/${label}.routes.docs.js`);
      continue;
    }

    const routerOps = extractOperationsFromRouter(routerPath).map((op) => ({
      method: op.method,
      path: joinPaths(mountPrefix, op.path),
    })).sort(compare());
    const docOps = extractOperationsFromDocs(docPath).sort(compare());
    const { missing, extra } = diff(label, routerOps, docOps);

    if (missing.length === 0 && extra.length === 0) {
      console.log(`✓ ${label}: ${routerOps.length} operation(s) in parity`);
    } else {
      if (missing.length) {
        totalMissing += missing.length;
        console.error(`✗ ${label}: missing doc(s): ${missing.join(", ")}`);
      }
      if (extra.length) {
        totalExtra += extra.length;
        console.error(`✗ ${label}: doc(s) without route: ${extra.join(", ")}`);
      }
    }
  }

  // Orphan doc files (a *.routes.docs.js with no matching router)
  const docFiles = fs.readdirSync(DOCS_DIR).filter(
    (f) => f.endsWith(".routes.docs.js") && f !== TEMPLATE_FILE
  );
  for (const doc of docFiles) {
    const base = doc.replace(/\.routes\.docs\.js$/, "");
    const expected = path.join(ROUTES_DIR, `${base}.routes.js`);
    if (!fs.existsSync(expected)) {
      totalOrphanDocs++;
      console.error(`✗ Orphan doc: src/docs/routes/${doc} (no matching router)`);
    }
  }

  console.log("");
  if (totalMissingDocs || totalOrphanDocs || totalMissing || totalExtra) {
    console.error(
      `FAIL: missing-docs=${totalMissingDocs}, missing-doc-entries=${totalMissing}, ` +
        `orphan-docs=${totalOrphanDocs}, extra-doc-entries=${totalExtra}`
    );
    process.exit(1);
  }
  console.log("PASS: every router operation is documented.");
}

main();
