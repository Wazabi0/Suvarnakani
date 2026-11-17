// Lists every Thai text the app speaks, so the voice pipeline knows what to cut.
// Writes voices/targets.json: { words: [{ text, level }], sentences: [text] }.
// Keys match the app's nativeKey(): Thai letters only, no spaces.
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("../..", import.meta.url).pathname;
const out = join(mkdtempSync(join(tmpdir(), "sk-voices-")), "app.mjs");
await build({
  entryPoints: [join(root, "SuvarnaKani.jsx")], bundle: true, format: "esm", platform: "node", jsx: "automatic",
  outfile: out, nodePaths: [join(root, "node_modules")], logLevel: "error", define: { "process.env.NODE_ENV": '"production"' },
});
const T = (await import(pathToFileURL(out).href)).__test;
const key = (s) => T.nativeKey(s);

const words = new Map();
const addWord = (text, level) => { const k = key(text); if (k && (!words.has(k) || words.get(k).level > level)) words.set(k, { text: k, level }); };
T.courseItems("th").forEach((i) => addWord(i.ttsTh || i.th, i.level || 99));
T.GARDEN_ITEMS.forEach((i) => addWord(i.ttsTh || i.th, 99));

const sentences = new Set();
const course = T.courseItems("th");
T.sentenceCards({ mode: "th", course, stageOf: () => 5 }).forEach((c) => sentences.add(key(c.tts)));
T.LIBRARY.forEach((story) => T.storyText(story, "th").forEach((s) => sentences.add(key(s.tokens.map((tk) => tk.tts || tk.t).join("")))));
sentences.delete("");

mkdirSync(join(root, "voices"), { recursive: true });
const file = join(root, "voices", "targets.json");
writeFileSync(file, JSON.stringify({ words: [...words.values()].sort((a, b) => a.level - b.level), sentences: [...sentences] }, null, 1));
console.log(`${words.size} words and ${sentences.size} sentences → ${file}`);
