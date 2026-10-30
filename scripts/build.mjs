// Builds SuvarnaKani.html: a standalone page with React, lucide-react and the
// compiled Tailwind CSS inlined. Only Google Fonts load from the network.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "suvarnakani-"));

writeFileSync(join(tmp, "entry.jsx"), `
import React from "react";
import { createRoot } from "react-dom/client";
import App from ${JSON.stringify(join(root, "SuvarnaKani.jsx"))};
createRoot(document.getElementById("root")).render(<App />);
`);

const result = await build({
  entryPoints: [join(tmp, "entry.jsx")],
  bundle: true,
  minify: true,
  format: "iife",
  jsx: "automatic",
  write: false,
  nodePaths: [join(root, "node_modules")],
  define: { "process.env.NODE_ENV": '"production"' },
});
const js = result.outputFiles[0].text.replaceAll("</script", "<\\/script");

writeFileSync(join(tmp, "in.css"), "@tailwind base; @tailwind components; @tailwind utilities;");
writeFileSync(join(tmp, "tailwind.config.cjs"), `module.exports = { content: [${JSON.stringify(join(root, "SuvarnaKani.jsx"))}] };`);
execFileSync(join(root, "node_modules/.bin/tailwindcss"), ["-c", join(tmp, "tailwind.config.cjs"), "-i", join(tmp, "in.css"), "-o", join(tmp, "out.css"), "--minify"], { stdio: "inherit" });
const css = readFileSync(join(tmp, "out.css"), "utf8");

const fonts = "https://fonts.googleapis.com/css2?family=Noto+Serif+Thai:wght@400;600&family=Noto+Serif+Lao:wght@400;600&family=Sarabun:wght@400;600&family=Kanit:wght@300;500&family=Noto+Sans+Thai:wght@400;600&family=Noto+Sans+Lao:wght@400;600&display=swap";
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>SuvarṇaKani</title><meta name="theme-color" content="#0B0F19">
<link rel="stylesheet" href="${fonts}">
<style>${css} :root{color-scheme:dark} body{background:#0B0F19;color:#F1F5F9;margin:0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}</style></head>
<body><div id="root"></div><script>${js}</script></body></html>`;
writeFileSync(join(root, "SuvarnaKani.html"), html);
console.log(`SuvarnaKani.html written (${(html.length / 1024).toFixed(0)} KB)`);
