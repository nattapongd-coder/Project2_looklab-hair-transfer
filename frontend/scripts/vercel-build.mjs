/**
 * Vercel build (Build Output API v3) – run by Vercel via vercel.json "buildCommand".
 *
 *   .vercel/output/static/              <- the Vite frontend (dist/)
 *   .vercel/output/functions/api.func/  <- server.ts bundled into ONE JavaScript file (no TypeScript
 *                                          compilation by Vercel, no missing imports at runtime)
 *   .vercel/output/config.json          <- routes: /api/* -> the function, everything else -> static files
 *
 * RunPod settings are read at runtime from Vercel → Settings → Environment Variables:
 *   HAIRFASTGAN_API_URL, RUNPOD_API_KEY, HAIRFASTGAN_API_TOKEN
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const out = path.join(root, ".vercel", "output");
const fnDir = path.join(out, "functions", "api.func");
const MAX_DURATION = Number(process.env.VERCEL_MAX_DURATION) || 300; // seconds (Hobby + Fluid compute: up to 300)

const step = (msg) => console.log(`\n▶ ${msg}`);

step("Clean .vercel/output");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(fnDir, { recursive: true });

step("Build frontend (vite build)");
execSync("npx vite build", { stdio: "inherit" });

step("Copy dist/ -> .vercel/output/static");
fs.cpSync(path.join(root, "dist"), path.join(out, "static"), { recursive: true });

step("Bundle server.ts -> api.func/index.cjs");
await build({
  // module.exports = the Express app itself (a plain (req, res) handler for the Node.js runtime)
  stdin: {
    contents: 'const mod = require("./server.ts"); module.exports = mod.default || mod;',
    resolveDir: root,
    sourcefile: "vercel-entry.cjs",
    loader: "js",
  },
  outfile: path.join(fnDir, "index.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["vite"], // only used by `npm run dev`, never loaded on Vercel
  logLevel: "warning",
});

fs.writeFileSync(
  path.join(fnDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.cjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      maxDuration: MAX_DURATION,
    },
    null,
    2
  )
);
fs.writeFileSync(path.join(fnDir, "package.json"), JSON.stringify({ type: "commonjs" }));

step("Write routing config");
fs.writeFileSync(
  path.join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "^/api(?:/(.*))?$", dest: "/api?__path=$1" },
        { handle: "filesystem" },
        { src: "^/(.*)$", dest: "/index.html" },
      ],
    },
    null,
    2
  )
);

const kb = (f) => Math.round(fs.statSync(f).size / 1024);
console.log(`\n✓ Vercel output ready: static/ + functions/api.func (${kb(path.join(fnDir, "index.cjs"))} KB), maxDuration ${MAX_DURATION}s`);
