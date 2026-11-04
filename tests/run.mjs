// Tone and course checks. Run with `npm test`; the Pages workflow runs it before
// every deploy, so a change that breaks a tone never reaches the phone.
import { build } from "esbuild";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
eq(T.loadPrefs(undefined).particle, "male", "ครับ is the default particle");
eq(T.loadPrefs({ particle: "unset" }).particle, "male", "old unpicked saves move to ครับ");
eq(T.loadPrefs({ particle: "unset", particleSet: true }).particle, "unset", "a chosen Show both is kept");
eq(T.loadPrefs({ particle: "female" }).particle, "female", "a chosen female particle is kept");
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
check(senIds.size >= 150 && T.SENTENCES.length >= 300, `150 lines per script (got ${T.SENTENCES.length})`);
eq(T.SENTENCE_GAPS, [], "every garden line is made of course or garden words");
{
  const course = T.courseItems("th");
  const line = T.SENTENCES.find((s) => s.id === "gl1" && s.script === "th");
  const ids = line.words.map((w) => course.find((i) => i.th === w.w && i.tier !== "glyph").id);
  const fresh = (stage) => T.sentenceSession(T.sentenceCards({ mode: "th", course, stageOf: () => stage }), {}, Date.now(), false).fresh;
  const lineCard = (stages) => T.sentenceCards({ mode: "th", course, stageOf: (id) => stages[id] || 0 }).find((c) => c.id === "sen-gl1-th");
  check(!lineCard({}).ready && !fresh(0).some((c) => c.id.startsWith("sen-gl")), "a garden line waits until its words are known");
  check(lineCard(Object.fromEntries(ids.map((id) => [id, 2]))).ready, "a garden line is ready once every word is at Novice Monk");
}
check(T.SENTENCES.filter((s) => s.script === "lo").every((s) => s.words.every((w) => w.w && w.r && /^[ก-๛]+$/.test(w.tts))), "Lao lines have Lao words, readings and Thai-script voice text");

// 9. Word Garden: unique ids, no clash with the course, tones from the reading agree with the engine.
// Read by segmentation, or spoken against the spelling (ตำรวจ tam-rùat, ประโยค prà-yòok).
const GARDEN_KNOWN = new Set(["มีความสุข", "ภูมิใจ", "ตำรวจ", "ประโยค"]);
check(T.GARDEN_BEDS.length === 13, "thirteen garden beds");
check(T.GARDEN_ITEMS.length >= 450, `at least 450 garden words (got ${T.GARDEN_ITEMS.length})`);
eq(T.GARDEN_CHECK, { missing: [], unplaced: [] }, "every garden word sits in exactly one box");
for (const b of T.GARDEN_BEDS) for (const x of b.boxes) check(x.size >= 5 && x.size <= 15, `box ${b.id}/${x.title} has 5 to 15 words (${x.size})`);
// Regrouping keeps every 0.27 word's id, so saved progress follows the word to its new box.
const oldIds = JSON.parse(readFileSync(join(root, "tests/garden-ids-0.27.json"), "utf8"));
const nowIds = Object.fromEntries(T.GARDEN_ITEMS.map((i) => [i.th, i.id]));
for (const [th, id] of Object.entries(oldIds)) eq(nowIds[th], id, `garden ${th} keeps its id`);
// Boxes open in order: the first at once, the next at 80% Novice Monk; started boxes stay open.
{
  const course = T.courseItems("th");
  const chain = T.unlockChain({}, "th", true);
  const bed = T.GARDEN_BEDS[0];
  const box0 = course.filter((i) => i.garden === bed.id && i.box === 0);
  let open = T.gardenBoxes(course, {}, chain);
  check(open.has(`${bed.id}:0`) && !open.has(`${bed.id}:1`), "only the first box of a bed is open at the start");
  const srs = Object.fromEntries(box0.slice(0, Math.floor(box0.length * 0.8)).map((i) => [i.id, { stage: 2 }]));
  open = T.gardenBoxes(course, srs, chain);
  check(open.has(`${bed.id}:1`) && !open.has(`${bed.id}:2`), "80% of box 1 at Novice Monk opens box 2");
  const box2 = course.find((i) => i.garden === bed.id && i.box === 2);
  open = T.gardenBoxes(course, { [box2.id]: { stage: 1 } }, chain);
  check(open.has(`${bed.id}:2`), "a started box stays open");
  check(!T.gardenBoxes(course, {}, T.unlockChain({}, "th", false)).has(`${bed.id}:1`), "a box whose words all wait on letters keeps the next box shut");
  check(T.gardenBoxes(course, {}, chain, true).size === T.GARDEN_BEDS.reduce((a, b) => a + b.boxes.length, 0), "sandbox opens every box");
}
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

// 13. Wave F: keyboard layouts cover every letter, dictation words are typeable, palettes swap cleanly.
const thLetters = [..."กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ"];
const thMarks = [..."ะัาำิีึืุู็่้๊๋์เแโใไๆฯฤฦ๐๑๒๓๔๕๖๗๘๙"];
for (const ch of [...thLetters, ...thMarks]) check(!!T.keyFor(ch, "th"), `Kedmanee has ${ch}`);
const allKeys = (sc) => [...T.KEYMAPS[sc].rows.join(""), ...T.KEYMAPS[sc].shift.join("")];
for (const sc of ["th", "lo"]) { const k = allKeys(sc); check(new Set(k).size === k.length, `${sc} layout has no duplicate keys`); }
eq(T.KEYMAPS.th.rows.map((r) => [...r].length), [12, 13, 11, 10], "Kedmanee row lengths");
eq(T.KEYMAPS.th.shift.map((r) => [...r].length), [12, 13, 11, 10], "Kedmanee shifted row lengths");
eq(T.keyFor("ก", "th"), { row: 2, col: 2, shift: false }, "ก sits on the D key");
eq(T.keyFor("ซ", "th"), { row: 2, col: 9, shift: true }, "ซ is shifted ;");
for (const ch of [..."ກຂຄງຈສຊຍດຕຖທນບປຜຝພຟມຢຣລວຫອຮໜໝ"]) check(!!T.keyFor(ch, "lo"), `Lao layout has ${ch}`);
for (const mode of ["th", "lo"]) {
  const pool = T.dictationPool(mode, {});
  check(pool.words.length >= 20, `${mode} dictation has at least 20 words (got ${pool.words.length})`);
  check(pool.words.every((w) => T.typeable(w[pool.script], pool.script)), `${mode} dictation words are all typeable`);
  const syl = T.syllableTargets(mode);
  check(syl.length >= 20 && syl.every((x) => !/\s/.test(x.g) && [...x.g].length <= 5), `${mode} syllable targets are single short syllables (${syl.length})`);
  check(T.traceTargets(mode).every((t) => t.tts && t.tts[0]), `${mode} trace targets can be spoken`);
}
check(Object.keys(T.ANATOMY).every((g) => T.ANATOMY[g].marks.every((m) => m.length === 4 && m[0] > 0 && m[0] < 320 && m[1] > 0 && m[1] < 320)), "anatomy marks sit inside the trace box");
check(Object.values(T.ANATOMY).every((a) => !!T.ANATOMY[a.vs] || a.vs === "ภ"), "anatomy lookalikes are marked too");
eq(T.SRS_STAGES.map((s) => s.icon), ["lock", "seed", "monk", "naga", "guardian", "stupa"], "stage icons");
const before = JSON.stringify(T.TONES);
T.applyTonePalette("light");
eq(T.TONES.high.ink, T.TONES_LIGHT_BASE.high.ink, "daylight High ink");
eq(T.TONES.lo_high.color, T.TONES_LIGHT_BASE.high.color, "Lao tones follow the daylight palette");
T.applyTonePalette("dark");
eq(JSON.stringify(T.TONES), before, "dark palette restores exactly");
// Daylight inks must read on paper (#FAF7F0): WCAG contrast of at least 4.5.
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
for (const [k, t] of Object.entries(T.TONES_LIGHT_BASE)) check(contrast(t.ink, "#FAF7F0") >= 4.5, `daylight ${k} ink contrast ${contrast(t.ink, "#FAF7F0").toFixed(2)}`);

// Letter gate: practice modes only show letters you have had lessons on.
for (const mode of ["th", "lo", "dual"]) {
  const sc = mode === "lo" ? "lo" : "th";
  const upTo = (L) => { const srs = {}; T.courseItems(mode).filter((i) => i.level <= L).forEach((i) => { srs[i.id] = { stage: 1, next: 0 }; }); return srs; };
  const fresh = T.letterGate({}, mode);
  check(!fresh.ready("ก") && !fresh.ready("ກ") && fresh.ready("abc"), `${mode}: a new learner knows no letters, and Latin text never blocks`);
  eq(T.bridgeAccess(upTo(2), mode).open.size, 0, `${mode}: Mekong Predictor stays locked before Level 3`);
  const l3 = T.bridgeAccess(upTo(3), mode);
  check(l3.open.size > 0, `${mode}: Level 3 opens some Mekong laws`);
  const g3 = T.letterGate(upTo(3), mode);
  for (const law of T.BRIDGE_LAWS) for (const w of l3.words[law.id]) check(g3.ready(w.th, w.lo), `${mode}: open bridge word ${w.th} uses only met letters`);
  const all = T.bridgeAccess(upTo(99), mode);
  eq([...all.open].length, T.BRIDGE_LAWS.length, `${mode}: every Mekong law opens by the end of the course`);
  eq(T.bridgeAccess({}, mode, true).open.size, T.BRIDGE_LAWS.length, `${mode}: sandbox opens every law`);
  eq(T.streetPacks(mode).filter((p) => T.packReady(p, T.letterGate(upTo(99), mode))).length, T.streetPacks(mode).length, `${mode}: every sign opens by the end of the course`);
  eq(T.streetPacks(mode).filter((p) => T.packReady(p, fresh)).length, 0, `${mode}: no signs before any lessons`);
  check(T.rideStops(sc, T.letterGate(upTo(99), mode)).length === T.RIDE_ROUTES[sc].stops.length, `${mode}: every ride stop opens by the end`);
  for (const stop of T.rideRun(sc, g3)) check(g3.ready(stop.line.map((t) => t.t).join("")), `${mode}: ride line at Level 3 uses only met letters`);
  check(!T.corralFor(sc, fresh).open && T.corralFor(sc, T.letterGate(upTo(99), mode)).open, `${mode}: Classifier Corral opens with the course`);
  for (const it of T.corralFor(sc, g3).items) check(g3.ready(it[1], it[3]), `${mode}: corral noun ${it[1]} uses met letters`);
  for (let d = 0; d < 8; d += 1) {
    const tp = T.todayPractice({ srs: {}, mode, bridgeSched: {}, log: {}, now: Date.UTC(2026, 10, 2 + d, 12) });
    check(tp.kind !== "mekong" && tp.kind !== "sign", `${mode}: Today Path skips Mekong and signs before their letters (day ${d} got ${tp.kind})`);
  }
  const kinds = new Set([0, 1, 2, 3, 4, 5, 6, 7].map((d) => T.todayPractice({ srs: upTo(99), mode, bridgeSched: {}, log: {}, now: Date.UTC(2026, 10, 2 + d, 12) }).kind));
  check(kinds.size >= 1, `${mode}: Today Path still picks a practice late in the course`);
}

// Apprentice ladder: new items climb 4h, 8h, 1d, 2d before FSRS; misses drop a rung.
{
  const H = 3600 * 1000, t0 = Date.UTC(2026, 10, 2, 8);
  let it = { stage: 1, next: t0 + 4 * H, ladder: 0 };
  let t = t0 + 4 * H;
  const waits = [];
  for (let k = 0; k < 4; k += 1) {
    it = T.scheduleItem(it, { read: 3, second: 3 }, t, { ladder: true });
    waits.push(Math.round((it.next - t) / H));
    if (k < 3) { check(it.stage === 1, `ladder rung ${k + 1}: still Lotus Seed (got ${it.stage})`); t = it.next; }
  }
  eq(waits.slice(0, 3), [8, 24, 48], "ladder waits 8h, 1d, 2d after each right answer");
  check(it.ladder === null && it.grad && it.stage >= 2, `climbing off the top rung earns Novice Monk (stage ${it.stage})`);
  // A miss after graduating comes back in 10 minutes, then on the 8-hour rung.
  const miss = T.scheduleItem(it, { read: 1, second: 3 }, t + 5 * 24 * H, { ladder: true });
  check(miss.stage === 1 && miss.ladder === 1 && miss.next - (t + 5 * 24 * H) === 10 * 60 * 1000 && miss.lastMiss, "a miss drops a graduated item to the 8h rung with a 10-minute relearn");
  const relearned = T.scheduleItem(miss, { read: 3, second: 3 }, miss.next, { ladder: true });
  check(relearned.ladder === 1 && relearned.next - miss.next === 8 * H, "the relearn answer doesn't climb; the item waits 8 hours");
  const onLadder = T.scheduleItem({ stage: 1, next: 0, ladder: 2 }, { read: 1 }, t0, { ladder: true });
  eq(onLadder.ladder, 1, "a miss on the ladder drops one rung");
  const practice = T.scheduleItem({ stage: 1, next: t0 + 9 * H, ladder: 2 }, { spell: 3 }, t0);
  check(practice.ladder === 2 && practice.next === t0 + 9 * H, "practice outside reviews leaves the ladder and due time alone");
  const legacy = T.scheduleItem({ stage: 1, next: 0 }, { read: 3 }, t0, { ladder: true });
  check(legacy.ladder === null, "items from before the ladder stay on FSRS until a miss");
  const sentence = T.scheduleItem({ stage: 1, next: 0 }, { read: 3 }, t0);
  check(sentence.ladder === null, "the sentence deck doesn't use the ladder");
  // Review order: recent misses and leeches first.
  const q = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  for (let k = 0; k < 10; k += 1) {
    const o = T.reviewOrder(q, { c: { stage: 1, lastMiss: t0 - H } }, t0).map((i) => i.id);
    check(o[0] === "c" && o.length === 4, `recent miss goes first (got ${o})`);
  }
  eq(T.reviewOrder(q, { c: { stage: 1, lastMiss: t0 - 30 * H } }, t0).length, 4, "old misses shuffle with the rest");
}

// Unlock chain: syllables and words wait for their letters to reach Novice Monk.
for (const mode of ["th", "lo", "dual"]) {
  const course = T.courseItems(mode);
  const none = T.unlockChain({}, mode);
  const glyphs = course.filter((i) => i.tier === "glyph");
  check(glyphs.every((g) => none.ready(g)), `${mode}: letters never wait`);
  const words = course.filter((i) => i.tier !== "glyph" && i.level === 1);
  check(words.some((w) => !none.ready(w)), `${mode}: Level 1 words wait for their letters`);
  const allGlyphs = Object.fromEntries(glyphs.map((g) => [g.id, { stage: 2 }]));
  const full = T.unlockChain(allGlyphs, mode);
  check(course.every((i) => full.ready(i)), `${mode}: with every letter at Novice Monk nothing waits`);
  check(T.unlockChain({}, mode, true).ready(words[0]), `${mode}: sandbox skips the chain`);
  const started = words.find((w) => !none.ready(w));
  check(T.unlockChain({ [started.id]: { stage: 1 } }, mode).ready(started), `${mode}: an item already started never waits`);
  // Levels: 90% of the level's letters opens the next one, and every level can open.
  const l1 = glyphs.filter((g) => g.level === 1);
  const most = Object.fromEntries(l1.slice(0, Math.max(1, Math.floor(l1.length * 0.9))).map((g) => [g.id, { stage: 2 }]));
  check(T.levelPassed(1, course, most, T.unlockChain(most, mode)), `${mode}: 90% of Level 1 letters passes it`);
  const few = Object.fromEntries(l1.slice(0, Math.max(1, Math.floor(l1.length * 0.9)) - 1).map((g) => [g.id, { stage: 2 }]));
  check(!T.levelPassed(1, course, few, T.unlockChain(few, mode)), `${mode}: fewer letters doesn't`);
  // Simulate a learner who takes every open lesson and gets each item to Novice Monk: the whole course opens.
  let srs = {};
  for (let round = 0; round < 60; round += 1) {
    const ch = T.unlockChain(srs, mode);
    let open = 1;
    for (let n = 2; n <= 9; n += 1) { if (T.levelPassed(n - 1, course, srs, ch)) open = n; else break; }
    const fresh = course.filter((i) => !i.garden && i.level <= open && !srs[i.id] && ch.ready(i));
    if (!fresh.length) break;
    fresh.forEach((i) => { srs[i.id] = { stage: 2 }; });
  }
  const core = course.filter((i) => !i.garden);
  eq(core.filter((i) => !srs[i.id]).map((i) => i.th), [], `${mode}: a steady learner reaches every core item`);
}

// Guardian Trials: levels open by passing the previous level's trial.
for (const mode of ["th", "lo"]) {
  const course = T.courseItems(mode);
  const H = 3600 * 1000;
  const lv = (n) => course.filter((i) => i.level === n && !i.garden);
  const learned = (levels, stage = 2) => Object.fromEntries(course.filter((i) => levels.includes(i.level) && !i.garden).map((i) => [i.id, { stage, fsrs: { read: { S: 3, D: 5, last: 0 } } }]));
  eq([...T.openLevels({}, mode)], [1], `${mode}: a new learner has Level 1 only`);
  const l1 = learned([1]);
  eq([...T.openLevels(l1, mode)], [1], `${mode}: meeting the letter goal alone doesn't open Level 2`);
  const chain = T.unlockChain(l1, mode);
  eq(T.trialState(1, mode, l1, {}, chain).status, "ready", `${mode}: the Level 1 trial is ready at the letter goal`);
  eq(T.trialState(1, mode, {}, {}, T.unlockChain({}, mode)).status, "learning", `${mode}: no trial before the goal`);
  const passed = { [T.trialKey(mode, 1)]: { passed: 1 } };
  check(T.openLevels(l1, mode, false, passed).has(2), `${mode}: passing the Level 1 trial opens Level 2`);
  check(T.openLevels({}, mode, true).size >= 9, `${mode}: sandbox opens everything`);
  // Failing: the trial is owed until each missed item is right in a real review again.
  const miss = lv(1)[0];
  const failedAt = 10 * 24 * H;
  const trials = { [T.trialKey(mode, 1)]: { failed: failedAt, owed: [miss.id] } };
  const relearned = { ...l1, [miss.id]: { stage: 1, lastMiss: failedAt, fsrs: { read: { S: 1, D: 5, last: failedAt + 10 * 60 * 1000 } } } };
  eq(T.trialState(1, mode, relearned, trials, chain).status, "owed", `${mode}: the 10-minute relearn doesn't bring the guardian back`);
  const reviewed = { ...l1, [miss.id]: { stage: 1, lastMiss: failedAt, fsrs: { read: { S: 1, D: 5, last: failedAt + 8 * H } } } };
  eq(T.trialState(1, mode, reviewed, trials, chain).status, "ready", `${mode}: a right review after the 8-hour rung brings the guardian back`);
  const missedAgain = { ...l1, [miss.id]: { stage: 1, lastMiss: failedAt + 8 * H, fsrs: { read: { S: 1, D: 5, last: failedAt + 8 * H } } } };
  eq(T.trialState(1, mode, missedAgain, trials, chain).status, "owed", `${mode}: missing it again keeps the trial owed`);
  // Prompts: 12, four rounds, only started items from the level, tone answers valid.
  for (let n = 1; n <= 9; n += 1) {
    const srs = learned([n], 1);
    if (!lv(n).length) continue;
    for (let k = 0; k < 3; k += 1) {
      const ps = T.buildTrial([n], mode, srs);
      eq(ps.length, T.TRIAL_SIZE, `${mode} L${n}: a trial has ${T.TRIAL_SIZE} prompts`);
      check(ps.every((p) => p.item.level === n && srs[p.item.id]), `${mode} L${n}: prompts use only started items of the level`);
      check(["recognise", "listen", "read"].every((r) => ps.some((p) => p.round === r)), `${mode} L${n}: recognise, listen and read rounds are there`);
      for (const p of ps) {
        if (p.options) check(p.options.length >= 2 && p.options.some((o) => o.id === p.item.id) && new Set(p.options.map((o) => o.id)).size === p.options.length, `${mode} L${n}: ${p.round} options include the answer once`);
        if (p.round === "tone") check(p.kind === "class" ? ["high", "mid", "low"].includes(p.answer) : !!T.TONES[p.answer], `${mode} L${n}: tone prompt for ${p.item.th} has a valid answer (${p.answer})`);
        if (p.round === "read") check(p.meanings.some((o) => o.id === p.item.id), `${mode} L${n}: read prompt offers the right meaning`);
      }
      check(ps.slice(-3).every((p) => p.round === "read"), `${mode} L${n}: the trial ends on the read round`);
    }
  }
  eq(T.buildTrial([2], mode, {}).length, 0, `${mode}: no prompts from items you haven't started`);
  const river = T.buildTrial([1, 2, 3], mode, {}, { size: T.RIVER_SIZE, onlyStarted: false });
  eq(river.length, T.RIVER_SIZE, `${mode}: a river run has ${T.RIVER_SIZE} prompts`);
  check(river.every((p) => [1, 2, 3].includes(p.item.level)), `${mode}: river prompts come from the skipped levels`);
  eq(T.riverLevels(5, new Set([1, 2])), [2, 3, 4], `${mode}: a river run to 5 from Level 2 covers 2 to 4`);
  // Legacy: levels opened under 0.27 stay open.
  const old = learned([1, 2]);
  const leg = T.legacyTrials(old);
  check(T.openLevels(old, mode, false, leg).has(3), `${mode}: a learner from 0.27 keeps Level 3`);
  check(!T.openLevels(old, mode, false, leg).has(4), `${mode}: but not levels the old rule hadn't opened`);
}
for (const it of T.courseItems("th").concat(T.courseItems("lo"))) check(!/[\u0E00-\u0EFF]/.test(T.trialCue(it)) && T.trialCue(it).length > 0, `trial cue for ${it.id} has no Thai or Lao text: ${T.trialCue(it)}`);
// Scoring: 3 lanterns, no relighting.
const runOf = (n, miss) => Array.from({ length: n }, (_, i) => ({ ok: !miss.includes(i) }));
check(T.trialOutcome(runOf(12, []), 3, 12).gold, "12 right is gold");
check(T.trialOutcome(runOf(12, [2, 7]), 3, 12).passed && !T.trialOutcome(runOf(12, [2, 7]), 3, 12).gold, "two misses pass without gold");
check(!T.trialOutcome(runOf(9, [1, 4, 8]), 3, 12).passed, "a third miss fails, even with right answers in between");
check(!T.trialOutcome(runOf(5, [4]), 1, 20).passed, "one miss ends a river run");
check(!T.trialOutcome(runOf(11, []), 3, 12).passed, "an unfinished trial doesn't pass");

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
