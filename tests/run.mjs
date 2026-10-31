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

// 7. Thai reading engine: syllable splits, romanisation and tones from spelling alone.
const READS = {
  "กิน": "kin:mid", "บ้าน": "bâan:falling", "ช้าง": "cháang:high", "สวัสดี": "sà:low wàt:low dii:mid", "ขอบคุณ": "khɔ̀ɔp:low khun:mid",
  "รัก": "rák:high", "รถ": "rót:high", "ประเทศ": "prà:low thêet:falling", "เด็ก": "dèk:low", "กลับ": "klàp:low", "ขวา": "khwǎa:rising",
  "ความ": "khwaam:mid", "ทราย": "saai:mid", "สร้าง": "sâang:falling", "จริง": "jing:mid", "อยาก": "yàak:low", "อยู่": "yùu:low",
  "ตลาด": "tà:low làat:low", "สนาม": "sà:low nǎam:rising", "ขนม": "khà:low nǒm:rising", "ห้องน้ำ": "hɔ̂ɔng:falling náam:high",
  "เปิด": "pə̀ət:low", "ครับ": "khráp:high", "ค่ะ": "khâ:falling", "ไหม": "mǎi:rising", "หนังสือ": "nǎng:rising sʉ̌ʉ:rising",
  "ข้าวผัดกุ้ง": "khâaw:falling phàt:low kûng:falling", "เรียน": "rian:mid", "เมือง": "mʉang:mid", "ไทย": "thai:mid", "เขา": "khǎo:rising",
  "ภาษา": "phaa:mid sǎa:rising", "จันทร์": "jan:mid", "สมุด": "sà:low mùt:low", "ผู้หญิง": "phûu:falling yǐng:rising", "สบาย": "sà:low baai:mid",
  "ขอโทษ": "khɔ̌ɔ:rising thôot:falling", "ผลไม้": "phǒn:rising mái:high", "ก็": "kɔ̂:falling", "เก้า": "kâao:falling",
};
for (const [w, want] of Object.entries(READS)) eq(T.readThai(w).map((x) => `${x.roman}:${x.tone}`).join(" "), want, `read ${w}`);
const seg = T.segmentThai("ฉันอยากกินข้าวผัดกุ้ง");
check(seg.map((w) => w.text).join("") === "ฉันอยากกินข้าวผัดกุ้ง", "segmentation keeps every letter");
check(seg.find((w) => w.text === "กิน")?.known, "กิน is recognised as a course word");
eq(T.romanize("khâaw-phàt", "rtgs"), "khao-phat", "RTGS drops tones and length");
eq(T.romanize("khɔ̀ɔp-khun", "rtgs"), "khop-khun", "RTGS ɔ → o");
eq(T.romanize("jai", "rtgs"), "chai", "RTGS j → ch");
eq(T.romanize("náam", "ipa"), "naːm˦˥", "IPA with Chao letters");

// 8. Slicer sentences: every Thai word's tones agree with the reading engine where it is sure.
for (const sen of T.SENTENCES.filter((x) => x.script === "th")) {
  for (const w of sen.words) {
    const rd = T.readThai(w.w);
    if (rd.some((x) => x.guess || x.raw) || rd.length !== w.tone.length) continue;
    eq(rd.map((x) => x.tone), w.tone, `slicer ${sen.id} ${w.w}`);
  }
}
const senIds = new Set(T.SENTENCES.map((x) => x.id));
check(senIds.size >= 15 && T.SENTENCES.length >= 30, `30 slicer lines (got ${T.SENTENCES.length})`);

// 9. Word Garden: unique ids, no clash with the course, tones from the reading agree with the engine.
const GARDEN_KNOWN = new Set(["มีความสุข", "ภูมิใจ"]); // read by segmentation, or against the spelling
check(T.GARDEN_BEDS.length === 7, "seven garden beds");
check(T.GARDEN_ITEMS.length >= 250, `at least 250 garden words (got ${T.GARDEN_ITEMS.length})`);
const allIds = [...T.CURRICULUM, ...T.LAO_ONLY_ITEMS, ...T.GARDEN_ITEMS].map((i) => i.id);
eq(allIds.length, new Set(allIds).size, "item ids are unique");
const courseTh = new Set(T.CURRICULUM.map((i) => i.th));
for (const it of T.GARDEN_ITEMS) {
  check(!courseTh.has(it.th), `garden ${it.th} is not already a course item`);
  check(it.tone.length === it.thRoman.split("-").length && it.loRoman && it.ttsLo && it.example?.th, `garden ${it.id} has tones, Lao reading and an example`);
  check(/^[ก-๛]+$/.test(it.ttsLo), `garden ${it.id} ttsLo is Thai script: ${it.ttsLo}`);
  if (GARDEN_KNOWN.has(it.th)) continue;
  const rd = T.readThai(it.th);
  if (rd.some((x) => x.guess || x.raw) || rd.length !== it.tone.length) continue;
  eq(rd.map((x) => x.tone), it.tone, `garden ${it.th} (${it.thRoman})`);
}
check(T.courseItems("lo").some((i) => i.garden) && T.courseItems("th").some((i) => i.garden), "garden words are in both courses");
eq(T.laoToThai("ເຂົ້າໜຽວ"), "เข้าเหนียว", "Lao → Thai letters: ◌ົາ and ◌ຽ");
eq(T.laoToThai("ເຜັດ"), "เผ็ด", "Lao → Thai letters: ເ◌ັ");
eq(T.laoToThai("ມື້ນີ້"), "มื้อนี้", "Lao → Thai letters: open ◌ື");
eq(T.laoToThai("ບໍ່"), "บ่อ", "Lao → Thai letters: ◌ໍ");
eq(T.laoToThai("ເບຍ"), "เบีย", "Lao → Thai letters: open ເ◌ຍ");

// 10. Forgiving romanisation (D5) and numbers.
const naam = T.CURRICULUM.find((i) => i.id === "v-naam");
check(T.isCorrect(naam, "nam") && T.isCorrect(naam, "náam"), "náam accepts nam");
const khaaw = T.CURRICULUM.find((i) => i.id === "v-khaaw");
check(T.isCorrect(khaaw, "kao") && T.isCorrect(khaaw, "khao"), "khâaw accepts kao and khao");
check(!T.isCorrect(khaaw, "kin"), "khâaw does not accept kin");
eq(T.numberWords(21), "ยี่สิบเอ็ด", "21");
eq(T.numberWords(11), "สิบเอ็ด", "11");
eq(T.numberWords(1500), "หนึ่งพันห้าร้อย", "1,500");
eq(T.numberWords(10000, "lo"), "ສິບພັນ", "Lao 10,000");
eq(T.numberWords(20, "lo"), "ຊາວ", "Lao 20");
eq(T.clockPhrase(14, 30).text, "บ่ายสองโมงครึ่ง", "14:30");
eq(T.clockPhrase(19, 0).text, "หนึ่งทุ่ม", "19:00");
eq(T.clockPhrase(2, 0).text, "ตีสอง", "02:00");
eq(T.clockPhrase(17, 0).text, "ห้าโมงเย็น", "17:00");
eq(T.interleave([1, 2, 3, 4], ["a", "b", "c"], 3, 2), [1, 2, 3, "a", "b", 4, "c"], "lesson interleave");
const cards = T.sentenceCards({ mode: "th", saved: [{ th: "ซอย", meaning: "lane", script: "th" }, { th: "ถนน", script: "th" }] });
check(cards.some((c) => c.id === "dw-ซอย") && !cards.some((c) => c.id === "dw-ถนน"), "saved words become sentence cards only with a meaning");

// 11. Signs, the daily menu, Ride the line and the Lantern Library: every word has a reading and a meaning,
// and readings written by hand agree with the engine's tones where it is sure.
const handTone = (tk, where) => {
  if (!tk.tone || tk.num) return;
  const rd = T.readThai(tk.t);
  if (rd.some((x) => x.guess || x.raw) || rd.length !== tk.tone.length) return;
  eq(rd.map((x) => x.tone), tk.tone, `${where} ${tk.t} (${tk.r})`);
};
const signPacks = T.SIGN_PACKS();
check(signPacks.length >= 15, `at least 15 new signs (got ${signPacks.length})`);
for (const p of [...signPacks, T.dailyMenu(1), T.dailyMenu(99)]) {
  p.lines.forEach((l, k) => l.forEach((tk) => {
    check(!!tk.id || (tk.r && tk.m), `sign ${p.id} line ${k}: ${tk.t} has a reading and meaning`);
    if (p.script === "th" && !tk.id) handTone(tk, `sign ${p.id}`);
  }));
  if (!p.id.startsWith("menu")) check(p.glosses.every(Boolean), `sign ${p.id} has a gloss on every line`);
}
for (const sc of ["th", "lo"]) {
  const run = T.rideRun(sc);
  check(run.length >= 4 && run.every((s) => s.opts.length === 4 && s.opts.includes(s.answer)), `ride ${sc}: stops with four options`);
}
check(T.LIBRARY.length === 12 && T.LIBRARY.every((s) => s.raw.length >= 6 && s.raw.length <= 10), "twelve stories of six to ten sentences");
for (const s of T.LIBRARY) for (const sc of ["th", "lo"]) T.storyText(s, sc).forEach((se, i) => se.tokens.forEach((tk) => {
  check(tk.r && tk.m, `story ${s.id} ${sc} ${i}: ${tk.t} has a reading and meaning`);
  if (sc === "th" && !tk.item) handTone(tk, `story ${s.id}`);
}));
const mined = T.sentenceCards({ mode: "th", mined: ["morning:0:th", "morning:1:lo"] });
check(mined.some((c) => c.id === "lib-morning:0:th") && !mined.some((c) => c.id === "lib-morning:1:lo"), "library sentences join the Thai deck by script");

// 12. Wave E: Sound Dojo sets keep one tone; Talk Path lines read the way the engine reads them.
for (const s of T.SOUND_SETS) {
  const tones = s.words.map((w) => T.readThai(w.th).map((x) => x.tone).join(","));
  check(new Set(tones).size === 1, `sound set ${s.id} keeps one tone (${tones.join(" | ")})`);
  for (const w of s.words) eq(T.readThai(w.th).map((x) => x.tone).join(","), T.talkLine([w.th, w.r, w.m]).tones.join(","), `sound ${w.th} reading ${w.r}`);
}
for (const p of T.TALK_PATHS.filter((x) => x.script === "th")) {
  for (const [id, n] of Object.entries(p.nodes)) {
    for (const o of n.opts) {
      const line = T.talkLine(o);
      const rd = T.segmentThai(o[0]).flatMap((w) => w.syllables || []).filter((x) => !x.raw);
      check(rd.length === line.syl.length, `talk ${p.id} ${id} "${o[0]}": ${line.syl.length} syllables in the reading, ${rd.length} in the spelling`);
      if (rd.length === line.syl.length) rd.forEach((x, k) => { if (!x.guess) check(x.tone === line.tones[k], `talk ${p.id} ${o[0]} syllable ${k + 1}: engine ${x.tone}, reading ${line.tones[k]}`); });
      if (o[5]) check(!!p.nodes[o[5]], `talk ${p.id} ${id} leads to an existing node`);
    }
  }
}
check(T.phraseTrials().length >= 40, `tones-in-phrases has at least 40 trials (got ${T.phraseTrials().length})`);
eq(T.climbLadder({ ladder: 1 }, 18, 20), 2, "ladder climbs at 90%");
eq(T.climbLadder({ ladder: 1 }, 10, 20), 0, "ladder drops at 50%");
eq(T.climbLadder({ ladder: 5 }, 20, 20), 5, "ladder tops out");
check(T.voiceBankLists("th").every((l) => l.items.length && l.items.every((x) => x.key.startsWith(x.script + ":"))), "voice bank lists have keys");

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
