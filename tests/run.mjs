// Tone and course checks. Run with `npm test`; the Pages workflow runs it before
// every deploy, so a change that breaks a tone never reaches the phone.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "sk-test-"));
const out = join(tmp, "app.mjs");
await build({
  entryPoints: [join(root, "SuvarnaKani.jsx")], bundle: true, format: "esm", platform: "node", jsx: "automatic",
  outfile: out, nodePaths: [join(root, "node_modules")], logLevel: "error",
  define: { "process.env.NODE_ENV": '"production"' },
});
const T = (await import(pathToFileURL(out).href)).__test;

let failed = 0, passed = 0;
const check = (ok, msg) => { if (ok) passed += 1; else { failed += 1; console.error("✗ " + msg); } };
const eq = (a, b, msg) => check(JSON.stringify(a) === JSON.stringify(b), `${msg}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

// 1. Every single-syllable Thai item with tone parts matches the engine.
let toned = 0;
for (const it of T.CURRICULUM) {
  if (!it.parts) continue;
  toned += 1;
  const got = T.computeTone(it.parts).tone;
  check(it.tone?.[0] === got || (it.tone?.length > 1 && it.tone.includes(got)), `${it.id} ${it.th}: engine says ${got}, item says ${it.tone}`);
}
check(toned >= 40, `expected at least 40 items with tone parts, found ${toned}`);

// 2. The tone rule table (Bangkok).
const R = (cls, live, long, mark, hn) => T.computeTone({ cls, live, long, mark, hn }).tone;
eq(R("mid", true, true, "none"), "mid", "mid live");
eq(R("high", true, true, "none"), "rising", "high live");
eq(R("low", true, true, "none"), "mid", "low live");
eq(R("mid", false, false, "none"), "low", "mid dead");
eq(R("high", false, true, "none"), "low", "high dead");
eq(R("low", false, false, "none"), "high", "low dead short");
eq(R("low", false, true, "none"), "falling", "low dead long");
eq(R("mid", true, true, "ek"), "low", "mid ek");
eq(R("low", true, true, "ek"), "falling", "low ek");
eq(R("mid", true, true, "tho"), "falling", "mid tho");
eq(R("low", true, true, "tho"), "high", "low tho");
eq(R("mid", true, true, "tri"), "high", "mid tri");
eq(R("mid", true, true, "jat"), "rising", "mid jattawa");
eq(R("low", true, true, "none", true), "rising", "ห นำ promotes low to high");

// 3. Lao syllables and Vientiane tones.
eq(T.laoSyllables("ສະບາຍດີ"), ["ສະ", "ບາຍ", "ດີ"], "split ສະບາຍດີ");
eq(T.laoSyllables("ຕະຫຼາດ"), ["ຕະ", "ຫຼາດ"], "split ຕະຫຼາດ");
const lt = (w) => T.laoSyllables(w).map((s) => T.laoSyllable(s)?.tone);
eq(lt("ມາ"), ["lo_high"], "ມາ low live");
eq(lt("ໝາ"), ["lo_rising"], "ໝາ high live");
eq(lt("ປາ"), ["lo_rising"], "ປາ mid live");
eq(lt("ມ້າ"), ["lo_highfall"], "ມ້າ low + tho");
eq(lt("ຂ້າ"), ["lo_lowfall"], "ຂ້າ high + tho");
eq(lt("ປ່າ"), ["lo_mid"], "ປ່າ ek");
const lao = T.courseItems("lo");
const untoned = lao.filter((it) => it.tier !== "glyph" && !(it.tone?.length));
check(untoned.length <= 3, `Lao words without tones: ${untoned.map((i) => i.lo).join(" ")}`);
check(lao.every((it) => it.tier !== "glyph" || !it.tone.length), "Lao glyphs carry no tone");
for (const it of lao) for (const t of it.tone || []) check(!!T.TONES[t]?.lao, `${it.id} has non-Lao tone ${t}`);

// 4. Course integrity.
const ids = T.CURRICULUM.map((i) => i.id);
check(new Set(ids).size === ids.length, "item ids are unique");
for (const it of T.CURRICULUM) check(it.accept?.length && it.meaning && it.level >= 1, `${it.id} has accept, meaning and level`);

// 5. Scheduling sanity: a correct answer pushes the next review out.
const s1 = T.scheduleItem({}, { read: 3 }, 0);
const s2 = T.scheduleItem(s1, { read: 3 }, s1.next);
check(s2.next - s1.next > s1.next, "second success waits longer than the first");

// 6. Particles and backups.
eq(T.politeLine({ th: "ไม่ครับ เท่าไรครับ", r: "mâi khráp, thâo-rai khráp", syl: ["mâi", "khráp", "thâo", "rai", "khráp"], tones: ["falling", "high", "falling", "mid", "high"] }, "female"),
  { th: "ไม่ค่ะ เท่าไรคะ", r: "mâi khâ, thâo-rai khá", syl: ["mâi", "khâ", "thâo", "rai", "khá"], tones: ["falling", "falling", "falling", "mid", "high"] }, "female particles");
eq(T.politeLine({ th: "ขอบคุณครับ" }, "unset").th, "ขอบคุณครับ/ค่ะ", "unset shows both");
const b = T.makeBackup({ srs: { a: { stage: 2 } } });
eq(T.readBackup(JSON.stringify(b)).state, { srs: { a: { stage: 2 } } }, "backup round trip");
let threw = false; try { T.readBackup("{\"x\":1}"); } catch { threw = true; }
check(threw, "a non-backup file is refused");
check(T.verCmp("0.20.0", "0.9.0") > 0, "version compare is numeric");

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
