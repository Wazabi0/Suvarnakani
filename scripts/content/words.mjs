// Prints every Thai word the app teaches (course + Word Garden + sentence words) as JSON,
// for frequency.py. Run from the repo root: node scripts/content/words.mjs > /tmp/words.json
import { build } from "esbuild";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("../..", import.meta.url).pathname;
const out = join(mkdtempSync(join(tmpdir(), "sk-words-")), "app.mjs");
await build({
  entryPoints: [join(root, "SuvarnaKani.jsx")], bundle: true, format: "esm", platform: "node", jsx: "automatic",
  outfile: out, nodePaths: [join(root, "node_modules")], logLevel: "error",
  define: { "process.env.NODE_ENV": '"production"' },
});
const T = (await import(pathToFileURL(out).href)).__test;
const words = T.courseItems("th").filter((i) => i.tier !== "glyph").map((i) => i.th).filter(Boolean);
console.log(JSON.stringify({ words: [...new Set(words)] }));
