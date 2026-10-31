// Builds SuvarnaKani.html: a standalone page with React, lucide-react and the
// compiled Tailwind CSS inlined. Only Google Fonts load from the network.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";

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
writeFileSync(join(tmp, "tailwind.config.cjs"), `module.exports = { presets: [require(${JSON.stringify(join(root, "tailwind.preset.cjs"))})], content: [${JSON.stringify(join(root, "SuvarnaKani.jsx"))}] };`);
execFileSync(join(root, "node_modules/.bin/tailwindcss"), ["-c", join(tmp, "tailwind.config.cjs"), "-i", join(tmp, "in.css"), "-o", join(tmp, "out.css"), "--minify"], { stdio: "inherit" });
const css = readFileSync(join(tmp, "out.css"), "utf8");

const gauntletFonts = "https://fonts.googleapis.com/css2?family=Prompt:wght@500&family=Mitr:wght@400&family=Chakra+Petch:wght@500&family=Sriracha&family=Itim&family=Noto+Sans+Lao+Looped:wght@400&display=swap";
const fonts = "https://fonts.googleapis.com/css2?family=Noto+Serif+Thai:wght@400;600&family=Noto+Serif+Lao:wght@400;600&family=Sarabun:wght@400;600&family=Kanit:wght@300;500&family=Noto+Sans+Thai:wght@400;600&family=Noto+Sans+Lao:wght@400;600&display=swap";
// Galaxy S25 Ultra and other Android phones: edge-to-edge under the status and
// gesture bars, keyboard resizes the page instead of covering the review input,
// and Samsung Internet's forced dark mode leaves the palette alone.
const head = (extra = "", fontTag = `<link rel="stylesheet" href="${fonts}" data-suvarnakani-fonts>`) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">
<title>SuvarṇaKani</title><meta name="theme-color" content="#0B0F19"><meta name="color-scheme" content="dark">
<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
${extra}${fontTag}
<style>${css} :root{color-scheme:dark} html{-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent} body{background:#0B0F19;color:#F1F5F9;margin:0;overscroll-behavior-y:none;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}</style></head>`;
const html = `${head()}
<body><div id="root"></div><script>${js}</script></body></html>`;
writeFileSync(join(root, "SuvarnaKani.html"), html);
console.log(`SuvarnaKani.html written (${(html.length / 1024).toFixed(0)} KB)`);

// dist/: the installable app (manifest, icons, offline service worker).
// Serve this folder over https and use "Add to Home screen".
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });
const version = Date.now().toString(36);

// Bundle the fonts into dist/fonts so the installed app (and the Android APK)
// renders Thai and Lao offline from the very first launch. If the build has no
// network, fall back to the Google Fonts link (cached by the service worker).
const fontFiles = [];
let fontTag;
try {
  const ua = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
  // The core faces in full; the Font Gauntlet faces only in their Thai and Lao subsets.
  const sheets = [[fonts, null], [gauntletFonts, /\/\* (thai|lao) \*\//]];
  let fontCss = "";
  for (const [href, keep] of sheets) {
    const res = await fetch(href, { headers: { "User-Agent": ua } });
    if (!res.ok) throw new Error(`fonts css ${res.status}`);
    let css = await res.text();
    if (keep) css = css.split(/(?=\/\* )/).filter((block) => keep.test(block)).join("");
    fontCss += css;
  }
  const urls = [...new Set(fontCss.match(/https:\/\/fonts\.gstatic\.com\/[^)\s]+/g) || [])];
  if (!urls.length) throw new Error("no font files in css");
  rmSync(join(dist, "fonts"), { recursive: true, force: true });
  mkdirSync(join(dist, "fonts"), { recursive: true });
  for (const [i, u] of urls.entries()) {
    const r = await fetch(u);
    if (!r.ok) throw new Error(`font ${r.status} ${u}`);
    const name = `fonts/f${i}${extname(new URL(u).pathname) || ".woff2"}`;
    writeFileSync(join(dist, name), Buffer.from(await r.arrayBuffer()));
    fontCss = fontCss.replaceAll(u, name);
    fontFiles.push(name);
  }
  fontTag = `<style data-suvarnakani-fonts data-suvarnakani-gauntlet>${fontCss}</style>`;
  console.log(`bundled ${fontFiles.length} font files into dist/fonts`);
} catch (err) {
  fontFiles.length = 0;
  rmSync(join(dist, "fonts"), { recursive: true, force: true });
  console.warn(`fonts not bundled (${err.message}); the app will load them from Google Fonts`);
}
["icon-192.png", "icon-512.png", "icon-maskable-512.png", "icon-monochrome-512.png"].forEach((f) => copyFileSync(join(root, "assets", f), join(dist, f)));
writeFileSync(join(dist, "manifest.webmanifest"), JSON.stringify({
  name: "SuvarṇaKani",
  short_name: "SuvarṇaKani",
  description: "Thai and Lao script, tones and spaced repetition.",
  start_url: "./",
  scope: "./",
  display: "standalone",
  orientation: "portrait",
  background_color: "#0B0F19",
  theme_color: "#0B0F19",
  icons: [
    { src: "icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    { src: "icon-monochrome-512.png", sizes: "512x512", type: "image/png", purpose: "monochrome" },
  ],
  // Long-press the home-screen icon.
  shortcuts: [
    { name: "Reviews", short_name: "Reviews", url: "./?go=reviews", icons: [{ src: "icon-192.png", sizes: "192x192" }] },
    { name: "Ear Dojo", short_name: "Ear", url: "./?go=ear", icons: [{ src: "icon-192.png", sizes: "192x192" }] },
    { name: "Decoder", short_name: "Decoder", url: "./?go=decoder", icons: [{ src: "icon-192.png", sizes: "192x192" }] },
  ],
  // Share text from Google Lens, LINE or Chrome straight into the Decoder.
  share_target: { action: "./", method: "GET", params: { title: "title", text: "text", url: "url" } },
}, null, 2));
writeFileSync(join(dist, "sw.js"), `// App shell and the bundled fonts are cached on install, so the app works
// offline from the first launch. Google Fonts (only used if the build could not
// bundle them) are cached as they load.
const SHELL = "suvarnakani-${version}";
const FONTS = "suvarnakani-fonts";
const FILES = ${JSON.stringify(["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "icon-monochrome-512.png", ...fontFiles])};
self.addEventListener("install", (e) => { e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== FONTS).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.open(FONTS).then(async (c) => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then((r) => { if (r.ok || r.type === "opaque") c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  } else if (url.origin === location.origin) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
  }
});
`);
const appHtml = `${head('<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">\n', fontTag)}
<body><div id="root"></div><script>${js}</script>
<script>if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js");
// Ask Android not to clear saved progress when the phone runs low on space.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});</script></body></html>`;
writeFileSync(join(dist, "index.html"), appHtml);
console.log("dist/ written (installable app)");
