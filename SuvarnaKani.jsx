import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Landmark, PenTool, FlaskConical, Orbit, Scissors, Volume2, VolumeX, Music, Unlock, Lock,
  Type, Languages, X, ChevronLeft, ChevronRight, Sparkles, RotateCcw, Check, Eye, Info,
  Headphones, BookOpen, Trophy, Eraser, Play, Zap, Compass, AlertTriangle,
  Cloud, Sun, Waves, Ear, Target, Flame, Mic,
} from "lucide-react";

/* ============================================================================
 * SuvarṇaKani (สุวรรณกานิ / ສຸວັນນະການິ)
 * First-principles Thai & Lao script, tone physics and SRS trainer.
 * Single-file React + Tailwind + lucide-react.
 * ========================================================================== */

const STORAGE_KEY = "suvarnakani.v1";

const COLORS = {
  obsidian: "#0B0F19",
  slate: "#0F172A",
  gold: "#F59E0B",
  // Tier hues tuned for colour-blind separation (deuteranopia ΔE_OK ≥ 18).
  cyan: "#22D3EE",
  magenta: "#E0457B",
  purple: "#7C5CFF",
};

const TIER = {
  glyph: { label: "Glyph", color: COLORS.cyan },
  syllable: { label: "Syllable", color: COLORS.magenta },
  vocab: { label: "Vocabulary", color: COLORS.purple },
};

const FONT_STACKS = {
  loop: {
    th: '"Noto Serif Thai", "Sarabun", serif',
    lo: '"Noto Serif Lao", "Phetsarath OT", serif',
  },
  street: {
    th: '"Kanit", "Noto Sans Thai", "Prompt", sans-serif',
    lo: '"Noto Sans Lao", "Phetsarath OT", sans-serif',
  },
};

// UI text mixes Latin with Thai and Lao, so the UI stack falls back to Noto for both scripts.
const UI_FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Noto Sans Thai", "Noto Sans Lao", sans-serif';

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Noto+Serif+Thai:wght@400;600&family=Noto+Serif+Lao:wght@400;600&family=Sarabun:wght@400;600&family=Kanit:wght@300;500&family=Noto+Sans+Thai:wght@400;600&family=Noto+Sans+Lao:wght@400;600&display=swap";

/* ---------------------------------------------------------------------------
 * Tone system (Bangkok Thai, Chao tone numbers)
 * Colour lightness follows pitch height: Low is darkest, High is lightest, and
 * contour tones are drawn as gradients from start pitch to end pitch. `ink` is
 * the text-safe variant of each colour on dark surfaces.
 * ------------------------------------------------------------------------- */
const TONES = {
  mid: { name: "Mid", th: "สามัญ", chao: "33", color: "#22C3A6", ink: "#3DDBBE", grad: ["#22C3A6", "#22C3A6"], notes: ["C4", "C4"] },
  low: { name: "Low", th: "เอก", chao: "21", color: "#6E5CE6", ink: "#A99DF7", grad: ["#8577EE", "#4D3FC4"], notes: ["A3", "F3"] },
  falling: { name: "Falling", th: "โท", chao: "51", color: "#FF6B4A", ink: "#FF8A6E", grad: ["#FFB199", "#C2381D"], notes: ["E4", "G4", "G3"] },
  high: { name: "High", th: "ตรี", chao: "45", color: "#FFE27A", ink: "#FFE27A", grad: ["#F5C842", "#FFF0B8"], notes: ["E4", "A4"] },
  rising: { name: "Rising", th: "จัตวา", chao: "214", color: "#4FA3FF", ink: "#7DBBFF", grad: ["#2A5FA8", "#BFE0FF"], notes: ["C4", "G3", "F4"] },
};
const TONE_ORDER = ["mid", "low", "falling", "high", "rising"];

const NOTE_FREQ = { F3: 174.61, G3: 196.0, A3: 220.0, C4: 261.63, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0 };

/* Classes use an "altitude" ramp of temple gold (pale = high, bronze = low)
 * plus a persona icon, so they never share a hue with the item tiers. */
const CLASSES = {
  mid: { name: "Middle", persona: "Golden Monks", th: "อักษรกลาง", lo: "ອັກສອນກາງ", color: "#F5A524", icon: Sun, rule: "Middle class: unaspirated stops and อ (ก จ ด ต บ ป อ, plus ฎ ฏ). No mark on a live syllable gives Mid." },
  high: { name: "High", persona: "Sky Nagas", th: "อักษรสูง", lo: "ອັກສອນສູງ", color: "#FFF1C2", icon: Cloud, rule: "High class: aspirated and voiceless letters whose names rise (ข ฉ ถ ผ ฝ ส ห, plus ฐ ศ ษ). No mark on a live syllable gives Rising." },
  low: { name: "Low", persona: "River Spirits", th: "อักษรต่ำ", lo: "ອັກສອນຕ່ຳ", color: "#D08A3C", icon: Waves, rule: "Low class: sonorants (ง น ม ย ร ล ว) and the low partners of aspirates (ค ช ท พ ฟ ซ ฮ). No mark on a live syllable gives Mid, but tone marks shift one step." },
};

const MARKS = {
  none: { name: "No mark", plain: "No mark", th: "", lo: "" },
  ek: { name: "Mai Ek ◌่", plain: "Mai Ek", th: "่", lo: "່" },
  tho: { name: "Mai Tho ◌้", plain: "Mai Tho", th: "้", lo: "້" },
  tri: { name: "Mai Tri ◌๊", plain: "Mai Tri", th: "๊", lo: "໊" },
  jat: { name: "Mai Chattawa ◌๋", plain: "Mai Chattawa", th: "๋", lo: "໋" },
};

/** Deterministic Thai tone rule engine. */
function computeTone({ cls, live, long, mark = "none", hn = false }) {
  const steps = [];
  let eff = cls;
  let warning = null;
  if (hn && cls === "low") {
    eff = "high";
    steps.push("Silent ห นำ (ຫ ນຳ) in front of a Low-class sonorant promotes the syllable to High class.");
  }
  steps.push(`${CLASSES[eff].name} class (${CLASSES[eff].persona}).`);
  steps.push(
    live
      ? "Live syllable (คำเป็น): long vowel, or ends in a sonorant (m, n, ng, w, y)."
      : `Dead syllable (คำตาย): short open vowel, or ends in a stop (p, t, k). Vowel is ${long ? "long" : "short"}.`
  );
  let tone;
  if (mark !== "none") {
    if (mark === "ek") tone = eff === "low" ? "falling" : "low";
    else if (mark === "tho") tone = eff === "low" ? "high" : "falling";
    else if (mark === "tri") tone = "high";
    else tone = "rising";
    if ((mark === "tri" || mark === "jat") && eff !== "mid") {
      warning = "Mai tri and mai chattawa normally appear only on Middle-class consonants. Outside that, they show up in loanwords and slang and are read as written.";
    }
    if (eff === "low" && (mark === "ek" || mark === "tho")) {
      steps.push(`Low-class shift: tone mark #${mark === "ek" ? 1 : 2} is read one step further, as ${TONES[tone].name}.`);
    } else {
      steps.push(`${MARKS[mark].plain} sets the tone directly: ${TONES[tone].name}.`);
    }
  } else if (live) {
    tone = eff === "high" ? "rising" : "mid";
    steps.push(`No mark on a live syllable: ${eff === "high" ? "High class rises" : "baseline Mid"}.`);
  } else if (eff === "low") {
    tone = long ? "falling" : "high";
    steps.push(`Low class + dead + ${long ? "long vowel → Falling" : "short vowel → High"}.`);
  } else {
    tone = "low";
    steps.push(`${CLASSES[eff].name} class + dead syllable → Low.`);
  }
  const formula = `${CLASSES[eff].name} + ${live ? "Live" : `Dead ${long ? "Long" : "Short"}`} + ${MARKS[mark].plain} = ${TONES[tone].name} (${TONES[tone].chao})`;
  return { tone, eff, steps, warning, formula };
}

/* ---------------------------------------------------------------------------
 * Curriculum (3 levels). ttsTh / ttsLo contain ONLY Thai script and are what
 * the Thai TTS voice reads. ttsLo is a Thai-script approximation of the Lao.
 * ------------------------------------------------------------------------- */
const CURRICULUM = [
  // ---------------- Level 1: The Golden Monks ----------------
  { id: "g-ko", level: 1, tier: "glyph", th: "ก", lo: "ກ", thRoman: "k / g · gaw gài", loRoman: "k · ko kai", meaning: "k sound · chicken (ไก่)", accept: ["k", "g", "ko", "gor", "gaw", "kokai", "gorgai", "chicken"], ttsTh: "กอ ไก่", ttsLo: "กอ ไก่", cls: "mid", tone: ["mid"],
    loop: "A loopless letter. Start at the little beak on the upper left, arch over the top, then drop the right leg.", mnemonic: "A Golden Monk bows to feed his chicken (ไก่). Calm and centred: the Mid tone.", street: "Street fonts keep the same silhouette, so ก is one of the easiest letters to read on signs.", trap: "ก vs ถ: ถ has a loop at its bottom-left foot. ก never does." },
  { id: "g-cho", level: 1, tier: "glyph", th: "จ", lo: "ຈ", thRoman: "j (unaspirated ch) · jaw jaan", loRoman: "ch/j · cho chok", meaning: "j sound · plate (จาน)", accept: ["j", "ch", "jo", "jor", "jaw", "jaan", "plate", "cup"], ttsTh: "จอ จาน", ttsLo: "จอ จอก", cls: "mid", tone: ["mid"],
    loop: "Head loop sits low on the right inside the curl. Start there, sweep up and round to the left, and finish the tail.", mnemonic: "The monk carries his alms plate (จาน) in a curling arm.", street: "In loopless fonts the inner loop becomes a short hook.", trap: "จ is easy to confuse with ร or ว in fast handwriting; จ curls back on itself.",
    bridge: "Lao name word differs: ຈອກ (cup) instead of จาน (plate)." },
  { id: "g-do", level: 1, tier: "glyph", th: "ด", lo: "ດ", thRoman: "d · daw dèk", loRoman: "d · do dek", meaning: "d sound · child (เด็ก)", accept: ["d", "do", "dor", "daw", "child", "kid"], ttsTh: "ดอ เด็ก", ttsLo: "ดอ เด็ก", cls: "mid", tone: ["mid"],
    loop: "The loop sits inside the bowl. Start at the loop, run down to the left foot, climb the left wall, arch over and come down on the right.", mnemonic: "A child (เด็ก) curled up asleep inside the temple bell.", street: "Loopless fonts turn it into an upside-down U with a slash; look for the smooth, un-notched roof.", trap: "ด vs ต: ต has a notch dipping into its roof. ด vs ค: ค's loop hangs off the straight left wall instead of a diagonal tail." },
  { id: "g-to", level: 1, tier: "glyph", th: "ต", lo: "ຕ", thRoman: "t (unaspirated) · taw tào", loRoman: "t · to ta", meaning: "t sound · turtle (เต่า)", accept: ["t", "to", "tor", "taw", "turtle", "eye"], ttsTh: "ตอ เต่า", ttsLo: "ตอ ตา", cls: "mid", tone: ["mid"],
    loop: "Same path as ด, plus a notch in the roof. Start at the inner loop.", mnemonic: "The turtle (เต่า) has a dent in its shell: that notch is ต.", street: "The roof notch survives in street fonts, so read the top edge.", trap: "ต = ด + notched roof.", bridge: "Lao name word: ຕາ (eye)." },
  { id: "g-bo", level: 1, tier: "glyph", th: "บ", lo: "ບ", thRoman: "b · baw bai-mái", loRoman: "b · bo bae", meaning: "b sound · leaf (ใบไม้)", accept: ["b", "bo", "bor", "baw", "leaf", "goat"], ttsTh: "บอ ใบไม้", ttsLo: "บอ แบ้", cls: "mid", tone: ["mid"],
    loop: "Head loop at top-left. Drop the left wall, run along the flat floor, rise up the right wall.", mnemonic: "A leaf-shaped alms bowl (ใบไม้) with a flat bottom.", street: "Loopless: a plain U with a flat floor.", trap: "บ vs ป: ป's right wall shoots above the line. บ vs น: น ends in a curled tail.", bridge: "Lao name word: ແບ້ (goat)." },
  { id: "g-po", level: 1, tier: "glyph", th: "ป", lo: "ປ", thRoman: "p (unaspirated) · paw plaa", loRoman: "p · po pa", meaning: "p sound · fish (ปลา)", accept: ["p", "po", "por", "paw", "fish"], ttsTh: "ปอ ปลา", ttsLo: "ปอ ปา", cls: "mid", tone: ["mid"],
    loop: "Like บ, but the right wall shoots up above the line like a fishing pole.", mnemonic: "A fishing pole (ปลา) sticking up from the bowl.", street: "The tall tail is the only clue in any font; ignore the loop.", trap: "ป vs บ (no tail) and ป vs ฝ (W-body with tail).", bridge: "Thai ปลา keeps the pl- cluster; Lao ປາ drops it." },
  { id: "g-o", level: 1, tier: "glyph", th: "อ", lo: "ອ", thRoman: "silent / glottal · aw àang", loRoman: "o · o o", meaning: "silent carrier · basin (อ่าง)", accept: ["o", "or", "aw", "silent", "glottal", "basin", "bowl"], ttsTh: "ออ อ่าง", ttsLo: "ออ โอ", cls: "mid", tone: ["mid"],
    loop: "Loop at top-right inside. Start at the loop, pull up and round counter-clockwise into a closed bowl.", mnemonic: "An empty basin (อ่าง): it carries a vowel but makes no sound of its own.", street: "Loopless fonts make it a plain 0 with a flick.", trap: "อ (glottal, middle) vs ฮ (h, low): ฮ has an extra notch.", bridge: "Lao name word: ໂອ (bowl)." },
  { id: "s-kaa", level: 1, tier: "syllable", th: "กา", lo: "ກາ", thRoman: "gaa", loRoman: "kaa", meaning: "crow", accept: ["gaa", "kaa", "ga", "ka", "crow"], ttsTh: "กา", ttsLo: "กา", tone: ["mid"], parts: { cls: "mid", live: true, long: true, mark: "none" },
    mnemonic: "Monk + long aa = a level Mid call: the crow's caw.", trap: "The vowel า always sits to the right, but it is spoken after the consonant." },
  { id: "s-dii", level: 1, tier: "syllable", th: "ดี", lo: "ດີ", thRoman: "dii", loRoman: "dii", meaning: "good", accept: ["dii", "di", "dee", "good"], ttsTh: "ดี", ttsLo: "ดี", tone: ["mid"], parts: { cls: "mid", live: true, long: true, mark: "none" },
    mnemonic: "The ี on the roof is a long ii: a good, long, level note.", trap: "ิ (short i) vs ี (long ii): the long one has an extra tick." },
  { id: "s-taa", level: 1, tier: "syllable", th: "ตา", lo: "ຕາ", thRoman: "taa", loRoman: "taa", meaning: "eye / maternal grandfather", accept: ["taa", "ta", "eye", "grandfather", "grandpa"], ttsTh: "ตา", ttsLo: "ตา", tone: ["mid"], parts: { cls: "mid", live: true, long: true, mark: "none" },
    mnemonic: "Grandpa's eye watches the turtle.", trap: "ตา (eye) vs ทา (to paint): different class, different breath." },
  { id: "s-plaa", level: 1, tier: "syllable", th: "ปลา", lo: "ປາ", thRoman: "plaa", loRoman: "paa", meaning: "fish", accept: ["plaa", "pla", "paa", "pa", "fish"], ttsTh: "ปลา", ttsLo: "ปา", tone: ["mid"], parts: { cls: "mid", live: true, long: true, mark: "none" },
    mnemonic: "The fish slips its l in the Mekong: Thai plaa, Lao paa.", trap: "In a cluster, the first consonant (ป) sets the class.", bridge: "Cluster simplification: Thai keeps pl-, Lao drops the l." },
  { id: "v-kin", level: 1, tier: "vocab", th: "กิน", lo: "ກິນ", thRoman: "gin", loRoman: "kin", meaning: "eat", accept: ["gin", "kin", "eat"], ttsTh: "กิน", ttsLo: "กิน", tone: ["mid"], parts: { cls: "mid", live: true, long: false, mark: "none" },
    mnemonic: "Short i, but the final น keeps the syllable alive: Mid.", trap: "A short vowel is still live when it ends in m, n, ng, w or y." },
  { id: "v-baan", level: 1, tier: "vocab", th: "บ้าน", lo: "ບ້ານ", thRoman: "bâan", loRoman: "baan", meaning: "house / home", accept: ["baan", "ban", "house", "home"], ttsTh: "บ้าน", ttsLo: "บ้าน", tone: ["falling"], parts: { cls: "mid", live: true, long: true, mark: "tho" },
    mnemonic: "Mai Tho on a monk: the voice falls as you come home and drop your bag.", trap: "Tone marks sit above the consonant, even though they are pronounced over the whole syllable." },
  { id: "v-jai", level: 1, tier: "vocab", th: "ใจ", lo: "ໃຈ", thRoman: "jai", loRoman: "chai", meaning: "heart / mind", accept: ["jai", "chai", "heart", "mind"], ttsTh: "ใจ", ttsLo: "ใจ", tone: ["mid"], parts: { cls: "mid", live: true, long: false, mark: "none" },
    mnemonic: "The ใ swirls in front like a heart opening before the word is spoken.", trap: "ใ (mai muan) and ไ (mai malai) sound the same; ใ appears in only 20 common Thai words." },
  { id: "v-diijai", level: 1, tier: "vocab", th: "ดีใจ", lo: "ດີໃຈ", thRoman: "dii-jai", loRoman: "dii-chai", meaning: "glad / happy", accept: ["diijai", "dijai", "deejai", "diichai", "glad", "happy"], ttsTh: "ดีใจ", ttsLo: "ดีใจ", tone: ["mid", "mid"],
    mnemonic: "Good + heart = glad.", trap: "Thai writes no spaces between words, so ดีใจ looks like one block." },

  // ---------------- Level 2: Sky Nagas vs River Spirits ----------------
  { id: "g-kho", level: 2, tier: "glyph", th: "ข", lo: "ຂ", thRoman: "kh · khǎw khài", loRoman: "kh · kho khai", meaning: "kh sound · egg (ไข่)", accept: ["kh", "k", "kho", "khor", "khaw", "egg"], ttsTh: "ขอ ไข่", ttsLo: "ขอ ไข่", cls: "high", tone: ["rising"],
    loop: "Head loop at top-left. Drop the left wall, round the bottom, climb the right wall.", mnemonic: "A Sky Naga guards its egg (ไข่) high up. Its name rises: khǎw.", street: "Loopless: a U with a tiny notch on the left top.", trap: "ข vs ช: ช has a hook on the right shoulder. ข vs ฃ (obsolete) has a notch." },
  { id: "g-so", level: 2, tier: "glyph", th: "ส", lo: "ສ", thRoman: "s · sǎw sʉ̌a", loRoman: "s · so suea", meaning: "s sound · tiger (เสือ)", accept: ["s", "so", "sor", "saw", "tiger"], ttsTh: "สอ เสือ", ttsLo: "สอ เสือ", cls: "high", tone: ["rising"],
    loop: "Loop low on the left, curve up and over, with a flick on top-right.", mnemonic: "The tiger (เสือ) prowls in the sky with the Nagas: a high, hissing s.", street: "In street fonts ส can look like ล; check the top-right flick.", trap: "ส vs ล: ล has no flick on top; ส vs ศ/ษ (also high-class s, used in Sanskrit loans)." },
  { id: "g-ho", level: 2, tier: "glyph", th: "ห", lo: "ຫ", thRoman: "h · hǎw hìip", loRoman: "h · ho han", meaning: "h sound · chest (หีบ)", accept: ["h", "ho", "hor", "haw", "chest", "goose"], ttsTh: "หอ หีบ", ttsLo: "หอ ห่าน", cls: "high", tone: ["rising"],
    loop: "Loop at bottom-left; zig up, down and up again.", mnemonic: "The Naga hides treasure in a chest (หีบ). It can also go silent and lift its neighbour into the sky (ห นำ).", street: "Loopless ห looks like a W with a hook.", trap: "ห (high h) vs ฮ (low h): different tone behaviour, same sound.", bridge: "Lao name word: ຫ່ານ (goose)." },
  { id: "g-kho2", level: 2, tier: "glyph", th: "ค", lo: "ຄ", thRoman: "kh · khaw khwaai", loRoman: "kh · kho khwai", meaning: "kh sound · water buffalo (ควาย)", accept: ["kh", "k", "kho", "khor", "khaw", "buffalo", "waterbuffalo"], ttsTh: "คอ ควาย", ttsLo: "คอ ควาย", cls: "low", tone: ["mid"],
    loop: "The loop hangs off the inside of the straight left wall. Start at the loop and follow the body round.", mnemonic: "A River Spirit rides the water buffalo (ควาย) along the bank. Same kh as ข, but a low-class tone.", street: "Loopless ค is easy to misread as ด; check for the straight left wall.", trap: "ข (high) and ค (low) are both kh: the letter you see decides the tone, not the sound." },
  { id: "g-cho2", level: 2, tier: "glyph", th: "ช", lo: "ຊ", thRoman: "ch · chaw cháang", loRoman: "x/s · xo xang", meaning: "ch sound · elephant (ช้าง)", accept: ["ch", "x", "s", "cho", "chor", "chaw", "elephant"], ttsTh: "ชอ ช้าง", ttsLo: "ซอ ซ้าง", cls: "low", tone: ["mid"],
    loop: "Like ข with a hooked right shoulder (the elephant's trunk).", mnemonic: "The elephant (ช้าง) curls its trunk on the right shoulder.", street: "The hook is the giveaway in any font.", trap: "ช vs ซ: ซ has the hook plus a notch on the left.", bridge: "Thai ช (ch) corresponds to Lao ຊ (x / s): ช้าง ↔ ຊ້າງ." },
  { id: "g-no", level: 2, tier: "glyph", th: "น", lo: "ນ", thRoman: "n · naw nǔu", loRoman: "n · no nok", meaning: "n sound · mouse (หนู)", accept: ["n", "no", "nor", "naw", "mouse", "bird"], ttsTh: "นอ หนู", ttsLo: "นอ นก", cls: "low", tone: ["mid"],
    loop: "Head loop top-left. Down the left wall, up the diagonal, finish with a curled tail at bottom-right.", mnemonic: "The mouse (หนู) curls its tail.", street: "Loopless น looks like a Latin u with a kick.", trap: "น vs บ: บ has a flat floor and no tail. น vs ม: ม has a second loop at its bottom-left.", bridge: "Lao name word: ນົກ (bird)." },
  { id: "g-mo", level: 2, tier: "glyph", th: "ม", lo: "ມ", thRoman: "m · maw máa", loRoman: "m · mo maeo", meaning: "m sound · horse (ม้า)", accept: ["m", "mo", "mor", "maw", "horse", "cat"], ttsTh: "มอ ม้า", ttsLo: "มอ แมว", cls: "low", tone: ["mid"],
    loop: "Two loops: one at top-left, one tucked in at bottom-left.", mnemonic: "A horse (ม้า) with a saddle loop and a stirrup loop.", street: "Loopless ม is a sharp-cornered u with a small notch.", trap: "ม vs น vs บ: count the loops and check the tail.", bridge: "Lao name word: ແມວ (cat)." },
  { id: "s-khaa", level: 2, tier: "syllable", th: "ขา", lo: "ຂາ", thRoman: "khǎa", loRoman: "khaa", meaning: "leg", accept: ["khaa", "kha", "leg"], ttsTh: "ขา", ttsLo: "ขา", tone: ["rising"], parts: { cls: "high", live: true, long: true, mark: "none" },
    mnemonic: "A Sky Naga lifts its leg: no mark, live syllable, so the voice rises.", trap: "Same sound as คา but High class: it rises." },
  { id: "s-khaa2", level: 2, tier: "syllable", th: "คา", lo: "ຄາ", thRoman: "khaa", loRoman: "khaa", meaning: "stuck / lodged", accept: ["khaa", "kha", "stuck", "lodged"], ttsTh: "คา", ttsLo: "คา", tone: ["mid"], parts: { cls: "low", live: true, long: true, mark: "none" },
    mnemonic: "The River Spirit is stuck in the mud: flat Mid.", trap: "ขา (rising, leg) vs คา (mid, stuck)." },
  { id: "s-maa-h", level: 2, tier: "syllable", th: "ม้า", lo: "ມ້າ", thRoman: "máa", loRoman: "maa", meaning: "horse", accept: ["maa", "ma", "horse"], ttsTh: "ม้า", ttsLo: "ม้า", tone: ["high"], parts: { cls: "low", live: true, long: true, mark: "tho" },
    mnemonic: "Low class + Mai Tho shifts up to High: the horse whinnies.", trap: "Mai Tho on a Low consonant is High, not Falling." },
  { id: "v-naam", level: 2, tier: "vocab", th: "น้ำ", lo: "ນ້ຳ", thRoman: "náam", loRoman: "nam", meaning: "water", accept: ["naam", "nam", "water"], ttsTh: "น้ำ", ttsLo: "น้ำ", tone: ["high"], parts: { cls: "low", live: true, long: true, mark: "tho" },
    mnemonic: "Water splashes up: Low + Mai Tho = High.", trap: "ำ is written as a short am, but in น้ำ most Bangkok speakers say a long náam." },
  { id: "v-chaang", level: 2, tier: "vocab", th: "ช้าง", lo: "ຊ້າງ", thRoman: "cháang", loRoman: "xaang", meaning: "elephant", accept: ["chaang", "chang", "xaang", "xang", "saang", "elephant"], ttsTh: "ช้าง", ttsLo: "ซ้าง", tone: ["high"], parts: { cls: "low", live: true, long: true, mark: "tho" },
    mnemonic: "The elephant trumpets high.", trap: "Low + Mai Tho = High.", bridge: "Thai ช ↔ Lao ຊ: cháang ↔ xaang." },
  { id: "v-khaaw", level: 2, tier: "vocab", th: "ข้าว", lo: "ເຂົ້າ", thRoman: "khâaw", loRoman: "khao", meaning: "rice / food", accept: ["khaaw", "khaao", "khao", "kao", "rice", "food"], ttsTh: "ข้าว", ttsLo: "เข้า", tone: ["falling"], parts: { cls: "high", live: true, long: true, mark: "tho" },
    mnemonic: "High + Mai Tho falls: the rice sack drops.", trap: "Thai ข้าว (rice) vs เข้า (enter) differ only in vowel length.", bridge: "Lao spells rice ເຂົ້າ, with a different vowel shape from Thai ข้าว." },
  { id: "v-maa", level: 2, tier: "vocab", th: "มา", lo: "ມາ", thRoman: "maa", loRoman: "maa", meaning: "come", accept: ["maa", "ma", "come"], ttsTh: "มา", ttsLo: "มา", tone: ["mid"], parts: { cls: "low", live: true, long: true, mark: "none" },
    mnemonic: "Come along at a calm Mid tone.", trap: "Part of the minimal triplet มา (come) · ม้า (horse) · หมา (dog)." },

  // ---------------- Level 3: The Mekong Bridge ----------------
  { id: "g-pho", level: 3, tier: "glyph", th: "ผ", lo: "ຜ", thRoman: "ph · phǎw phʉ̂ng", loRoman: "ph · pho pheung", meaning: "ph sound · bee (ผึ้ง)", accept: ["ph", "p", "pho", "phor", "phaw", "bee"], ttsTh: "ผอ ผึ้ง", ttsLo: "ผอ เผิ้ง", cls: "high", tone: ["rising"],
    loop: "Head loop top-left. Down the left wall, up to a LOW inner peak, down, then up the right wall.", mnemonic: "A bee (ผึ้ง) buzzing low over the flowers: the inner peak stays low.", street: "Loopless ผ looks like a W whose middle stops halfway.", trap: "ผ vs พ: พ's inner peak climbs all the way to the top. Add a tall tail and you get ฝ / ฟ." },
  { id: "g-pho2", level: 3, tier: "glyph", th: "พ", lo: "ພ", thRoman: "ph · phaw phaan", loRoman: "ph · pho phu", meaning: "ph sound · offering tray (พาน)", accept: ["ph", "p", "pho", "phor", "phaw", "tray", "mountain"], ttsTh: "พอ พาน", ttsLo: "พอ พู", cls: "low", tone: ["mid"],
    loop: "Head loop top-left. Same path as ผ, but the inner peak reaches the full height, like a W.", mnemonic: "The offering tray (พาน) is stacked tall to the top.", street: "Loopless พ is a clean W.", trap: "ผ (high, low peak) vs พ (low class, tall peak).", bridge: "Lao name word: ພູ (mountain)." },
  { id: "g-ro", level: 3, tier: "glyph", th: "ร", lo: "ຮ", thRoman: "r · raw rʉa", loRoman: "h · ho heuan", meaning: "Thai r ↔ Lao h", accept: ["r", "h", "ro", "ror", "raw", "boat", "house"], ttsTh: "รอ เรือ", ttsLo: "ฮอ เฮือน", cls: "low", tone: ["mid"],
    loop: "Thai ร: loop top-right, then down the hook. Lao ຮ: loop and an open belly.", mnemonic: "The boat (เรือ) crosses the Mekong and becomes a house (ເຮືອນ): r turns into h.", street: "Loopless ร looks like a 5 without its top bar.", trap: "Thai ร vs ธ vs ว.", bridge: "Native Thai ร usually becomes Lao ຮ (รัก ↔ ຮັກ), but often ລ in other words (รถ ↔ ລົດ). Lao has ຣ too, used mostly for names and loans." },
  { id: "g-lo", level: 3, tier: "glyph", th: "ล", lo: "ລ", thRoman: "l · law ling", loRoman: "l · lo ling", meaning: "l sound · monkey (ลิง)", accept: ["l", "lo", "lor", "law", "monkey"], ttsTh: "ลอ ลิง", ttsLo: "ลอ ลีง", cls: "low", tone: ["mid"],
    loop: "Loop low on the left, round over the top, and a short drop on the right.", mnemonic: "The monkey (ลิง) swings round the branch.", street: "Loopless ล and ส can blur; ส keeps a top-right flick.", trap: "ล vs ส vs ศ.", bridge: "Lao name word: ລີງ (monkey), same word." },
  { id: "s-maa-r", level: 3, tier: "syllable", th: "หมา", lo: "ໝາ", thRoman: "mǎa", loRoman: "maa", meaning: "dog", accept: ["maa", "ma", "dog"], ttsTh: "หมา", ttsLo: "หมา", tone: ["rising"], parts: { cls: "low", live: true, long: true, mark: "none", hn: true },
    mnemonic: "The silent Naga ห lifts ม into the sky: the dog's howl rises.", trap: "Completes the triplet: มา (Mid, come) · ม้า (High, horse) · หมา (Rising, dog).", bridge: "Lao writes ຫ + ມ as the single letter ໝ." },
  { id: "s-naaw", level: 3, tier: "syllable", th: "หนาว", lo: "ໜາວ", thRoman: "nǎaw", loRoman: "naao", meaning: "cold (weather)", accept: ["naaw", "naao", "nao", "cold"], ttsTh: "หนาว", ttsLo: "หนาว", tone: ["rising"], parts: { cls: "low", live: true, long: true, mark: "none", hn: true },
    mnemonic: "Shivering, your voice rises: nǎaw.", trap: "ห is silent; it only changes the tone.", bridge: "Lao writes ຫ + ນ as the single letter ໜ." },
  { id: "v-hello", level: 3, tier: "vocab", th: "สวัสดี", lo: "ສະບາຍດີ", thRoman: "sà-wàt-dii", loRoman: "sabaidee", meaning: "hello", accept: ["sawatdee", "sawasdee", "sawatdii", "sabaidee", "sabaidii", "hello", "hi"], ttsTh: "สวัสดี", ttsLo: "สะบายดี", tone: ["low", "low", "mid"],
    mnemonic: "Thai greets with สวัสดี; Lao greets with ສະບາຍດີ.", trap: "Thai สบายดี means 'I'm fine', not 'hello'.", bridge: "Different greeting words across the river; ສະບາຍດີ is spelled phonetically (ສະ for Thai ส-)." },
  { id: "v-thanks", level: 3, tier: "vocab", th: "ขอบคุณ", lo: "ຂອບໃຈ", thRoman: "khàawp-khun", loRoman: "khop jai", meaning: "thank you", accept: ["khopkhun", "khobkhun", "kopkun", "khawpkhun", "khopjai", "khobjai", "khopchai", "thankyou", "thanks"], ttsTh: "ขอบคุณ", ttsLo: "ขอบใจ", tone: ["low", "mid"],
    mnemonic: "Thai thanks with ขอบคุณ; Lao uses ຂອບໃຈ.", trap: "In Thai, ขอบใจ is casual, said to someone younger. In Lao, ຂອບໃຈ is the normal polite thanks.", bridge: "Same root ขอบ / ຂອບ, different second word." },
  { id: "v-saep", level: 3, tier: "vocab", th: "แซ่บ", lo: "ແຊບ", thRoman: "sɛ̂ɛp", loRoman: "xaep", meaning: "delicious (spicy-tasty)", accept: ["saep", "saeb", "zaep", "sep", "xaep", "xep", "delicious", "tasty", "yummy"], ttsTh: "แซ่บ", ttsLo: "แซบ", tone: ["falling"], parts: { cls: "low", live: false, long: true, mark: "ek" },
    mnemonic: "An Isan/Lao word that Bangkok borrowed: Low + Mai Ek falls.", trap: "Thai adds Mai Ek to match its tone rules; Lao ແຊບ needs no mark.", bridge: "Lao ແຊບ uses no tone mark; the Thai borrowing adds one." },
  { id: "v-love", level: 3, tier: "vocab", th: "รัก", lo: "ຮັກ", thRoman: "rák", loRoman: "hak", meaning: "love", accept: ["rak", "hak", "love"], ttsTh: "รัก", ttsLo: "ฮัก", tone: ["high"], parts: { cls: "low", live: false, long: false, mark: "none" },
    mnemonic: "Low class + dead short = High: love leaps up.", trap: "No tone mark, yet it is High: the dead-syllable rule does it.", bridge: "Thai ร ↔ Lao ຮ: rák ↔ hak." },
  { id: "v-post", level: 3, tier: "vocab", th: "ไปรษณีย์", lo: "ໄປສະນີ", thRoman: "prai-sà-nii", loRoman: "paisanii", meaning: "post office / mail", accept: ["praisanii", "praisani", "praisanee", "paisanii", "paisani", "postoffice", "post", "mail"], ttsTh: "ไปรษณีย์", ttsLo: "ไปสะนี", tone: ["mid", "low", "mid"],
    mnemonic: "Thai keeps its Sanskrit spelling and silences the last letter with ์. Lao spells what it says.", trap: "Silent killer: ย์ is not pronounced.", bridge: "Thai etymological spelling vs Lao phonetic spelling." },
  // ---------------- Level 4: Dead Endings ----------------
  { id: "f-k", level: 4, tier: "glyph", th: "ก ข ค", lo: "ກ", thRoman: "final -k", loRoman: "final -k", meaning: "-k final", accept: ["k", "-k", "kfinal", "finalk"], ttsTh: "ปาก นก", ttsLo: "ปาก นก", tone: [],
    loop: "As finals these letters lose their aspiration and are not released: just close the throat on -k.", mnemonic: "Every k-family letter ends in the same swallowed -k.", trap: "ข and ค at the end of a word still sound -k, never kh.", bridge: "Lao writes every -k final with ກ." },
  { id: "f-t", level: 4, tier: "glyph", th: "ด ต ส จ ช ท", lo: "ດ", thRoman: "final -t", loRoman: "final -t", meaning: "-t final", accept: ["t", "-t", "tfinal", "finalt"], ttsTh: "มีด รถ", ttsLo: "มีด ลด", tone: [],
    loop: "About 15 Thai letters (ด ต ถ ท ธ จ ช ซ ส ศ ษ ฎ ฏ ฐ ฑ ฒ) all end as an unreleased -t.", mnemonic: "The great collapse: s, ch, j, th and d all stop dead as -t.", trap: "ส at the end is -t, not -s: รส is rót (taste).", bridge: "Lao writes every -t final with ດ: ประเทศ ↔ ປະເທດ." },
  { id: "f-p", level: 4, tier: "glyph", th: "บ ป พ ฟ ภ", lo: "ບ", thRoman: "final -p", loRoman: "final -p", meaning: "-p final", accept: ["p", "-p", "pfinal", "finalp"], ttsTh: "สิบ ภาพ", ttsLo: "สิบ พาบ", tone: [],
    loop: "Close the lips and hold: no puff of air.", mnemonic: "Lips shut like a temple door: -p.", trap: "ฟ at the end is -p, not -f: กอล์ฟ ends in -p.", bridge: "Lao writes every -p final with ບ: ภาพ ↔ ພາບ." },
  { id: "f-n", level: 4, tier: "glyph", th: "น ร ล ญ ณ", lo: "ນ", thRoman: "final -n", loRoman: "final -n", meaning: "-n final", accept: ["n", "-n", "nfinal", "finaln"], ttsTh: "อาหาร", ttsLo: "อาหาน", tone: [],
    loop: "A live ending: the syllable rings on.", mnemonic: "r, l and ny all melt into -n at the end.", trap: "Final ร is -n: อาหาร is aa-hǎan.", bridge: "Lao writes every -n final with ນ: อาหาร ↔ ອາຫານ." },
  { id: "s-paak", level: 4, tier: "syllable", th: "ปาก", lo: "ປາກ", thRoman: "pàak", loRoman: "paak", meaning: "mouth", accept: ["paak", "pak", "mouth"], ttsTh: "ปาก", ttsLo: "ปาก", tone: ["low"], parts: { cls: "mid", live: false, long: true, mark: "none" },
    mnemonic: "Middle class + -k stop = dead = Low.", trap: "Long vowel, but the -k final still kills it." },
  { id: "s-luuk", level: 4, tier: "syllable", th: "ลูก", lo: "ລູກ", thRoman: "lûuk", loRoman: "luk", meaning: "child (offspring) / ball", accept: ["luuk", "luk", "child", "offspring", "ball"], ttsTh: "ลูก", ttsLo: "ลูก", tone: ["falling"], parts: { cls: "low", live: false, long: true, mark: "none" },
    mnemonic: "Low class + dead + long vowel = Falling.", trap: "Compare นก (short, High) with ลูก (long, Falling)." },
  { id: "s-nok", level: 4, tier: "syllable", th: "นก", lo: "ນົກ", thRoman: "nók", loRoman: "nok", meaning: "bird", accept: ["nok", "bird"], ttsTh: "นก", ttsLo: "นก", tone: ["high"], parts: { cls: "low", live: false, long: false, mark: "none" },
    mnemonic: "Low class + dead + short = High: a bird chirps up.", trap: "Thai hides the short o; Lao writes it as ◌ົ.", bridge: "นก ↔ ນົກ: the hidden o law." },
  { id: "s-kap", level: 4, tier: "syllable", th: "กับ", lo: "ກັບ", thRoman: "kàp", loRoman: "kap", meaning: "with / and", accept: ["kap", "gap", "kab", "gab", "with", "and"], ttsTh: "กับ", ttsLo: "กับ", tone: ["low"], parts: { cls: "mid", live: false, long: false, mark: "none" },
    mnemonic: "Middle + dead = Low, short or long.", trap: "◌ั marks a short a before a final consonant." },
  { id: "s-sip", level: 4, tier: "syllable", th: "สิบ", lo: "ສິບ", thRoman: "sìp", loRoman: "sip", meaning: "ten", accept: ["sip", "sib", "ten", "10"], ttsTh: "สิบ", ttsLo: "สิบ", tone: ["low"], parts: { cls: "high", live: false, long: false, mark: "none" },
    mnemonic: "High class + dead = Low. The Naga's dead syllables fall flat.", trap: "High and Middle class give the same tone on dead syllables." },
  { id: "s-miit", level: 4, tier: "syllable", th: "มีด", lo: "ມີດ", thRoman: "mîit", loRoman: "mit", meaning: "knife", accept: ["miit", "mit", "meet", "knife"], ttsTh: "มีด", ttsLo: "มีด", tone: ["falling"], parts: { cls: "low", live: false, long: true, mark: "none" },
    mnemonic: "Low + dead + long = Falling: the knife drops.", trap: "No mark, but the tone is Falling because of the -t stop." },
  { id: "s-phaap", level: 4, tier: "syllable", th: "ภาพ", lo: "ພາບ", thRoman: "phâap", loRoman: "phap", meaning: "picture", accept: ["phaap", "phap", "paap", "picture", "image"], ttsTh: "ภาพ", ttsLo: "พาบ", tone: ["falling"], parts: { cls: "low", live: false, long: true, mark: "none" },
    mnemonic: "ภ (low) + long + -p stop = Falling.", trap: "Final พ sounds -p.", bridge: "Lao writes the -p final with ບ and ภ as ພ." },
  { id: "v-rot", level: 4, tier: "vocab", th: "รถ", lo: "ລົດ", thRoman: "rót", loRoman: "lot", meaning: "car / vehicle", accept: ["rot", "rod", "lot", "car", "vehicle"], ttsTh: "รถ", ttsLo: "ลด", tone: ["high"], parts: { cls: "low", live: false, long: false, mark: "none" },
    mnemonic: "Low + dead short = High: the car zooms.", trap: "Final ถ is -t, not th.", bridge: "Law breaker: ร → ລ here, not ຮ." },
  { id: "v-ahaan", level: 4, tier: "vocab", th: "อาหาร", lo: "ອາຫານ", thRoman: "aa-hǎan", loRoman: "ahaan", meaning: "food", accept: ["aahaan", "ahaan", "ahan", "food"], ttsTh: "อาหาร", ttsLo: "อาหาน", tone: ["mid", "rising"],
    mnemonic: "Food comes with a rising h.", trap: "Final ร is -n.", bridge: "Lao spells the -n with ນ." },
  { id: "v-prathet", level: 4, tier: "vocab", th: "ประเทศ", lo: "ປະເທດ", thRoman: "prà-thêet", loRoman: "pathet", meaning: "country", accept: ["prathet", "prathed", "pathet", "country", "nation"], ttsTh: "ประเทศ", ttsLo: "ปะเทด", tone: ["low", "falling"],
    mnemonic: "ประเทศไทย, ປະເທດລາວ: the country word is shared.", trap: "Final ศ is -t.", bridge: "Lao drops the r cluster and writes -t as ດ." },
  { id: "v-chook", level: 4, tier: "vocab", th: "โชค", lo: "ໂຊກ", thRoman: "chôok", loRoman: "xok", meaning: "luck", accept: ["chok", "chook", "xok", "luck"], ttsTh: "โชค", ttsLo: "โซก", tone: ["falling"], parts: { cls: "low", live: false, long: true, mark: "none" },
    mnemonic: "โชคดี! Good luck falls on you.", trap: "Final ค is -k.", bridge: "ช ↔ ຊ again." },

  // ---------------- Level 5: Vowel Universe ----------------
  { id: "s-te", level: 5, tier: "syllable", th: "เตะ", lo: "ເຕະ", thRoman: "tè", loRoman: "te", meaning: "kick", accept: ["te", "teh", "kick"], ttsTh: "เตะ", ttsLo: "เตะ", tone: ["low"], parts: { cls: "mid", live: false, long: false, mark: "none" },
    mnemonic: "เ◌ะ wraps the consonant: short e, cut off by ะ.", trap: "เ◌ alone is long ee; adding ะ makes it short and dead." },
  { id: "s-kae", level: 5, tier: "syllable", th: "แกะ", lo: "ແກະ", thRoman: "kɛ̀", loRoman: "kae", meaning: "sheep", accept: ["kae", "gae", "ke", "sheep"], ttsTh: "แกะ", ttsLo: "แกะ", tone: ["low"], parts: { cls: "mid", live: false, long: false, mark: "none" },
    mnemonic: "แ◌ะ: open-mouth short ɛ, chopped short.", trap: "แ (ɛ, as in 'bad') vs เ (e, as in 'bed')." },
  { id: "s-to", level: 5, tier: "syllable", th: "โต๊ะ", lo: "ໂຕະ", thRoman: "tó", loRoman: "to", meaning: "table", accept: ["to", "toh", "table"], ttsTh: "โต๊ะ", ttsLo: "โตะ", tone: ["high"], parts: { cls: "mid", live: false, long: false, mark: "tri" },
    mnemonic: "Mai tri on a monk: High. One of the few native words that needs it.", trap: "Mai tri only works on Middle-class consonants.", bridge: "Lao writes ໂຕະ with no mark; its tone rules differ." },
  { id: "s-ngoen", level: 5, tier: "syllable", th: "เงิน", lo: "ເງິນ", thRoman: "ngən", loRoman: "ngoen", meaning: "money / silver", accept: ["ngoen", "ngern", "ngen", "money", "silver"], ttsTh: "เงิน", ttsLo: "เงิน", tone: ["mid"], parts: { cls: "low", live: true, long: true, mark: "none" },
    mnemonic: "เ◌ิ◌ is the 'uh' vowel (ə) with a final. Money hums at Mid.", trap: "เ◌อ when open, เ◌ิ◌ when closed: same vowel, two spellings." },
  { id: "s-suea", level: 5, tier: "syllable", th: "เสือ", lo: "ເສືອ", thRoman: "sʉ̌a", loRoman: "suea", meaning: "tiger", accept: ["suea", "sua", "seua", "tiger"], ttsTh: "เสือ", ttsLo: "เสือ", tone: ["rising"], parts: { cls: "high", live: true, long: true, mark: "none" },
    mnemonic: "เ◌ือ surrounds the consonant on three sides, like a tiger circling.", trap: "เ◌ือ (ʉa) vs เ◌ีย (ia) vs ◌ัว (ua): the three diphthongs." },
  { id: "s-bua", level: 5, tier: "syllable", th: "บัว", lo: "ບົວ", thRoman: "bua", loRoman: "bua", meaning: "lotus", accept: ["bua", "lotus"], ttsTh: "บัว", ttsLo: "บัว", tone: ["mid"], parts: { cls: "mid", live: true, long: true, mark: "none" },
    mnemonic: "The lotus opens: ◌ัว.", trap: "With a final, ◌ัว drops its ◌ั: ขวด (bottle), not ขัวด.", bridge: "Lao writes -ua as ◌ົວ." },
  { id: "s-jam", level: 5, tier: "syllable", th: "จำ", lo: "ຈຳ", thRoman: "jam", loRoman: "cham", meaning: "remember", accept: ["jam", "cham", "remember"], ttsTh: "จำ", ttsLo: "จำ", tone: ["mid"], parts: { cls: "mid", live: true, long: false, mark: "none" },
    mnemonic: "◌ำ packs a short a and an m into one sign: live, so Mid.", trap: "◌ำ is live even though the vowel is short." },
  { id: "s-kai", level: 5, tier: "syllable", th: "ไก่", lo: "ໄກ່", thRoman: "kài", loRoman: "kai", meaning: "chicken", accept: ["kai", "gai", "chicken"], ttsTh: "ไก่", ttsLo: "ไก่", tone: ["low"], parts: { cls: "mid", live: true, long: false, mark: "ek" },
    mnemonic: "The chicken from Level 1's ก, now with its tone mark: Low.", trap: "ไก่ (chicken, low) vs ไข่ (egg, low) vs ใกล้ (near, falling)." },
  { id: "s-luem", level: 5, tier: "syllable", th: "ลืม", lo: "ລືມ", thRoman: "lʉʉm", loRoman: "luem", meaning: "forget", accept: ["luem", "leum", "lum", "forget"], ttsTh: "ลืม", ttsLo: "ลืม", tone: ["mid"], parts: { cls: "low", live: true, long: true, mark: "none" },
    mnemonic: "◌ื is the unrounded ʉʉ: say 'oo' with a smile.", trap: "◌ึ short vs ◌ื long; open ◌ื needs a silent อ (มือ)." },
  { id: "v-dek", level: 5, tier: "vocab", th: "เด็ก", lo: "ເດັກ", thRoman: "dèk", loRoman: "dek", meaning: "child", accept: ["dek", "child", "kid"], ttsTh: "เด็ก", ttsLo: "เด็ก", tone: ["low"], parts: { cls: "mid", live: false, long: false, mark: "none" },
    mnemonic: "The little ◌็ (mai taikhu) shortens the e.", trap: "◌็ is not a tone mark; it only shortens the vowel.", bridge: "Lao uses ◌ັ for the same job: ເດັກ." },
  { id: "v-du", level: 5, tier: "vocab", th: "ดุ", lo: "ດຸ", thRoman: "dù", loRoman: "du", meaning: "fierce / to scold", accept: ["du", "fierce", "scold", "strict"], ttsTh: "ดุ", ttsLo: "ดุ", tone: ["low"], parts: { cls: "mid", live: false, long: false, mark: "none" },
    mnemonic: "Short u, open: dead, so Middle class gives Low.", trap: "ดุ (fierce) vs ดู (look): one foot or two." },

  // ---------------- Level 6: Clusters and Leaders ----------------
  { id: "v-klap", level: 6, tier: "vocab", th: "กลับ", lo: "ກັບ", thRoman: "klàp", loRoman: "kap", meaning: "return / go back", accept: ["klap", "glap", "kap", "return", "goback", "back"], ttsTh: "กลับ", ttsLo: "กับ", tone: ["low"], parts: { cls: "mid", live: false, long: false, mark: "none" },
    mnemonic: "True cluster kl-: both sounds spoken, the first sets the class.", trap: "Bangkok speech often drops the l: kàp.", bridge: "Lao drops the cluster in writing too: ກັບ." },
  { id: "v-khwaa", level: 6, tier: "vocab", th: "ขวา", lo: "ຂວາ", thRoman: "khwǎa", loRoman: "khwa", meaning: "right (side)", accept: ["khwaa", "khwa", "kwa", "right"], ttsTh: "ขวา", ttsLo: "ขวา", tone: ["rising"], parts: { cls: "high", live: true, long: true, mark: "none" },
    mnemonic: "kh + w cluster: ข leads, so High class rises.", trap: "ขวา (right) vs ซ้าย (left)." },
  { id: "v-khwaam", level: 6, tier: "vocab", th: "ความ", lo: "ຄວາມ", thRoman: "khwaam", loRoman: "khwam", meaning: "-ness (makes nouns)", accept: ["khwaam", "khwam", "kwam", "ness", "meaning"], ttsTh: "ความ", ttsLo: "ความ", tone: ["mid"], parts: { cls: "low", live: true, long: true, mark: "none" },
    mnemonic: "ความ turns words into nouns: ความรัก = love (the noun).", trap: "Same kw- cluster as ขวา, but ค is Low class." },
  { id: "v-saai", level: 6, tier: "vocab", th: "ทราย", lo: "ຊາຍ", thRoman: "saai", loRoman: "xai", meaning: "sand", accept: ["saai", "sai", "xai", "sand"], ttsTh: "ทราย", ttsLo: "ซาย", tone: ["mid"], parts: { cls: "low", live: true, long: true, mark: "none" },
    mnemonic: "False cluster: ทร is read s, like ซ. Low class still.", trap: "ทร = s in native words; in loans it can be tr (ทรัมเป็ต).", bridge: "Lao spells it as it sounds: ຊາຍ." },
  { id: "v-saang", level: 6, tier: "vocab", th: "สร้าง", lo: "ສ້າງ", thRoman: "sâang", loRoman: "sang", meaning: "build", accept: ["saang", "sang", "build", "create"], ttsTh: "สร้าง", ttsLo: "ส้าง", tone: ["falling"], parts: { cls: "high", live: true, long: true, mark: "tho" },
    mnemonic: "False cluster สร: the ร is silent. High + Mai Tho = Falling.", trap: "Read สร as s, not sr.", bridge: "Lao drops the silent ร: ສ້າງ." },
  { id: "v-jing", level: 6, tier: "vocab", th: "จริง", lo: "ແທ້", thRoman: "jing", loRoman: "thae", meaning: "true / really", accept: ["jing", "ching", "thae", "true", "really"], ttsTh: "จริง", ttsLo: "แท้", tone: ["mid"], parts: { cls: "mid", live: true, long: false, mark: "none" },
    mnemonic: "False cluster จร: the ร is silent. จริงๆ = really really.", trap: "จร = j; the ร is not spoken.", bridge: "Lao uses a different word: ແທ້." },
  { id: "v-yaak", level: 6, tier: "vocab", th: "อยาก", lo: "ຢາກ", thRoman: "yàak", loRoman: "yak", meaning: "want to", accept: ["yaak", "yak", "want"], ttsTh: "อยาก", ttsLo: "หยาก", tone: ["low"], parts: { cls: "mid", live: false, long: true, mark: "none" },
    mnemonic: "Silent อ leads ย into Middle class: dead → Low.", trap: "Only four words use อ นำ: อย่า อยู่ อย่าง อยาก.", bridge: "Lao has a Middle-class y letter, ຢ, so it needs no silent leader." },
  { id: "v-yuu", level: 6, tier: "vocab", th: "อยู่", lo: "ຢູ່", thRoman: "yùu", loRoman: "yu", meaning: "be at / live (somewhere)", accept: ["yuu", "yu", "beat", "live", "stay"], ttsTh: "อยู่", ttsLo: "หยู่", tone: ["low"], parts: { cls: "mid", live: true, long: true, mark: "ek" },
    mnemonic: "อ leads ย to Middle class; Mai Ek → Low.", trap: "Without the อ, ยู่ would be Low class and Falling.", bridge: "Thai อย ↔ Lao ຢ." },
  { id: "v-talaat", level: 6, tier: "vocab", th: "ตลาด", lo: "ຕະຫຼາດ", thRoman: "tà-làat", loRoman: "talat", meaning: "market", accept: ["talaat", "talat", "dalat", "market"], ttsTh: "ตลาด", ttsLo: "ตะหลาด", tone: ["low", "low"],
    mnemonic: "Leading consonant: ต lends a hidden 'a' and its Middle class to ลาด.", trap: "Not a cluster: tà-làat, two syllables.", bridge: "Lao writes the hidden a (ຕະ) and uses ຫຼ to make the l high." },
  { id: "v-sanaam", level: 6, tier: "vocab", th: "สนาม", lo: "ສະໜາມ", thRoman: "sà-nǎam", loRoman: "sanam", meaning: "field / yard", accept: ["sanaam", "sanam", "field", "yard"], ttsTh: "สนาม", ttsLo: "สะหนาม", tone: ["low", "rising"],
    mnemonic: "High-class ส leads น: นาม rises as if written หนาม.", trap: "The second syllable takes the leader's class.", bridge: "Lao writes it out: ສະ + ໜາມ." },
  { id: "v-khanom", level: 6, tier: "vocab", th: "ขนม", lo: "ເຂົ້າໜົມ", thRoman: "khà-nǒm", loRoman: "khao nom", meaning: "snack / dessert", accept: ["khanom", "kanom", "khaonom", "snack", "dessert", "sweets"], ttsTh: "ขนม", ttsLo: "เข้าหนม", tone: ["low", "rising"],
    mnemonic: "ข leads นม: the sweet rises (khà-nǒm).", trap: "Not ขน + ม: it's khà-nǒm.", bridge: "Lao says ເຂົ້າໜົມ and writes the ໜ explicitly." },
  // ---------------- Level 7: Street Signs and Numbers ----------------
  { id: "n-1", level: 7, tier: "glyph", th: "๑", lo: "໑", thRoman: "nʉ̀ng · 1", loRoman: "neung · 1", meaning: "1 (one)", accept: ["1", "one", "nueng", "neung", "nung"], ttsTh: "หนึ่ง", ttsLo: "หนึ่ง", tone: ["low"],
    mnemonic: "A single curl with a tail: one.", trap: "๑ (1) vs ๗ (7): 7 has a tall stem.", street: "Prices on old shops and temple signs often use Thai digits." },
  { id: "n-2", level: 7, tier: "glyph", th: "๒", lo: "໒", thRoman: "sɔ̌ɔng · 2", loRoman: "song · 2", meaning: "2 (two)", accept: ["2", "two", "song", "sorng"], ttsTh: "สอง", ttsLo: "สอง", tone: ["rising"],
    mnemonic: "๑ with a second hook on top: two.", trap: "๒ (2) vs ๙ (9): 9 has a long tail up.", bridge: "Lao ໒ is a simpler curl." },
  { id: "n-3", level: 7, tier: "glyph", th: "๓", lo: "໓", thRoman: "sǎam · 3", loRoman: "sam · 3", meaning: "3 (three)", accept: ["3", "three", "saam", "sam"], ttsTh: "สาม", ttsLo: "สาม", tone: ["rising"],
    mnemonic: "Three bumps in a row.", trap: "๓ (3) vs ๗ (7)." },
  { id: "n-4", level: 7, tier: "glyph", th: "๔", lo: "໔", thRoman: "sìi · 4", loRoman: "si · 4", meaning: "4 (four)", accept: ["4", "four", "sii", "si", "see"], ttsTh: "สี่", ttsLo: "สี่", tone: ["low"],
    mnemonic: "A loop with a flick, like a 4 tipped onto its side.", trap: "๔ (4) vs ๕ (5): 5 has an extra tail." },
  { id: "n-5", level: 7, tier: "glyph", th: "๕", lo: "໕", thRoman: "hâa · 5", loRoman: "ha · 5", meaning: "5 (five)", accept: ["5", "five", "haa", "ha"], ttsTh: "ห้า", ttsLo: "ห้า", tone: ["falling"],
    mnemonic: "๔ plus a tail: one more.", trap: "555 in Thai chat means 'hahaha' because 5 is hâa." },
  { id: "n-0", level: 7, tier: "glyph", th: "๐", lo: "໐", thRoman: "sǔun · 0", loRoman: "sun · 0", meaning: "0 (zero)", accept: ["0", "zero", "suun", "sun", "soon"], ttsTh: "ศูนย์", ttsLo: "สูน", tone: ["rising"],
    mnemonic: "A plain circle, like ours.", trap: "Spelled ศูนย์ with a silent ย์.", bridge: "Lao ສູນ: no silent letter." },
  { id: "v-baht", level: 7, tier: "vocab", th: "บาท", lo: "ກີບ", thRoman: "bàat", loRoman: "kip", meaning: "baht / kip (currency)", accept: ["baat", "baht", "bat", "kip", "currency", "money"], ttsTh: "บาท", ttsLo: "กีบ", tone: ["low"], parts: { cls: "mid", live: false, long: true, mark: "none" },
    mnemonic: "Middle + dead = Low: prices end on a low note.", trap: "Written after the number: ๘๐ บาท = 80 baht.", bridge: "Different currencies: Thai baht, Lao kip (ກີບ)." },
  { id: "v-exit", level: 7, tier: "vocab", th: "ทางออก", lo: "ທາງອອກ", thRoman: "thaang-ɔ̀ɔk", loRoman: "thang ok", meaning: "exit", accept: ["thaangok", "thangok", "taangok", "thaangawk", "exit", "wayout"], ttsTh: "ทางออก", ttsLo: "ทางออก", tone: ["mid", "low"],
    mnemonic: "ทาง (way) + ออก (out).", trap: "ทางเข้า is the entrance.", bridge: "Same words in Lao: ທາງອອກ." },
  { id: "v-toilet", level: 7, tier: "vocab", th: "ห้องน้ำ", lo: "ຫ້ອງນ້ຳ", thRoman: "hɔ̂ng-náam", loRoman: "hong nam", meaning: "toilet / bathroom", accept: ["hongnaam", "hongnam", "toilet", "bathroom", "restroom"], ttsTh: "ห้องน้ำ", ttsLo: "ห้องน้ำ", tone: ["falling", "high"],
    mnemonic: "ห้อง (room) + น้ำ (water).", trap: "Look for ชาย (men) and หญิง (women) next to it.", bridge: "Identical in Lao: ຫ້ອງນ້ຳ." },
  { id: "v-price", level: 7, tier: "vocab", th: "ราคา", lo: "ລາຄາ", thRoman: "raa-khaa", loRoman: "lakha", meaning: "price", accept: ["raakhaa", "rakha", "raka", "lakha", "price", "cost"], ttsTh: "ราคา", ttsLo: "ลาคา", tone: ["mid", "mid"],
    mnemonic: "Two calm Mid syllables, like a price tag that doesn't move.", trap: "ราคาเท่าไหร่ = how much?", bridge: "Thai ร ↔ Lao ລ in this loanword." },
  { id: "v-open", level: 7, tier: "vocab", th: "เปิด", lo: "ເປີດ", thRoman: "pə̀ət", loRoman: "poet", meaning: "open", accept: ["poet", "perd", "poed", "pert", "open"], ttsTh: "เปิด", ttsLo: "เปีด", tone: ["low"], parts: { cls: "mid", live: false, long: true, mark: "none" },
    mnemonic: "เปิด vs ปิด: the extra เ opens the door.", trap: "เปิด (open) vs ปิด (closed) differ only by the vowel." },
  { id: "v-closed", level: 7, tier: "vocab", th: "ปิด", lo: "ປິດ", thRoman: "pìt", loRoman: "pit", meaning: "closed / shut", accept: ["pit", "pid", "closed", "close", "shut"], ttsTh: "ปิด", ttsLo: "ปิด", tone: ["low"], parts: { cls: "mid", live: false, long: false, mark: "none" },
    mnemonic: "Short and shut: pìt.", trap: "เปิด (open) vs ปิด (closed)." },
  { id: "v-forbid", level: 7, tier: "vocab", th: "ห้าม", lo: "ຫ້າມ", thRoman: "hâam", loRoman: "ham", meaning: "forbidden / do not", accept: ["haam", "ham", "forbidden", "donot", "no", "prohibited"], ttsTh: "ห้าม", ttsLo: "ห้าม", tone: ["falling"], parts: { cls: "high", live: true, long: true, mark: "tho" },
    mnemonic: "High + Mai Tho falls like a barrier: ห้าม!", trap: "ห้าม + verb = no ...ing: ห้ามสูบบุหรี่, no smoking.", bridge: "Same in Lao: ຫ້າມ." },
  // Level 8: Particles and Politeness.
  { id: "p-khrap", level: 8, tier: "vocab", th: "ครับ", lo: "ເຈົ້າ", thRoman: "kráp", loRoman: "jao", meaning: "polite particle (male speaker)", accept: ["khrap", "krap", "khap", "kap", "polite", "politemale", "yes"], ttsTh: "ครับ", ttsLo: "เจ้า", tone: ["high"], parts: { cls: "low", live: false, long: false, mark: "none" },
    mnemonic: "Low class + short dead syllable = High: the River Spirit bows with a bright, clipped kráp.", trap: "Said by men at the end of a sentence; in speech the r often drops: kháp.", bridge: "Lao uses ເຈົ້າ (jao) for both men and women, as a polite yes and at the end of sentences." },
  { id: "p-kha", level: 8, tier: "vocab", th: "ค่ะ", lo: "ເຈົ້າ", thRoman: "khâ", loRoman: "jao", meaning: "polite particle (female speaker, statements)", accept: ["kha", "ka", "polite", "politefemale", "yes"], ttsTh: "ค่ะ", ttsLo: "เจ้า", tone: ["falling"], parts: { cls: "low", live: false, long: false, mark: "ek" },
    mnemonic: "Low class + Mai Ek = Falling: ค่ะ settles the sentence down.", trap: "ค่ะ (falling) closes statements; คะ (high) asks questions. One small mark changes the job.", bridge: "Lao: ເຈົ້າ for everyone." },
  { id: "p-kha-q", level: 8, tier: "vocab", th: "คะ", lo: "ເຈົ້າ", thRoman: "khá", loRoman: "jao", meaning: "polite particle (female speaker, questions)", accept: ["kha", "ka", "polite", "question", "politequestion"], ttsTh: "คะ", ttsLo: "เจ้า", tone: ["high"], parts: { cls: "low", live: false, long: false, mark: "none" },
    mnemonic: "No mark, short and dead, low class = High: the question lifts.", trap: "Writing ค่ะ at the end of a question is a very common mistake, even by Thais in chat.", bridge: "Lao: ເຈົ້າ." },
  { id: "p-na", level: 8, tier: "vocab", th: "นะ", lo: "ເດີ", thRoman: "ná", loRoman: "doe", meaning: "softener (…okay?, …you know)", accept: ["na", "nah", "okay", "ok", "softener"], ttsTh: "นะ", ttsLo: "เดอ", tone: ["high"], parts: { cls: "low", live: false, long: false, mark: "none" },
    mnemonic: "A friendly nudge at the end: ไปนะ, I'm going, okay?", trap: "Not a question word; it softens a statement or request.", bridge: "Lao ເດີ (doe) does the same softening job: ໄປເດີ." },
  { id: "p-mai-q", level: 8, tier: "vocab", th: "ไหม", lo: "ບໍ", thRoman: "mǎi", loRoman: "bo", meaning: "yes/no question particle", accept: ["mai", "mai?", "question", "yesno"], ttsTh: "ไหม", ttsLo: "บ๋อ", tone: ["rising"], parts: { cls: "low", live: true, long: false, mark: "none", hn: true },
    mnemonic: "ห leads ม: the silent ห lifts it into a Rising question.", trap: "ไหม (question), ไม่ (not), ไม้ (wood), ใหม่ (new): four tones, four meanings. In speech ไหม often becomes máy.", bridge: "Lao asks with ບໍ (bo): ແຊບບໍ? Is it tasty?" },
  { id: "p-chai", level: 8, tier: "vocab", th: "ใช่", lo: "ແມ່ນ", thRoman: "châi", loRoman: "maen", meaning: "yes, that's right", accept: ["chai", "yes", "right", "correct"], ttsTh: "ใช่", ttsLo: "แม่น", tone: ["falling"], parts: { cls: "low", live: true, long: false, mark: "ek" },
    mnemonic: "Low class + Mai Ek = Falling: a firm nod.", trap: "Spelled with ใ (mai muan), one of only 20 words that use it.", bridge: "Lao ແມ່ນ (maen) means 'it is / that's right'." },
  { id: "p-mai-chai", level: 8, tier: "vocab", th: "ไม่ใช่", lo: "ບໍ່ແມ່ນ", thRoman: "mâi-châi", loRoman: "bo maen", meaning: "no, that's not right", accept: ["maichai", "no", "notright", "incorrect", "not"], ttsTh: "ไม่ใช่", ttsLo: "บ่อแม่น", tone: ["falling", "falling"],
    mnemonic: "ไม่ (not) + ใช่ (right): two falls in a row.", trap: "Thai has no single word for 'no'; you negate the verb or ใช่.", bridge: "Lao negates with ບໍ່ (bo): ບໍ່ແມ່ນ." },
  { id: "p-sorry", level: 8, tier: "vocab", th: "ขอโทษ", lo: "ຂໍໂທດ", thRoman: "khɔ̌ɔ-thôot", loRoman: "kho thot", meaning: "sorry / excuse me", accept: ["khothot", "khawthot", "kothot", "sorry", "excuseme"], ttsTh: "ขอโทษ", ttsLo: "ขอโทด", tone: ["rising", "falling"],
    mnemonic: "ขอ (ask for) + โทษ (fault): 'I ask about my fault'.", trap: "The final ษ is read as t: thôot.", bridge: "Lao ຂໍໂທດ spells the final with ດ, as it sounds." },
  { id: "p-mai-pen-rai", level: 8, tier: "vocab", th: "ไม่เป็นไร", lo: "ບໍ່ເປັນຫຍັງ", thRoman: "mâi-pen-rai", loRoman: "bo pen nyang", meaning: "never mind / you're welcome", accept: ["maipenrai", "nevermind", "noproblem", "yourewelcome", "welcome"], ttsTh: "ไม่เป็นไร", ttsLo: "บ่อเปนหยัง", tone: ["falling", "mid", "mid"],
    mnemonic: "'It isn't anything': the most Thai phrase there is.", trap: "Answers thanks, apologies and small disasters alike.", bridge: "Lao says ບໍ່ເປັນຫຍັງ ('it isn't what'), with ຫຍັງ for Thai ไร / อะไร." },
  { id: "p-howmuch", level: 8, tier: "vocab", th: "เท่าไร", lo: "ເທົ່າໃດ", thRoman: "thâw-rai", loRoman: "thao dai", meaning: "how much?", accept: ["thaorai", "thaurai", "taorai", "howmuch", "howmany"], ttsTh: "เท่าไร", ttsLo: "เท่าได", tone: ["falling", "mid"],
    mnemonic: "Point at anything in a market and add เท่าไร.", trap: "Often written เท่าไหร่ in chat, which matches how it is said: thâw-rài.", bridge: "Lao ເທົ່າໃດ (thao dai); ໃດ is 'which'." },
  { id: "p-dai", level: 8, tier: "vocab", th: "ได้", lo: "ໄດ້", thRoman: "dâi", loRoman: "dai", meaning: "can / OK / get", accept: ["dai", "can", "ok", "okay", "get"], ttsTh: "ได้", ttsLo: "ได้", tone: ["falling"], parts: { cls: "mid", live: true, long: false, mark: "tho" },
    mnemonic: "Middle + Mai Tho = Falling: ได้! Deal.", trap: "ได้ไหม? Can (you)? ได้ = yes; ไม่ได้ = no.", bridge: "Same word and spelling idea in Lao: ໄດ້." },
  { id: "p-you", level: 8, tier: "vocab", th: "คุณ", lo: "ທ່ານ", thRoman: "khun", loRoman: "than", meaning: "you (polite) / Mr, Ms", accept: ["khun", "kun", "you", "mr", "ms", "mrs"], ttsTh: "คุณ", ttsLo: "ท่าน", tone: ["mid"], parts: { cls: "low", live: true, long: false, mark: "none" },
    mnemonic: "Low class + live = Mid: neutral and polite.", trap: "Also a title before first names: คุณจอช.", bridge: "Lao uses ທ່ານ (than) formally and ເຈົ້າ (jao) everyday." },
  // ---------------- Missing letters, added to the levels they belong in ----------------
  // Level 2: the high/low partners not covered yet.
  { id: "g-tho-thung", level: 2, tier: "glyph", th: "ถ", lo: "ຖ", thRoman: "th · thǎw thǔng", loRoman: "th · tho thong", meaning: "th sound · bag (ถุง)", accept: ["th", "t", "tho", "thor", "thaw", "bag"], ttsTh: "ถอ ถุง", ttsLo: "ถอ ถง", cls: "high", tone: ["rising"],
    loop: "Like ก with a loop at its bottom-left foot. Start at the foot loop, climb the left wall, arch over and drop the right leg.", mnemonic: "A Sky Naga with a bag (ถุง) tied to its foot. High class, so its name rises.", street: "Street fonts shrink the foot loop to a hook, but it is still what separates ถ from ก.", trap: "ถ vs ก: only ถ has the foot loop. ถ (high) and ท (low) both say th.", bridge: "Lao ຖ, also high class." },
  { id: "g-fo-fa", level: 2, tier: "glyph", th: "ฝ", lo: "ຝ", thRoman: "f · fǎw fǎa", loRoman: "f · fo fon", meaning: "f sound · lid (ฝา)", accept: ["f", "fo", "for", "faw", "lid"], ttsTh: "ฝอ ฝา", ttsLo: "ฝอ ฝน", cls: "high", tone: ["rising"],
    loop: "The body of ผ plus a tall tail on the right. Start at the head loop.", mnemonic: "ผ grows a tall antenna to hold up the lid (ฝา).", street: "The tall right tail survives in every street font.", trap: "ฝ vs ฟ: both have the tall tail. ฝ has the low inner peak of ผ, ฟ the full-height peak of พ.", bridge: "Lao ຝ, high class: ຝົນ (rain)." },
  { id: "g-so-so", level: 2, tier: "glyph", th: "ซ", lo: "ຊ", thRoman: "s · saw sôo", loRoman: "s · so sang", meaning: "s sound · chain (โซ่)", accept: ["s", "so", "sor", "saw", "chain"], ttsTh: "ซอ โซ่", ttsLo: "ซอ ซ้าง", cls: "low", tone: ["mid"],
    loop: "ช with a second notch on the left shoulder. Start at the head loop.", mnemonic: "A River Spirit drags a chain (โซ่): the low-class s, partner of high ส.", street: "Notches on both shoulders mark ซ.", trap: "ซ vs ช: ซ has notches on both shoulders. ซ (low) and ส (high) share the s sound but not the tone rules.", bridge: "Lao ຊ covers both Thai ช and ซ, and is said s in Vientiane." },
  { id: "g-ho-nokhuuk", level: 2, tier: "glyph", th: "ฮ", lo: "ຮ", thRoman: "h · haw nók-hûuk", loRoman: "h · ho huean", meaning: "h sound · owl (นกฮูก)", accept: ["h", "ho", "hor", "haw", "owl"], ttsTh: "ฮอ นกฮูก", ttsLo: "ฮอ เฮือน", cls: "low", tone: ["mid"],
    loop: "Like อ with a notch in the top right. Start at the head loop inside.", mnemonic: "The owl (นกฮูก) is the River Spirits' h: low class, partner of high ห.", street: "The notch at the top is what separates ฮ from อ.", trap: "ฮ vs อ: look for the notch. ห (high) also leads other letters; ฮ never does.", bridge: "Lao ຮ is far more common: native Thai ร often becomes ຮ (รัก → ຮັກ)." },
  { id: "g-tho-thahaan", level: 2, tier: "glyph", th: "ท", lo: "ທ", thRoman: "th · thaw thá-hǎan", loRoman: "th · tho thung", meaning: "th sound · soldier (ทหาร)", accept: ["th", "t", "tho", "thor", "thaw", "soldier"], ttsTh: "ทอ ทหาร", ttsLo: "ทอ ทุง", cls: "low", tone: ["mid"],
    loop: "Head loop top-left, down the left wall, up to a notch in the middle, down again and up the right wall.", mnemonic: "A soldier (ทหาร) of the River Spirits: the low-class th, partner of high ถ.", street: "The middle notch is the key; without it the letter reads as ห.", trap: "ท vs ห: ห's right side flicks out at the bottom; ท's middle dips. ท (low) and ถ (high) both say th.", bridge: "Lao ທ: ທາງ (way)." },
  { id: "g-fo-fan", level: 2, tier: "glyph", th: "ฟ", lo: "ຟ", thRoman: "f · faw fan", loRoman: "f · fo fai", meaning: "f sound · tooth (ฟัน)", accept: ["f", "fo", "for", "faw", "tooth", "teeth"], ttsTh: "ฟอ ฟัน", ttsLo: "ฟอ ไฟ", cls: "low", tone: ["mid"],
    loop: "The body of พ plus a tall tail on the right. Start at the head loop.", mnemonic: "พ grows a tall tooth (ฟัน): the low-class f.", street: "The tall right tail survives in street fonts.", trap: "ฟ vs ฝ: ฟ has the full-height inner peak of พ; ฝ has the low peak of ผ.", bridge: "Lao ຟ: ໄຟ (fire)." },
  // Level 3: the sonorants, nearly identical across the Mekong.
  { id: "g-ngo", level: 3, tier: "glyph", th: "ง", lo: "ງ", thRoman: "ng · ngaw nguu", loRoman: "ng · ngo ngua", meaning: "ng sound · snake (งู)", accept: ["ng", "ngo", "ngor", "ngaw", "snake"], ttsTh: "งอ งู", ttsLo: "งอ งัว", cls: "low", tone: ["mid"],
    loop: "Start at the small head loop at the bottom left and sweep up and round to the right.", mnemonic: "A coiled snake (งู) ready to strike.", street: "Street fonts reduce it to a single hook.", trap: "ง vs จ: จ curls back over its own body; ง does not. ng can start a word: งู (nguu).", bridge: "Lao ງ looks almost the same: ງູ (snake), ງົວ (cow)." },
  { id: "g-yo", level: 3, tier: "glyph", th: "ย", lo: "ຍ", thRoman: "y · yaw yák", loRoman: "ny · nyo nyung", meaning: "y sound · giant (ยักษ์)", accept: ["y", "yo", "yor", "yaw", "giant"], ttsTh: "ยอ ยักษ์", ttsLo: "ยอ ยุง", cls: "low", tone: ["mid"],
    loop: "Head loop top-left, down the left wall, round the bottom and up the right wall, finishing with a small curl on top.", mnemonic: "A giant (ยักษ์) guarding the temple gate.", street: "Look for the little curl at the top right.", trap: "ย vs บ: บ's right wall goes straight up with no curl. ย also writes vowels: เ◌ีย, ◌ัย.", bridge: "Lao ຍ is nasal ny (ຍຸງ, mosquito) and stands for both Thai ย and ญ; plain y in Lao is ຢ." },
  { id: "g-wo", level: 3, tier: "glyph", th: "ว", lo: "ວ", thRoman: "w · waw wɛ̌ɛn", loRoman: "w · wo wi", meaning: "w sound · ring (แหวน)", accept: ["w", "wo", "wor", "waw", "ring"], ttsTh: "วอ แหวน", ttsLo: "วอ วี", cls: "low", tone: ["mid"],
    loop: "One hooked stroke: start at the head loop at the lower right and curve up and over to the left.", mnemonic: "A ring (แหวน) slipping off a finger.", street: "Loopless ว is a plain hook, easy to misread as ร.", trap: "ว vs ร: ร has a notch on its top left; ว is smooth. ว also writes the vowel ◌ัว and the final -w (ขาว).", bridge: "Lao ວ does the same three jobs: consonant, vowel ◌ົວ, final -w." },
  { id: "g-yo-ying", level: 3, tier: "glyph", th: "ญ", lo: "ຍ", thRoman: "y · yaw yǐng", loRoman: "ny · nyo nyung", meaning: "y sound · woman (หญิง)", accept: ["y", "yo", "yor", "yaw", "woman"], ttsTh: "ญอ หญิง", ttsLo: "ยอ ยุง", cls: "low", tone: ["mid"],
    loop: "Like ย with an extra tail tucked underneath. Start at the head loop.", mnemonic: "A woman (หญิง) with a long skirt trailing below.", street: "Seen in ใหญ่ (big) and ผู้หญิง (women) on every toilet door.", trap: "ญ vs ย: only ญ has the tail underneath. As a final it says -n.", bridge: "Lao ຍ (ny) covers both ย and ญ: ໃຫຍ່ (big)." },
  // Level 4: Sanskrit letters that end so many words in -t or -s.
  { id: "g-so-sala", level: 4, tier: "glyph", th: "ศ", lo: "ສ", thRoman: "s · sǎw sǎa-laa", loRoman: "s · so suea", meaning: "s sound · pavilion (ศาลา)", accept: ["s", "so", "sor", "saw", "pavilion"], ttsTh: "ศอ ศาลา", ttsLo: "สอ เสือ", cls: "high", tone: ["rising"],
    loop: "Start at the head loop and finish with the small flag on the right shoulder.", mnemonic: "A pavilion (ศาลา) flying a little flag.", street: "The flag on the right shoulder is the tell.", trap: "ศ, ษ and ส all say s and are all high class. As finals ศ and ษ say -t: ประเทศ (prà-thêet).", bridge: "Lao merged all three into ສ: ປະເທດ." },
  { id: "g-so-ruesi", level: 4, tier: "glyph", th: "ษ", lo: "ສ", thRoman: "s · sǎw rʉʉ-sǐi", loRoman: "s · so suea", meaning: "s sound · hermit (ฤๅษี)", accept: ["s", "so", "sor", "saw", "hermit"], ttsTh: "สอ ฤๅษี", ttsLo: "สอ เสือ", cls: "high", tone: ["rising"],
    loop: "Start at the head loop; learn it by its silhouette beside ศ and ส.", mnemonic: "A hermit (ฤๅษี) meditating in Sanskrit words such as ภาษา (language).", street: "Mostly met in formal words: ภาษา, ษ in กษัตริย์ (king).", trap: "Final ษ says -t: โทษ (thôot).", bridge: "Lao writes ສ: ພາສາ." },
  { id: "g-tho-thong", level: 4, tier: "glyph", th: "ธ", lo: "ທ", thRoman: "th · thaw thoŋ", loRoman: "th · tho thung", meaning: "th sound · flag (ธง)", accept: ["th", "t", "tho", "thor", "thaw", "flag"], ttsTh: "ธอ ธง", ttsLo: "ทอ ทุง", cls: "low", tone: ["mid"],
    loop: "Start at the head loop; the small bump at the top left is the flag on its pole.", mnemonic: "A flag (ธง) on a pole.", street: "Keep an eye on the top-left bump; without it the letter reads like ร.", trap: "Final ธ says -t: พุทธ (phút). ธ, ท and ฑ, ฒ are all low-class th.", bridge: "Lao writes ທ: ທຸງ (flag)." },
  { id: "g-cho-ching", level: 4, tier: "glyph", th: "ฉ", lo: "ສ", thRoman: "ch · chǎw chìng", loRoman: "s · so suea", meaning: "ch sound · cymbals (ฉิ่ง)", accept: ["ch", "cho", "chor", "chaw", "cymbals"], ttsTh: "ฉอ ฉิ่ง", ttsLo: "สอ เสือ", cls: "high", tone: ["rising"],
    loop: "Curl like จ from the head loop, then add the small tail at the bottom right.", mnemonic: "Cymbals (ฉิ่ง) crash high: the high-class ch, partner of low ช.", street: "The extra tail is what separates ฉ from จ.", trap: "ฉ vs จ: ฉ has the tail. ฉ (high) and ช (low) both say ch.", bridge: "Lao has no ฉ; those Thai words use ສ or ຊ in Lao." },
  { id: "g-pho-samphao", level: 4, tier: "glyph", th: "ภ", lo: "ພ", thRoman: "ph · phaw sǎm-phao", loRoman: "ph · pho phu", meaning: "ph sound · junk boat (สำเภา)", accept: ["ph", "p", "pho", "phor", "phaw", "boat", "junk"], ttsTh: "ภอ สำเภา", ttsLo: "พอ พู", cls: "low", tone: ["mid"],
    loop: "Like ถ but with the foot loop on the right. Start at the head loop.", mnemonic: "A junk boat (สำเภา) with its anchor hanging on the right.", street: "In ภาษา (language) and ภาพ (picture).", trap: "ภ vs ถ: the loop at the foot is on opposite sides. As a final ภ says -p.", bridge: "Lao writes ພ: ພາສາ." },
  { id: "g-no-nen", level: 4, tier: "glyph", th: "ณ", lo: "ນ", thRoman: "n · naw neen", loRoman: "n · no nok", meaning: "n sound · novice monk (เณร)", accept: ["n", "no", "nor", "naw", "novice"], ttsTh: "ณอ เณร", ttsLo: "นอ นก", cls: "low", tone: ["mid"],
    loop: "Start at the head loop; the extra loop on the right is the novice's robe.", mnemonic: "A novice monk (เณร), as in คุณ.", street: "Mostly in Sanskrit loans and in คุณ.", trap: "Final ณ says -n: คุณ (khun).", bridge: "Lao writes ນ: ຄຸນ." },
  // Level 5: the vowel patterns that were missing.
  { id: "s-lung", level: 5, tier: "syllable", th: "ลุง", lo: "ລຸງ", thRoman: "luŋ", loRoman: "lung", meaning: "uncle (parent's older brother)", accept: ["lung", "loong", "uncle"], ttsTh: "ลุง", ttsLo: "ลุง", tone: ["mid"], parts: { cls: "low", live: true, long: false, mark: "none" },
    mnemonic: "◌ุ hangs below the letter: a short u.", trap: "◌ุ (short u) vs ◌ู (long uu): ◌ู has the extra tail." },
  { id: "s-thueng", level: 5, tier: "syllable", th: "ถึง", lo: "ເຖິງ", thRoman: "thʉ̌ŋ", loRoman: "thueng", meaning: "arrive / reach", accept: ["thueng", "thung", "tueng", "teung", "arrive", "reach"], ttsTh: "ถึง", ttsLo: "ถึง", tone: ["rising"], parts: { cls: "high", live: true, long: false, mark: "none" },
    mnemonic: "◌ึ is ◌ิ with a tail: short ue, an unrounded u.", trap: "◌ึ (short) vs ◌ื (long, with two ticks).", bridge: "Lao writes this vowel ເ◌ິ: ເຖິງ." },
  { id: "s-rian", level: 5, tier: "syllable", th: "เรียน", lo: "ຮຽນ", thRoman: "rian", loRoman: "hian", meaning: "study / learn", accept: ["rian", "rien", "lian", "study", "learn"], ttsTh: "เรียน", ttsLo: "เฮียน", tone: ["mid"], parts: { cls: "low", live: true, long: true, mark: "none" },
    mnemonic: "เ◌ีย wraps three ways: in front, on top and behind.", trap: "The ย here belongs to the vowel; there is no y sound.", bridge: "Lao squeezes เ◌ีย into ◌ຽ, and Thai ร becomes ຮ: ຮຽນ." },
  { id: "s-khao", level: 5, tier: "syllable", th: "เขา", lo: "ເຂົາ", thRoman: "khǎw", loRoman: "khao", meaning: "he / she / they (also: horn)", accept: ["khao", "kao", "khaw", "he", "she", "they", "horn"], ttsTh: "เขา", ttsLo: "เขา", tone: ["rising"], parts: { cls: "high", live: true, long: false, mark: "none" },
    mnemonic: "เ◌า: front and behind together make -ao.", trap: "เขา (he, rising) vs เข้า (enter, falling): one mark apart.", bridge: "Lao ເຂົາ adds ◌ົ inside the frame." },
  { id: "s-kho", level: 5, tier: "syllable", th: "ขอ", lo: "ຂໍ", thRoman: "khɔ̌ɔ", loRoman: "kho", meaning: "ask for / may I", accept: ["kho", "khaw", "kor", "ko", "askfor", "please", "mayi"], ttsTh: "ขอ", ttsLo: "ขอ", tone: ["rising"], parts: { cls: "high", live: true, long: true, mark: "none" },
    mnemonic: "The open long ɔɔ vowel is written with อ after the consonant.", trap: "Here อ is a vowel, not a consonant.", bridge: "Lao writes this vowel as ◌ໍ on top: ຂໍ." },
  { id: "s-the", level: 5, tier: "syllable", th: "เท", lo: "ເທ", thRoman: "thee", loRoman: "the", meaning: "pour", accept: ["thee", "the", "tay", "pour"], ttsTh: "เท", ttsLo: "เท", tone: ["mid"], parts: { cls: "low", live: true, long: true, mark: "none" },
    mnemonic: "เ◌ on its own is long ee.", trap: "Add ะ and it turns short and dead: เตะ." },
  { id: "s-mae", level: 5, tier: "syllable", th: "แม่", lo: "ແມ່", thRoman: "mɛ̂ɛ", loRoman: "mae", meaning: "mother", accept: ["mae", "maer", "mother", "mom"], ttsTh: "แม่", ttsLo: "แม่", tone: ["falling"], parts: { cls: "low", live: true, long: true, mark: "ek" },
    mnemonic: "แ◌ is long ɛɛ; low class with Mai Ek falls.", trap: "แม่ (mother, falling) vs แม้ (even if, high)." },
  { id: "s-too", level: 5, tier: "syllable", th: "โต", lo: "ໂຕ", thRoman: "too", loRoman: "to", meaning: "big / grow up", accept: ["too", "to", "toh", "big", "grow"], ttsTh: "โต", ttsLo: "โต", tone: ["mid"], parts: { cls: "mid", live: true, long: true, mark: "none" },
    mnemonic: "โ◌ is long oo.", trap: "Add ะ for the short version: โต๊ะ.", bridge: "Lao ໂຕ is spelled the same but means 'body / self' and counts animals." },
  // Level 7: the rest of the digits.
  { id: "n-6", level: 7, tier: "glyph", th: "๖", lo: "໖", thRoman: "hòk · 6", loRoman: "hok · 6", meaning: "6 (six)", accept: ["6", "six", "hok"], ttsTh: "หก", ttsLo: "หก", tone: ["low"],
    mnemonic: "A curl with a tail kicked out to the left.", trap: "๖ (6) vs ๑ (1): the tail goes the other way.", street: "On menus: ๖๐ บาท." },
  { id: "n-7", level: 7, tier: "glyph", th: "๗", lo: "໗", thRoman: "jèt · 7", loRoman: "chet · 7", meaning: "7 (seven)", accept: ["7", "seven", "jet", "chet"], ttsTh: "เจ็ด", ttsLo: "เจ็ด", tone: ["low"],
    mnemonic: "๑ with a tall stem: 7 stands up.", trap: "๗ (7) vs ๑ (1): only 7 has the tall stem." },
  { id: "n-8", level: 7, tier: "glyph", th: "๘", lo: "໘", thRoman: "pɛ̀ɛt · 8", loRoman: "paet · 8", meaning: "8 (eight)", accept: ["8", "eight", "paet", "pet"], ttsTh: "แปด", ttsLo: "แปด", tone: ["low"],
    mnemonic: "A loop with a raised flag, like a fancy 8.", trap: "๘ (8) vs ๙ (9): 9's tail swings over the top.", street: "On menus: ๘๐ บาท." },
  { id: "n-9", level: 7, tier: "glyph", th: "๙", lo: "໙", thRoman: "kâw · 9", loRoman: "kao · 9", meaning: "9 (nine)", accept: ["9", "nine", "kao", "gao"], ttsTh: "เก้า", ttsLo: "เก้า", tone: ["falling"],
    mnemonic: "Nine is the lucky number (เก้า sounds like ก้าว, step forward).", trap: "๙ (9) vs ๘ (8): watch the tail over the top." },
  // Level 9: Royal and Rare Letters.
  { id: "g-kho-rakhang", level: 9, tier: "glyph", th: "ฆ", lo: "ຄ", thRoman: "kh · khaw rá-khaŋ", loRoman: "kh · kho khuai", meaning: "kh sound · temple bell (ระฆัง)", accept: ["kh", "k", "kho", "khor", "khaw", "bell"], ttsTh: "ฆอ ระฆัง", ttsLo: "คอ ควาย", cls: "low", tone: ["mid"],
    loop: "Start at the head loop; the notched top sets it apart from ม and ฃ.", mnemonic: "A temple bell (ระฆัง) for royal and religious words.", street: "Rare on shop signs, common in temple names.", trap: "Same kh sound and low class as ค; only the spelling differs.", bridge: "Lao writes ຄ." },
  { id: "g-tho-than", level: 9, tier: "glyph", th: "ฐ", lo: "ຖ", thRoman: "th · thǎw thǎan", loRoman: "th · tho thong", meaning: "th sound · pedestal (ฐาน)", accept: ["th", "t", "tho", "thor", "thaw", "pedestal", "base"], ttsTh: "ฐอ ฐาน", ttsLo: "ถอ ถง", cls: "high", tone: ["rising"],
    loop: "Start at the head loop; the separate tail underneath is its pedestal.", mnemonic: "A statue on its pedestal (ฐาน).", street: "Look for the detached tail below the body.", trap: "Same th sound and high class as ถ.", bridge: "Lao writes ຖ." },
  { id: "g-tho-montho", level: 9, tier: "glyph", th: "ฑ", lo: "ທ", thRoman: "th / d · thaw mon-thoo", loRoman: "th · tho thung", meaning: "th (sometimes d) · Montho, a queen in the Ramakien", accept: ["th", "d", "tho", "thor", "thaw", "montho"], ttsTh: "ฑอ มณโฑ", ttsLo: "ทอ ทุง", cls: "low", tone: ["mid"],
    loop: "Start at the head loop; its double-humped top is the queen's crown.", mnemonic: "Queen Montho of the Ramakien.", street: "Mostly in learned words: บัณฑิต (graduate).", trap: "In some words it says d: บัณฑิต (ban-dìt).", bridge: "Lao writes ທ or ດ." },
  { id: "g-tho-phuthao", level: 9, tier: "glyph", th: "ฒ", lo: "ທ", thRoman: "th · thaw phûu-thâw", loRoman: "th · tho thung", meaning: "th sound · elder (ผู้เฒ่า)", accept: ["th", "t", "tho", "thor", "thaw", "elder", "oldman"], ttsTh: "ฒอ ผู้เฒ่า", ttsLo: "ทอ ทุง", cls: "low", tone: ["mid"],
    loop: "Start at the head loop; the wide, bent body is the old man's back.", mnemonic: "An old man (ผู้เฒ่า) with a bent back.", street: "Seen in เฒ่า and วัฒนธรรม (culture).", trap: "Low-class th, like ท and ธ.", bridge: "Lao writes ທ: ວັດທະນະທຳ." },
  { id: "g-do-chada", level: 9, tier: "glyph", th: "ฎ", lo: "ດ", thRoman: "d · daw chá-daa", loRoman: "d · do dek", meaning: "d sound · headdress (ชฎา)", accept: ["d", "do", "dor", "daw", "headdress"], ttsTh: "ฎอ ชฎา", ttsLo: "ดอ เด็ก", cls: "mid", tone: ["mid"],
    loop: "Start at the head loop; finish with the curled tail under the body.", mnemonic: "A dancer's tall headdress (ชฎา).", street: "Found in กฎ (rule) and กฎหมาย (law).", trap: "ฎ (d) and ฏ (t) differ only in the tail underneath.", bridge: "Lao writes ດ." },
  { id: "g-to-patak", level: 9, tier: "glyph", th: "ฏ", lo: "ຕ", thRoman: "t · taw pà-tàk", loRoman: "t · to ta", meaning: "t sound · goad (ปฏัก)", accept: ["t", "to", "tor", "taw", "goad"], ttsTh: "ฏอ ปฏัก", ttsLo: "ตอ ตา", cls: "mid", tone: ["mid"],
    loop: "Start at the head loop; the tail underneath cuts back like a goad.", mnemonic: "A cattle goad (ปฏัก) with a hooked point.", street: "Found in ปฏิทิน (calendar).", trap: "ฏ (t) and ฎ (d) differ only in the tail underneath.", bridge: "Lao writes ຕ." },
  { id: "g-cho-choe", level: 9, tier: "glyph", th: "ฌ", lo: "ຊ", thRoman: "ch · chaw chəə", loRoman: "s · so sang", meaning: "ch sound · tree (เฌอ)", accept: ["ch", "cho", "chor", "chaw", "tree"], ttsTh: "ฌอ เฌอ", ttsLo: "ซอ ซ้าง", cls: "low", tone: ["mid"],
    loop: "Start at the head loop; the long, branching body is the tree.", mnemonic: "A tree (เฌอ). The rarest letter you will still meet, in ฌาน (meditation).", street: "Almost never on signs.", trap: "Same ch sound and low class as ช.", bridge: "Lao writes ຊ." },
  { id: "g-lo-chula", level: 9, tier: "glyph", th: "ฬ", lo: "ລ", thRoman: "l · law chù-laa", loRoman: "l · lo ling", meaning: "l sound · star-shaped kite (จุฬา)", accept: ["l", "lo", "lor", "law", "kite"], ttsTh: "ฬอ จุฬา", ttsLo: "ลอ ลิง", cls: "low", tone: ["mid"],
    loop: "Start at the head loop; the extra flourish on the right is the kite's tail.", mnemonic: "A star kite (จุฬา) over Sanam Luang.", street: "In กีฬา (sport), on every stadium.", trap: "As a final it says -n: วาฬ (whale) is waan.", bridge: "Lao writes ລ: ກິລາ." },
  { id: "sym-yamok", level: 9, tier: "glyph", th: "ๆ", lo: "ໆ", thRoman: "repeat · mái yá-mók", loRoman: "repeat · mai ya mok", meaning: "repeat the word before (ไม้ยมก)", accept: ["repeat", "yamok", "maiyamok", "again", "twice", "double"], ttsTh: "เด็กเด็ก", ttsLo: "เด็กเด็ก", tone: [],
    mnemonic: "Say the word twice: เด็ก ๆ = dèk-dèk (children).", trap: "Repeats the whole word, not just the last letter.", bridge: "Lao uses the same mark: ໆ." },
  { id: "sym-paiyannoi", level: 9, tier: "glyph", th: "ฯ", lo: "ຯ", thRoman: "abbreviation · pai-yaan-nɔ́ɔi", loRoman: "abbreviation", meaning: "abbreviation mark (ไปยาลน้อย)", accept: ["abbreviation", "abbr", "short", "etc", "paiyannoi"], ttsTh: "กรุงเทพ", ttsLo: "กรุงเทพ", tone: [],
    mnemonic: "Like '…': กรุงเทพฯ is the short form of Bangkok's very long official name.", trap: "Read only the part before it; don't pronounce the mark.", bridge: "Lao has ຯ but rarely uses it." },
  { id: "v-ruedu", level: 9, tier: "vocab", th: "ฤดู", lo: "ລະດູ", thRoman: "rʉ́-duu", loRoman: "la du", meaning: "season", accept: ["ruedu", "rudu", "reudu", "season"], ttsTh: "ฤดู", ttsLo: "ละดู", tone: ["high", "mid"],
    mnemonic: "ฤ is a Sanskrit vowel-letter, read rʉ́ here (ri or rəə in other words).", trap: "ฤ is not ร: it carries its own vowel.", bridge: "Lao spells it out with ລ: ລະດູ." },
];

// Each course has its own colour world (see the roadmap's course designs).
const LEVELS = [
  { n: 1, title: "The Golden Monks", sub: "Middle class · first syllables", accent: "#F5A524", bg: "linear-gradient(160deg, #2a1d0a, transparent 70%)" },
  { n: 2, title: "Sky Nagas vs River Spirits", sub: "High vs Low class · tone marks", accent: "#9FE7FF", bg: "linear-gradient(180deg, #0b2a3a99 0%, #0b2a3a55 48%, #16113a77 52%, #0d0a2455 100%)" },
  { n: 3, title: "The Mekong Bridge", sub: "ห นำ · Thai ↔ Lao cognates", accent: "#7FD1B0", bg: "radial-gradient(ellipse at 20% 100%, #3b6b5a44, transparent 60%), linear-gradient(160deg, #1d2a24, transparent 70%)" },
  { n: 4, title: "Dead Endings", sub: "Final consonants · dead syllables", accent: "#FF8A6E", bg: "linear-gradient(160deg, #2a0f12, transparent 70%)" },
  { n: 5, title: "Vowel Universe", sub: "Short, long and wrap-around vowels", accent: "#FFD166", bg: "radial-gradient(circle at 80% 30%, #FFD16618, transparent 55%), linear-gradient(160deg, #141a2e, transparent 70%)" },
  { n: 6, title: "Clusters and Leaders", sub: "True and false clusters · leading consonants", accent: "#5EEAD4", bg: "linear-gradient(160deg, #10222a, transparent 70%)" },
  { n: 7, title: "Street Signs and Numbers", sub: "Digits, prices and the words on every sign", accent: "#FFB86B", bg: "linear-gradient(160deg, #22222a, transparent 70%)" },
  { n: 8, title: "Particles and Politeness", sub: "ครับ, ค่ะ, นะ, ไหม and the phrases that carry them", accent: "#F472B6", bg: "linear-gradient(160deg, #3a1630, transparent 70%)" },
  { n: 9, title: "Royal and Rare Letters", sub: "Pali and Sanskrit letters, ๆ, ฯ and ฤ", accent: "#C4B5FD", bg: "linear-gradient(160deg, #241a3a, transparent 70%)" },
];

/* ---------------------------------------------------------------------------
 * SRS
 * ------------------------------------------------------------------------- */
const SRS_STAGES = [
  { name: "Locked", alias: "Queue", color: "#475569" },
  { name: "Lotus Seed", alias: "Apprentice", color: "#EC4899" },
  { name: "Novice Monk", alias: "Guru", color: "#9333EA" },
  { name: "Naga Adept", alias: "Master", color: "#3B82F6" },
  { name: "Temple Guardian", alias: "Enlightened", color: "#06B6D4" },
  { name: "Golden Nirvana", alias: "Burned", color: "#F59E0B" },
];
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

/* ---------------------------------------------------------------------------
 * FSRS-4.5 memory model. Each item keeps two memory tracks, "read" (reading or
 * meaning) and "second" (tone or class), because learners forget tones first.
 * The item is due when its weakest track is predicted to drop to 90% recall.
 * Ratings: 1 = Again (wrong), 2 = Hard (right but guessed), 3 = Good.
 * ------------------------------------------------------------------------- */
const FSRS_W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const FSRS_DECAY = -0.5;
const FSRS_FACTOR = 19 / 81;
const TARGET_RETENTION = 0.9;
const BURN_STABILITY_DAYS = 120;
const LEECH_LAPSES = 4;

const clampD = (d) => Math.min(10, Math.max(1, d));
const fsrsRetrievability = (elapsedDays, S) => (1 + (FSRS_FACTOR * elapsedDays) / S) ** FSRS_DECAY;
const fsrsInterval = (S, r = TARGET_RETENTION) => (S / FSRS_FACTOR) * (r ** (1 / FSRS_DECAY) - 1);
const fsrsInitD = (g) => clampD(FSRS_W[4] - (g - 3) * FSRS_W[5]);

function fsrsUpdate(track, g, now = Date.now()) {
  if (!track || !track.S) return { S: FSRS_W[g - 1], D: fsrsInitD(g), last: now, lapses: g === 1 ? 1 : 0 };
  const { S, D } = track;
  const elapsed = Math.max(0, (now - track.last) / DAY);
  const R = fsrsRetrievability(elapsed, S);
  const nextD = clampD(FSRS_W[7] * fsrsInitD(3) + (1 - FSRS_W[7]) * (D - FSRS_W[6] * (g - 3)));
  let nextS;
  if (g === 1) {
    nextS = Math.min(S, FSRS_W[11] * D ** -FSRS_W[12] * ((S + 1) ** FSRS_W[13] - 1) * Math.exp(FSRS_W[14] * (1 - R)));
  } else {
    const hard = g === 2 ? FSRS_W[15] : 1;
    nextS = S * (Math.exp(FSRS_W[8]) * (11 - D) * S ** -FSRS_W[9] * (Math.exp(FSRS_W[10] * (1 - R)) - 1) * hard + 1);
  }
  return { S: Math.max(0.05, nextS), D: nextD, last: now, lapses: (track.lapses || 0) + (g === 1 ? 1 : 0) };
}

/** Map memory stability onto the six named stages shown in the Shrine. */
function stageFromStability(S) {
  if (S >= BURN_STABILITY_DAYS) return 5;
  if (S >= 30) return 4;
  if (S >= 7) return 3;
  if (S >= 1) return 2;
  return 1;
}

function scheduleItem(cur, ratings, now = Date.now()) {
  const fsrs = { ...(cur.fsrs || {}) };
  Object.entries(ratings).forEach(([track, g]) => { if (g) fsrs[track] = fsrsUpdate(fsrs[track], g, now); });
  const tracks = Object.values(fsrs);
  const weakest = Math.min(...tracks.map((t) => t.S));
  const stage = stageFromStability(weakest);
  // A lapse sends the item back for a same-session relearn after 10 minutes.
  const relearn = Object.values(ratings).includes(1);
  const next = stage >= 5 ? Infinity : relearn ? now + 10 * 60 * 1000 : Math.min(...tracks.map((t) => t.last + fsrsInterval(t.S) * DAY));
  return { ...cur, fsrs, stage, next };
}

const lapsesOf = (s) => (s?.fsrs ? Object.values(s.fsrs).reduce((n, t) => n + (t.lapses || 0), 0) : 0);
const isLeech = (s) => !!s && s.stage >= 1 && s.stage < 5 && lapsesOf(s) >= LEECH_LAPSES && !s.leechCleared;

const todayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function normalizeAnswer(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ɛ]/g, "e")
    .replace(/[ʉ]/g, "ue")
    .replace(/[^a-z]/g, "");
}

function isCorrect(item, input) {
  const n = normalizeAnswer(input);
  if (!n) return false;
  const pool = [...item.accept, item.thRoman, item.loRoman, ...item.meaning.split(/[\/·,()]/)];
  return pool.some((a) => normalizeAnswer(a) === n);
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: progress lives for this session only */
  }
}

/* ---------------------------------------------------------------------------
 * Audio engine: speech and Web Audio are never active at the same time.
 * ------------------------------------------------------------------------- */
const sanitizeThai = (s) => (s || "").replace(/[^฀-๿\s]/g, "").replace(/\s+/g, " ").trim();
const sanitizeLao = (s) => (s || "").replace(/[^຀-໿\s]/g, "").replace(/\s+/g, " ").trim();

class SuvarnaMobileAudioEngine {
  constructor() {
    this.ctx = null;
    this.nodes = [];
    this.speechTimer = null;
    this.rate = 0.85;
    this.muted = false;
    this.voices = [];
    this.primed = false;
    this.listeners = new Set();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const load = () => {
        this.voices = window.speechSynthesis.getVoices() || [];
        this.listeners.forEach((fn) => fn());
      };
      load();
      window.speechSynthesis.addEventListener?.("voiceschanged", load);
    }
  }
  onVoices(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  thaiVoice() {
    return this.voices.find((v) => /^th(-|_|$)/i.test(v.lang));
  }
  thaiVoices() {
    return this.voices.filter((v) => /^th(-|_|$)/i.test(v.lang));
  }
  laoVoice() {
    return this.voices.find((v) => /^lo(-|_|$)/i.test(v.lang));
  }
  /** iOS needs a speech call inside the first user gesture. */
  prime() {
    if (this.primed || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    this.primed = true;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }
  stopTones() {
    this.nodes.forEach((n) => {
      try { n.stop(0); } catch { /* already stopped */ }
      try { n.disconnect(); } catch { /* ignore */ }
    });
    this.nodes = [];
  }
  cancelSpeech() {
    clearTimeout(this.speechTimer);
    this.speechTimer = null;
    this.seqToken = (this.seqToken || 0) + 1;
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  }
  /**
   * Speak with a human voice. `ttsThai` must be Thai script. If `laoRaw` is
   * given and the device has a Lao voice, the Lao text is spoken instead.
   */
  speakHumanVoice(ttsThai, laoRaw, opts = {}) {
    this.speakSequence([{ th: ttsThai, lo: laoRaw, ...opts }]);
  }
  /**
   * Speak several utterances one after another (e.g. "your answer" then "the
   * right answer"). Each entry: { th, lo?, voice?, rate? }. Starting any other
   * sound cancels the rest of the sequence.
   */
  speakSequence(list, gapMs = 450) {
    if (this.muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    this.stopTones();
    this.cancelSpeech();
    const token = this.seqToken;
    const utterances = list
      .map((e) => {
        const lv = e.lo ? this.laoVoice() : null;
        const text = lv ? sanitizeLao(e.lo) : sanitizeThai(e.th);
        if (!text) return null;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lv ? "lo-LA" : "th-TH";
        const voice = lv || e.voice || this.thaiVoice();
        if (voice) u.voice = voice;
        u.rate = e.rate || this.rate;
        return u;
      })
      .filter(Boolean);
    if (!utterances.length) return;
    const play = (i) => {
      if (token !== this.seqToken || i >= utterances.length) return;
      const u = utterances[i];
      u.onend = () => {
        if (i + 1 < utterances.length) this.speechTimer = setTimeout(() => play(i + 1), gapMs);
      };
      window.speechSynthesis.speak(u);
    };
    this.speechTimer = setTimeout(() => play(0), 120);
  }
  /** Play Ranat Ek style chimes for one or more tones in sequence. */
  playRanatToneChime(tones) {
    if (this.muted || typeof window === "undefined") return;
    this.cancelSpeech();
    this.stopTones();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) this.ctx = new AC();
    const ctx = this.ctx;
    if (ctx.state === "suspended") ctx.resume();
    const list = Array.isArray(tones) ? tones : [tones];
    let t = ctx.currentTime + 0.03;
    const step = 0.2 / this.rate;
    list.forEach((tone) => {
      (TONES[tone]?.notes || []).forEach((note) => {
        this.strike(NOTE_FREQ[note], t);
        t += step;
      });
      t += step * 0.9;
    });
  }
  strike(freq, t) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.32, t + 0.006);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    out.connect(ctx.destination);
    const body = ctx.createOscillator();
    body.type = "triangle";
    body.frequency.setValueAtTime(freq, t);
    body.connect(out);
    // Short wooden "knock" partial.
    const knockGain = ctx.createGain();
    knockGain.gain.setValueAtTime(0.0001, t);
    knockGain.gain.exponentialRampToValueAtTime(0.12, t + 0.003);
    knockGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    knockGain.connect(ctx.destination);
    const knock = ctx.createOscillator();
    knock.type = "sine";
    knock.frequency.setValueAtTime(freq * 3.93, t);
    knock.connect(knockGain);
    [body, knock].forEach((o) => {
      o.start(t);
      o.stop(t + 0.6);
      this.nodes.push(o);
      o.onended = () => {
        this.nodes = this.nodes.filter((n) => n !== o);
      };
    });
  }
}

/** Short vibration on Android (Galaxy and others); iOS ignores it. */
const haptic = (kind) => {
  try {
    navigator.vibrate?.(kind === "ok" ? 12 : [28, 40, 28]);
  } catch {
    /* not supported */
  }
};
const IS_ANDROID = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
const ANDROID_VOICE_HINT = "On a Galaxy: Settings → General management → Text-to-speech → Preferred engine: Speech Services by Google, then download Thai in its settings.";

let audioSingleton = null;
const getAudio = () => {
  if (!audioSingleton) audioSingleton = new SuvarnaMobileAudioEngine();
  return audioSingleton;
};

/* ---------------------------------------------------------------------------
 * Small shared UI
 * ------------------------------------------------------------------------- */
function Glyph({ text, script, font, className = "", style = {} }) {
  return (
    <span lang={script === "lo" ? "lo" : "th"} className={className} style={{ fontFamily: FONT_STACKS[font][script], ...style }}>
      {text}
    </span>
  );
}

/** Renders Thai, Lao or both, depending on the script mode. */
function DualText({ th, lo, mode, font, className = "", gapClass = "gap-4", divider = true }) {
  if (mode === "th") return <Glyph text={th} script="th" font={font} className={className} />;
  if (mode === "lo") return <Glyph text={lo} script="lo" font={font} className={className} />;
  return (
    <span className={`inline-flex items-baseline ${gapClass}`}>
      <Glyph text={th} script="th" font={font} className={className} />
      {divider && <span className="text-slate-400 text-base self-center">⇄</span>}
      <Glyph text={lo} script="lo" font={font} className={className} />
    </span>
  );
}

function ToneBadge({ tone, small }) {
  const t = TONES[tone];
  if (!t) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"}`} style={{ background: `${t.color}22`, color: t.ink, border: `1px solid ${t.color}66` }}>
      <ToneGlyph tone={tone} size={small ? 14 : 16} /> {t.name} <span className="opacity-75">{t.chao}</span>
    </span>
  );
}

/** Tiny contour icon, so tone is readable without relying on colour. */
function ToneGlyph({ tone, size = 16, color }) {
  const digits = TONES[tone].chao.split("").map(Number);
  const y = (d) => 2 + ((5 - d) / 4) * 12;
  const pts = digits.map((d, i) => `${2 + (i / (digits.length - 1)) * 16},${y(d)}`).join(" ");
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 20 16" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color || "currentColor"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClassBadge({ cls, small }) {
  const c = CLASSES[cls];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"}`} style={{ background: `${c.color}1f`, color: c.color, border: `1px solid ${c.color}55` }}>
      <Icon size={small ? 12 : 14} /> {c.name} · {c.persona}
    </span>
  );
}

function AudioButtons({ ttsTh, ttsLo, loRaw, tones, mode, compact }) {
  const audio = getAudio();
  const btn = `inline-flex items-center gap-1.5 rounded-xl border font-semibold transition active:scale-95 ${compact ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm"}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {mode !== "lo" && (
        <button className={`${btn} border-cyan-400/40 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20`} onClick={() => audio.speakHumanVoice(ttsTh)}>
          <Volume2 size={compact ? 14 : 16} /> {mode === "dual" ? "ไทย" : "Speak"}
        </button>
      )}
      {mode !== "th" && (
        <button className={`${btn} border-purple-400/40 bg-purple-400/10 text-purple-200 hover:bg-purple-400/20`} onClick={() => audio.speakHumanVoice(ttsLo || ttsTh, loRaw)}>
          <Volume2 size={compact ? 14 : 16} /> {mode === "dual" ? "ລາວ" : "Speak"}
        </button>
      )}
      {tones && tones.length > 0 && (
        <button className={`${btn} border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20`} onClick={() => audio.playRanatToneChime(tones)}>
          <Music size={compact ? 14 : 16} /> Chime
        </button>
      )}
    </div>
  );
}

function Modal({ open, onClose, children, title, accent = COLORS.gold, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className={`relative w-full ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"} max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:pb-0 sm:rounded-3xl border border-white/10 bg-[#0F172A]/95 shadow-2xl`}
        style={{ boxShadow: `0 0 60px ${accent}22` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#0F172A]/95 px-5 py-3 backdrop-blur">
          <div className="text-sm font-semibold tracking-wide text-slate-200">{title}</div>
          <button aria-label="Close" className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Card({ children, className = "", glow, style }) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md ${className}`} style={{ ...(glow ? { boxShadow: `0 0 40px ${glow}1f` } : {}), ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, sub, color = COLORS.gold }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="mt-0.5 rounded-2xl p-2" style={{ background: `${color}1f`, color }}>
        <Icon size={20} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {sub && <p className="text-sm text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children, color = COLORS.gold, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-30 ${active ? "text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
      style={active ? { background: `${color}33`, borderColor: `${color}aa` } : undefined}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------------------
 * Pitch contour (Chao 1-5)
 * ------------------------------------------------------------------------- */
function ToneContour({ tone, width = 300, height = 160 }) {
  const t = TONES[tone];
  const pad = { l: 30, r: 14, t: 14, b: 14 };
  const yFor = (lvl) => pad.t + ((5 - lvl) / 4) * (height - pad.t - pad.b);
  const digits = t.chao.split("").map(Number);
  const pts = digits.map((d, i) => [pad.l + (i / (digits.length - 1)) * (width - pad.l - pad.r), yFor(d)]);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`${t.name} tone contour ${t.chao}`}>
      {[1, 2, 3, 4, 5].map((l) => (
        <g key={l}>
          <line x1={pad.l} x2={width - pad.r} y1={yFor(l)} y2={yFor(l)} stroke="#ffffff14" strokeDasharray="3 5" />
          <text x={10} y={yFor(l) + 4} fill="#94A3B8" fontSize="11">{l}</text>
        </g>
      ))}
      <defs>
        <linearGradient id={`tone-grad-${tone}`} gradientUnits="userSpaceOnUse" x1={pad.l} x2={width - pad.r} y1="0" y2="0">
          <stop offset="0" stopColor={t.grad[0]} />
          <stop offset="1" stopColor={t.grad[1]} />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#tone-grad-${tone})`} strokeWidth="6" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${t.color}88)` }} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 5 : 3.5} fill={i === 0 ? "#fff" : t.grad[1]} />
      ))}
    </svg>
  );
}

/* ============================================================================
 * Today Path: one ordered daily session sized to the learner's minutes.
 * ========================================================================== */
const EAR_DAILY_TRIALS = 20;

function computeStreak(log) {
  let streak = 0;
  const active = (k) => !!log[k] && ((log[k].reviews || 0) + (log[k].ear || 0) + (log[k].lessons || 0) + (log[k].shadow || 0) > 0);
  let t = Date.now();
  if (!active(todayKey(t))) t -= DAY;
  while (active(todayKey(t))) {
    streak += 1;
    t -= DAY;
  }
  return streak;
}

function weekAccuracy(log) {
  let right = 0;
  let total = 0;
  for (let i = 0; i < 7; i += 1) {
    const d = log[todayKey(Date.now() - i * DAY)];
    if (d) { right += d.reviewsRight || 0; total += d.reviews || 0; }
  }
  return total >= 10 ? right / total : null;
}

function forecast(srs, now) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const days = Array(7).fill(0);
  Object.values(srs).forEach((s) => {
    if (!s || s.stage < 1 || s.stage >= 5 || !Number.isFinite(s.next)) return;
    const d = Math.max(0, Math.floor((s.next - start.getTime()) / DAY));
    if (d < 7) days[d] += 1;
  });
  return days;
}

function ForecastChart({ days }) {
  const max = Math.max(4, ...days);
  const labels = days.map((_, i) => (i === 0 ? "Today" : new Date(Date.now() + i * DAY).toLocaleDateString(undefined, { weekday: "short" })));
  return (
    <svg viewBox="0 0 280 92" className="w-full max-w-md" role="img" aria-label={`Reviews due over the next 7 days: ${days.join(", ")}`}>
      {days.map((n, i) => {
        const h = (n / max) * 60;
        const x = 6 + i * 39;
        return (
          <g key={i}>
            <rect x={x} y={70 - h} width="28" height={Math.max(h, 1.5)} rx="5" fill={i === 0 ? COLORS.gold : COLORS.cyan} opacity={i === 0 ? 1 : 0.75} />
            <text x={x + 14} y={66 - h} textAnchor="middle" fontSize="10" fill="#E2E8F0" fontWeight="700">{n || ""}</text>
            <text x={x + 14} y={86} textAnchor="middle" fontSize="9.5" fill="#94A3B8">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TodayPath({ srs, now, reviewCount, lessonQueue, leeches, log, dailyMinutes, onReviews, onLessons, onEar, onLeech }) {
  const today = log[todayKey()] || {};
  const acc = weekAccuracy(log);
  const streak = computeStreak(log);
  const lessonBatch = Math.min(lessonQueue.length, dailyMinutes <= 5 ? 3 : 5);
  const lessonsPaused = (acc != null && acc < 0.8) || reviewCount >= 30;
  const steps = [
    { id: "reviews", label: reviewCount ? `${reviewCount} review${reviewCount > 1 ? "s" : ""}` : "Reviews", min: Math.max(1, Math.ceil((reviewCount * 10) / 60)), done: reviewCount === 0, note: reviewCount === 0 ? (today.reviews ? `${today.reviews} done today` : "Nothing due") : null, onClick: onReviews, disabled: !reviewCount },
    { id: "ear", label: "Ear set", min: 3, done: (today.ear || 0) >= EAR_DAILY_TRIALS, note: `${Math.min(today.ear || 0, EAR_DAILY_TRIALS)} / ${EAR_DAILY_TRIALS} trials`, onClick: onEar },
  ];
  if (leeches.length) steps.push({ id: "leech", label: `Leech drill: ${leeches.slice(0, 3).map((l) => l.th).join(" ")}`, thai: true, min: 2, done: (today.drills || 0) > 0, onClick: onLeech });
  if (lessonQueue.length) {
    steps.push({
      id: "lessons",
      label: `${lessonBatch} new item${lessonBatch > 1 ? "s" : ""}`,
      min: 3,
      done: (today.lessons || 0) >= lessonBatch,
      note: lessonsPaused ? (reviewCount >= 30 ? "Paused until reviews are under 30" : `Paused: ${Math.round(acc * 100)}% this week, aim for 80%`) : null,
      onClick: onLessons,
      disabled: lessonsPaused && !(today.lessons > 0),
    });
  }
  let budget = dailyMinutes;
  const planned = steps.filter((s) => { const keep = s.id === "reviews" || budget - s.min >= 0; if (keep) budget -= s.min; return keep; });
  const total = planned.reduce((n, s) => n + s.min, 0);
  const doneMin = planned.filter((s) => s.done).reduce((n, s) => n + s.min, 0);
  const nextStep = planned.find((s) => !s.done && !s.disabled);
  const reads = Object.values(srs).reduce((a, s) => [a[0] + (s?.stats?.read?.[0] || 0), a[1] + (s?.stats?.read?.[1] || 0)], [0, 0]);
  const seconds = Object.values(srs).reduce((a, s) => [a[0] + (s?.stats?.second?.[0] || 0), a[1] + (s?.stats?.second?.[1] || 0)], [0, 0]);
  const pct = ([r, n]) => (n ? `${Math.round((r / n) * 100)}%` : "–");

  return (
    <Card className="p-5 sm:p-6" glow={COLORS.gold}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/90">Today</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">{planned.every((s) => s.done || s.disabled) ? "Path complete" : `${total}-minute path`}</h1>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm">
          <Flame size={16} className={streak ? "text-amber-400" : "text-slate-400"} />
          <span className="font-bold text-white tabular-nums">{streak}</span>
          <span className="text-slate-400">day{streak === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${total ? (doneMin / total) * 100 : 100}%` }} /></div>
      <ol className="mt-4 space-y-2">
        {planned.map((s) => {
          const isNext = nextStep && s.id === nextStep.id;
          return (
            <li key={s.id}>
              <button
                onClick={s.onClick}
                disabled={s.disabled}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${isNext ? "border-amber-400/70 bg-amber-400/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"} disabled:cursor-default disabled:hover:bg-white/[0.03]`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${s.done ? "bg-emerald-400 text-emerald-950" : isNext ? "border-2 border-amber-400" : "border-2 border-white/20"}`}>
                  {s.done && <Check size={15} strokeWidth={3} />}
                </span>
                <span className={`flex-1 font-semibold ${s.done ? "text-slate-400 line-through decoration-slate-500" : "text-white"}`} style={s.thai ? { fontFamily: FONT_STACKS.loop.th } : undefined}>{s.label}</span>
                {s.note && <span className="hidden text-xs text-slate-400 sm:inline">{s.note}</span>}
                <span className="text-xs tabular-nums text-slate-400">{s.min} min</span>
              </button>
              {s.note && <div className="px-12 pt-0.5 text-xs text-slate-400 sm:hidden">{s.note}</div>}
            </li>
          );
        })}
      </ol>
      <div className="mt-5 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Reviews due, next 7 days</div>
          <ForecastChart days={forecast(srs, now)} />
        </div>
        <div className="grid grid-cols-3 gap-2 self-end text-center">
          <div className="rounded-xl bg-white/[0.04] p-2"><div className="font-black text-white tabular-nums">{pct(reads)}</div><div className="text-[11px] text-slate-400">reading</div></div>
          <div className="rounded-xl bg-white/[0.04] p-2"><div className="font-black text-white tabular-nums">{pct(seconds)}</div><div className="text-[11px] text-slate-400">tone / class</div></div>
          <div className="rounded-xl bg-white/[0.04] p-2"><div className="font-black text-white tabular-nums">{acc == null ? "–" : `${Math.round(acc * 100)}%`}</div><div className="text-[11px] text-slate-400">this week</div></div>
        </div>
      </div>
    </Card>
  );
}

/** Contrast drill for leeches: pick the item among its lookalikes. */
function leechOptions(item) {
  const group = TRAPS.find((g) => g.items.some((x) => x.th === item.th));
  let pool = group ? CURRICULUM.filter((c) => c.id !== item.id && group.items.some((x) => x.th === c.th)) : [];
  if (pool.length < 3) {
    const extra = shuffle(CURRICULUM.filter((c) => c.id !== item.id && c.tier === item.tier && !pool.includes(c)));
    pool = [...pool, ...extra].slice(0, 3);
  }
  return shuffle([item, ...pool.slice(0, 3)]);
}

function LeechDrill({ open, leeches, mode, font, onClose, onFinish }) {
  const [rounds, setRounds] = useState([]);
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState(null);
  const results = useRef({});
  useEffect(() => {
    if (!open) return;
    const list = leeches.slice(0, 4);
    setRounds(shuffle([...list, ...list, ...list]).map((item) => ({ item, options: leechOptions(item) })));
    setIdx(0);
    setPick(null);
    results.current = {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!open) return null;
  const round = rounds[idx];
  const done = idx >= rounds.length;
  const choose = (opt) => {
    if (pick) return;
    setPick(opt.id);
    const ok = opt.id === round.item.id;
    const r = results.current[round.item.id] || [0, 0];
    results.current[round.item.id] = [r[0] + (ok ? 1 : 0), r[1] + 1];
    getAudio().speakHumanVoice(round.item.ttsTh);
  };
  const finish = () => {
    const cleared = Object.entries(results.current).filter(([, [r, n]]) => r === n).map(([id]) => id);
    onFinish(cleared);
  };
  const scriptText = (o) => (mode === "lo" ? o.lo : o.th);
  return (
    <Modal open={open} onClose={done ? finish : onClose} title={done ? "Leech drill done" : `Leech drill ${idx + 1} / ${rounds.length}`} accent="#F43F5E">
      {done ? (
        <div className="py-4 text-center">
          <Target size={40} className="mx-auto text-rose-300" />
          <p className="mt-3 text-sm text-slate-300">Items you got right every time are no longer leeches. The rest stay in the drill.</p>
          <button onClick={finish} className="mt-4 rounded-xl bg-amber-500 px-5 py-2 font-bold text-black">Done</button>
        </div>
      ) : round && (
        <div>
          <p className="text-center text-sm text-slate-300">Which one is</p>
          <p className="text-center text-xl font-bold text-white">{mode === "lo" ? round.item.loRoman : round.item.thRoman}</p>
          <p className="text-center text-sm text-slate-400">{round.item.meaning}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {round.options.map((o) => {
              const state = !pick ? "" : o.id === round.item.id ? "border-emerald-400 bg-emerald-500/15" : o.id === pick ? "border-rose-400 bg-rose-500/15" : "opacity-50";
              return (
                <button key={o.id} onClick={() => choose(o)} className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center transition active:scale-95 ${state}`}>
                  <Glyph text={scriptText(o)} script={mode === "lo" ? "lo" : "th"} font={font} className="text-5xl leading-[1.4] text-white" />
                  {pick && <div className="text-xs text-slate-300">{o.thRoman.split(" ·")[0]} · {o.meaning.split(" ·")[0]}</div>}
                </button>
              );
            })}
          </div>
          {pick && (
            <div className="mt-3 space-y-2">
              {pick !== round.item.id && <p className="text-sm text-rose-200">{round.item.trap}</p>}
              <button onClick={() => { setPick(null); setIdx(idx + 1); }} className="w-full rounded-2xl bg-amber-500 py-3 font-bold text-black">Next</button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ============================================================================
 * Onboarding: three questions that set the starting path.
 * ========================================================================== */
const ONBOARD_QUESTIONS = [
  { key: "mode", q: "Which script do you need first?", options: [
    { v: "th", label: "Thai first", sub: "Lao can join later as a bridge." },
    { v: "lo", label: "Lao first", sub: "Thai can join later as a bridge." },
    { v: "dual", label: "Both together", sub: "Side by side from day one. Harder at the start." },
  ] },
  { key: "level", q: "Can you read any Thai or Lao already?", options: [
    { v: "none", label: "Not yet", sub: "Start with Level 1." },
    { v: "some", label: "Some letters", sub: "Start with Level 1, faster pace." },
    { v: "reads", label: "I can read slowly", sub: "Open every level now." },
  ] },
  { key: "minutes", q: "How many minutes a day?", options: [
    { v: 5, label: "5 minutes", sub: "Reviews plus a short drill." },
    { v: 12, label: "12 minutes", sub: "Recommended." },
    { v: 20, label: "20 minutes", sub: "Faster progress." },
  ] },
];

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const q = ONBOARD_QUESTIONS[step];
  const choose = (v) => {
    const next = { ...answers, [q.key]: v };
    setAnswers(next);
    if (step + 1 < ONBOARD_QUESTIONS.length) setStep(step + 1);
    else onDone(next);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#0F172A] p-6 sm:rounded-3xl">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 text-lg font-black text-black" style={{ fontFamily: FONT_STACKS.loop.th }}>สุ</div>
          <div className="text-sm font-semibold text-amber-300">Welcome to SuvarṇaKani</div>
          <div className="ml-auto flex gap-1">{ONBOARD_QUESTIONS.map((_, i) => <span key={i} className={`h-1.5 w-6 rounded-full ${i <= step ? "bg-amber-400" : "bg-white/15"}`} />)}</div>
        </div>
        <h2 className="mt-5 text-xl font-bold text-white">{q.q}</h2>
        <div className="mt-4 space-y-2">
          {q.options.map((o) => (
            <button key={String(o.v)} onClick={() => choose(o.v)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-amber-400/60 hover:bg-amber-400/10">
              <div className="font-semibold text-white">{o.label}</div>
              <div className="text-sm text-slate-400">{o.sub}</div>
            </button>
          ))}
        </div>
        <button onClick={() => onDone({})} className="mt-4 text-xs text-slate-400 underline">Skip for now</button>
      </div>
    </div>
  );
}

/* ============================================================================
 * Module 1: SRS Shrine
 * ========================================================================== */
function Shrine({ srs, setSrs, sandbox, mode, font, onInspect, ear, onOpenEar, log, logActivity, dailyMinutes }) {
  const [now, setNow] = useState(Date.now());
  const [lessonOpen, setLessonOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [leechOpen, setLeechOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const stageOf = (id) => srs[id]?.stage || 0;

  const unlockedLevels = useMemo(() => {
    const set = new Set([1]);
    for (let n = 2; n <= LEVELS.length; n += 1) {
      const prev = CURRICULUM.filter((i) => i.level === n - 1);
      // A level you have already started stays open when new items join the level before it.
      const started = CURRICULUM.some((i) => i.level === n && stageOf(i.id) > 0);
      if (sandbox || started || prev.every((i) => stageOf(i.id) >= 2)) set.add(n);
      else break;
    }
    if (sandbox) LEVELS.forEach((l) => set.add(l.n));
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srs, sandbox]);

  const lessonQueue = useMemo(() => CURRICULUM.filter((i) => unlockedLevels.has(i.level) && stageOf(i.id) === 0).sort((a, b) => a.level - b.level), [srs, unlockedLevels]); // eslint-disable-line react-hooks/exhaustive-deps
  const reviewQueue = useMemo(
    () => CURRICULUM.filter((i) => { const s = srs[i.id]; return s && s.stage >= 1 && s.stage < 5 && (sandbox || s.next <= now); }),
    [srs, now, sandbox]
  );
  const nextReview = useMemo(() => {
    const times = CURRICULUM.map((i) => srs[i.id]).filter((s) => s && s.stage >= 1 && s.stage < 5 && s.next > now).map((s) => s.next);
    return times.length ? Math.min(...times) : null;
  }, [srs, now]);

  const counts = SRS_STAGES.map((_, idx) => CURRICULUM.filter((i) => stageOf(i.id) === idx).length);

  const leeches = useMemo(() => CURRICULUM.filter((i) => isLeech(srs[i.id])), [srs]);

  const finishLessons = (ids) => {
    setSrs((prev) => {
      const next = { ...prev };
      ids.forEach((id) => { next[id] = { stage: 1, next: Date.now() }; });
      return next;
    });
    logActivity({ lessons: ids.length });
    setLessonOpen(false);
  };

  const finishLeechDrill = (clearedIds) => {
    setSrs((prev) => {
      const next = { ...prev };
      clearedIds.forEach((id) => { if (next[id]) next[id] = { ...next[id], leechCleared: true }; });
      return next;
    });
    logActivity({ drills: 1 });
    setLeechOpen(false);
  };

  const answer = (id, correct, parts = {}) => {
    const grade = (ok) => (ok == null ? null : ok ? (parts.guessed ? 2 : 3) : 1);
    setSrs((prev) => {
      const cur = prev[id] || { stage: 1, next: 0 };
      const stats = { read: [0, 0], second: [0, 0], ...(cur.stats || {}) };
      const bump = (pair, ok) => [pair[0] + (ok ? 1 : 0), pair[1] + 1];
      if (parts.read != null) stats.read = bump(stats.read, parts.read);
      if (parts.second != null) stats.second = bump(stats.second, parts.second);
      return { ...prev, [id]: { ...scheduleItem(cur, { read: grade(parts.read), second: grade(parts.second) }), stats } };
    });
    logActivity({ reviews: 1, reviewsRight: correct ? 1 : 0 });
  };

  const fmtWait = (t) => {
    const m = Math.round((t - now) / 60000);
    if (m < 60) return `${m} min`;
    if (m < 60 * 24) return `${Math.round(m / 60)} h`;
    return `${Math.round(m / 1440)} d`;
  };

  return (
    <div className="space-y-5">
      <TodayPath
        srs={srs}
        now={now}
        reviewCount={reviewQueue.length}
        lessonQueue={lessonQueue}
        leeches={leeches}
        log={log}
        dailyMinutes={dailyMinutes}
        onReviews={() => setReviewOpen(true)}
        onLessons={() => setLessonOpen(true)}
        onEar={onOpenEar}
        onLeech={() => setLeechOpen(true)}
      />
      <Card className="overflow-hidden">
        <div className="relative p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/80">SRS Shrine</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md">
            <button
              disabled={!lessonQueue.length}
              onClick={() => setLessonOpen(true)}
              className="rounded-2xl border border-pink-400/40 bg-gradient-to-br from-pink-500/30 to-pink-500/5 p-4 text-left transition active:scale-[0.98] disabled:opacity-40"
            >
              <BookOpen size={18} className="text-pink-300" />
              <div className="mt-2 text-3xl font-black text-white">{lessonQueue.length}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-pink-200">Lessons</div>
            </button>
            <button
              disabled={!reviewQueue.length}
              onClick={() => setReviewOpen(true)}
              className="rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-500/30 to-cyan-500/5 p-4 text-left transition active:scale-[0.98] disabled:opacity-40"
            >
              <RotateCcw size={18} className="text-cyan-300" />
              <div className="mt-2 text-3xl font-black text-white">{reviewQueue.length}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-200">Reviews</div>
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            {reviewQueue.length ? "Reviews are waiting." : nextReview ? `Next review in ${fmtWait(nextReview)}.` : "Finish a lesson to start reviews."}
            {sandbox && " Sandbox is on: every level is open and all learned items are reviewable now."}
          </p>
        </div>
        <div className="flex h-2 w-full">
          {counts.map((c, idx) => (
            <div key={idx} style={{ flexGrow: c || 0.0001, background: SRS_STAGES[idx].color }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-6">
          {SRS_STAGES.map((s, idx) => (
            <div key={s.name} className="rounded-xl bg-white/[0.03] px-2 py-2 text-center">
              <div className="text-lg font-black" style={{ color: s.color }}>{counts[idx]}</div>
              <div className="text-[11px] font-semibold text-slate-300">{s.name}</div>
              <div className="text-[11px] text-slate-400">{s.alias}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: TONES.rising.ink }}><Ear size={13} /> Tone ear</div>
            <p className="text-xs text-slate-400">Listening accuracy per tone, from the Ear Dojo.</p>
          </div>
          <button onClick={onOpenEar} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"><Target size={13} className="mr-1 inline" />Train</button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {TONE_ORDER.map((t) => {
            const acc = earAccuracy(ear, t);
            return (
              <div key={t} className="rounded-xl bg-white/[0.03] p-2 text-center">
                <div className="flex justify-center" style={{ color: TONES[t].ink }}><ToneGlyph tone={t} size={20} /></div>
                <div className="text-sm font-black tabular-nums text-white">{acc == null ? "–" : `${Math.round(acc * 100)}%`}</div>
                <div className="text-[11px]" style={{ color: TONES[t].ink }}>{TONES[t].name}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {LEVELS.map((lvl) => {
        const items = CURRICULUM.filter((i) => i.level === lvl.n);
        const unlocked = unlockedLevels.has(lvl.n);
        const done = items.filter((i) => stageOf(i.id) >= 2).length;
        return (
          <Card key={lvl.n} className={`p-4 sm:p-5 ${unlocked ? "" : "opacity-60"}`} style={{ backgroundImage: lvl.bg }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: lvl.accent }}>
                  {unlocked ? <Unlock size={13} /> : <Lock size={13} />} Level {lvl.n}
                </div>
                <h3 className="text-base font-bold text-white">{lvl.title}</h3>
                <p className="text-xs text-slate-400">{lvl.sub}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div className="font-bold text-slate-200">{done}/{items.length}</div>
                at Novice Monk+
              </div>
            </div>
            {["glyph", "syllable", "vocab"].map((tier) => {
              const list = items.filter((i) => i.tier === tier);
              if (!list.length) return null;
              return (
                <div key={tier} className="mb-2">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: TIER[tier].color }}>{TIER[tier].label}</div>
                  <div className="flex flex-wrap gap-2">
                    {list.map((item) => {
                      const st = stageOf(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => onInspect(item)}
                          className="group relative min-w-[52px] rounded-xl px-2.5 py-1.5 text-center text-white shadow transition hover:-translate-y-0.5 active:scale-95"
                          style={{ background: `linear-gradient(160deg, ${TIER[tier].color}, ${TIER[tier].color}aa)`, opacity: unlocked ? 1 : 0.55 }}
                          title={item.meaning}
                        >
                          <DualText th={item.th} lo={item.lo} mode={mode} font={font} className="text-2xl leading-tight" gapClass="gap-1.5" divider={false} />
                          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#0B0F19]" style={{ background: SRS_STAGES[st].color }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Card>
        );
      })}

      <LessonModal open={lessonOpen} queue={lessonQueue.slice(0, dailyMinutes <= 5 ? 3 : 5)} mode={mode} font={font} onClose={() => setLessonOpen(false)} onFinish={finishLessons} />
      <ReviewModal open={reviewOpen} queue={reviewQueue} mode={mode} font={font} onClose={() => setReviewOpen(false)} onAnswer={answer} />
      <LeechDrill open={leechOpen} leeches={leeches} mode={mode} font={font} onClose={() => setLeechOpen(false)} onFinish={finishLeechDrill} />
    </div>
  );
}

function ItemHero({ item, mode, font }) {
  const color = TIER[item.tier].color;
  return (
    <div className="rounded-3xl p-6 text-center" style={{ background: `radial-gradient(circle at 50% 30%, ${color}55, ${color}11 70%)` }}>
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{TIER[item.tier].label}</div>
      <div className="my-3 text-white drop-shadow-lg">
        <DualText th={item.th} lo={item.lo} mode={mode} font={font} className="text-7xl leading-[1.35]" />
      </div>
      <div className="text-sm text-slate-200">
        {mode !== "lo" && <span>{item.thRoman}</span>}
        {mode === "dual" && <span className="text-slate-400"> · </span>}
        {mode !== "th" && <span className="text-purple-200">{item.loRoman}</span>}
      </div>
      <div className="mt-1 text-lg font-semibold text-white">{item.meaning}</div>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {item.tone.map((t, i) => <ToneBadge key={i} tone={t} small />)}
        {item.cls && <ClassBadge cls={item.cls} small />}
      </div>
    </div>
  );
}

function LessonModal({ open, queue, mode, font, onClose, onFinish }) {
  const [idx, setIdx] = useState(0);
  const batch = useRef([]);
  useEffect(() => {
    if (open) {
      batch.current = queue;
      setIdx(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const items = open ? batch.current : [];
  const item = items[idx];
  if (!open || !item) return null;
  const last = idx === items.length - 1;
  return (
    <Modal open={open} onClose={onClose} title={`Lesson ${idx + 1} / ${items.length}`} accent={TIER[item.tier].color}>
      <ItemHero item={item} mode={mode} font={font} />
      <div className="mt-4 flex justify-center">
        <AudioButtons ttsTh={item.ttsTh} ttsLo={item.ttsLo} loRaw={item.lo} tones={item.tone} mode={mode} />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <InfoRow icon={Sparkles} label="Mnemonic" text={item.mnemonic} color={COLORS.gold} />
        {item.loop && <InfoRow icon={PenTool} label="Head-loop topology" text={item.loop} color={COLORS.cyan} />}
        {item.bridge && <InfoRow icon={Languages} label="Mekong bridge" text={item.bridge} color={COLORS.purple} />}
      </div>
      <div className="mt-5 flex items-center justify-between gap-2">
        <button disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 disabled:opacity-30">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex gap-1">
          {items.map((_, i) => <span key={i} className={`h-1.5 w-5 rounded-full ${i === idx ? "bg-amber-400" : "bg-white/15"}`} />)}
        </div>
        {last ? (
          <button onClick={() => onFinish(items.map((i) => i.id))} className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black">
            <Check size={16} /> Add to SRS
          </button>
        ) : (
          <button onClick={() => setIdx(idx + 1)} className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white">
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </Modal>
  );
}

function InfoRow({ icon: Icon, label, text, color }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
      <Icon size={16} className="mt-0.5 shrink-0" style={{ color }} />
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>{label}</div>
        <div className="text-slate-200">{text}</div>
      </div>
    </div>
  );
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------------------------------------------------------------------
 * Error diagnosis: name the rule that was broken, not just "wrong".
 * ------------------------------------------------------------------------- */
function diagnoseReading(item, input) {
  const other = CURRICULUM.find((o) => o.id !== item.id && isCorrect(o, input));
  if (other) return `"${input.trim()}" is ${other.th} (${other.meaning}). ${item.trap || ""}`.trim();
  return null;
}

function diagnoseTone(item, picked) {
  const right = item.tone[0];
  if (picked === right) return null;
  const p = item.parts;
  if (!p) return `This word is ${TONES[right].name} (${TONES[right].chao}). Listen and compare with ${TONES[picked].name}.`;
  const res = computeTone(p);
  const P = TONES[picked].name;
  const first = item.th.replace(/^[เแโใไ]/, "")[0];
  const tail = ` Rule: ${res.formula}.`;
  if (p.mark !== "none" && computeTone({ ...p, mark: "none" }).tone === picked) {
    return `You read it as ${P}, which is what it would be with no mark. The ${MARKS[p.mark].plain} mark decides the tone.${tail}`;
  }
  if (res.eff === "low" && (p.mark === "ek" || p.mark === "tho") && (p.mark === "ek" ? "low" : "falling") === picked) {
    return `You forgot the Low-class shift: on a Low consonant Mai Ek reads Falling and Mai Tho reads High.${tail}`;
  }
  if (p.hn && computeTone({ ...p, hn: false }).tone === picked) {
    return `The silent ห in front lifts ${first === "ห" ? item.th[1] : first} into High class.${tail}`;
  }
  const wrongCls = Object.keys(CLASSES).find((c) => c !== res.eff && computeTone({ ...p, cls: c, hn: false }).tone === picked);
  if (wrongCls) {
    return `You treated ${first} as ${CLASSES[wrongCls].name} class. It's ${CLASSES[res.eff].name} class (${CLASSES[res.eff].persona}).${tail}`;
  }
  if (computeTone({ ...p, live: !p.live }).tone === picked) {
    return `Check the ending: this syllable is ${p.live ? "live (long vowel or m/n/ng/w/y final)" : "dead (short open vowel or p/t/k final)"}.${tail}`;
  }
  return `It's ${TONES[right].name}, not ${P}.${tail}`;
}

function diagnoseClass(item, picked) {
  if (picked === item.cls) return null;
  return `${item.th} is ${CLASSES[item.cls].name} class, not ${CLASSES[picked].name}. ${CLASSES[item.cls].rule}`;
}

/** Which second question an item gets after its reading: tone or class. */
function secondPrompt(item) {
  if (item.tier === "glyph") return item.cls ? "class" : null;
  if (item.tone.length === 1) return "tone";
  return null;
}

function ToneChoice({ onPick, picked, correct, disabled, options = TONE_ORDER }) {
  useEffect(() => {
    if (disabled) return undefined;
    const onKey = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) onPick(options[n - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, onPick, options]);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {options.map((k, i) => {
        const t = TONES[k];
        const state = picked == null ? "idle" : k === correct ? "right" : k === picked ? "wrong" : "idle";
        return (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => onPick(k)}
            className={`rounded-2xl border p-2 text-center transition active:scale-95 ${state === "right" ? "border-emerald-400 bg-emerald-500/15" : state === "wrong" ? "border-rose-400 bg-rose-500/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"}`}
          >
            <ToneMini tone={k} />
            <div className="text-xs font-semibold" style={{ color: t.ink }}>{t.name}</div>
            <div className="text-[11px] text-slate-400">{i + 1} · {t.chao}</div>
          </button>
        );
      })}
    </div>
  );
}

function ToneMini({ tone, height = 34 }) {
  const t = TONES[tone];
  const digits = t.chao.split("").map(Number);
  const y = (d) => 4 + ((5 - d) / 4) * 26;
  const pts = digits.map((d, i) => [8 + (i / (digits.length - 1)) * 84, y(d)]);
  const d = digits.length === 3
    ? `M ${pts[0][0]} ${pts[0][1]} Q ${pts[1][0]} ${pts[1][1] + 10} ${pts[2][0]} ${pts[2][1]}`
    : `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`;
  const gid = `mini-${tone}`;
  return (
    <svg viewBox="0 0 100 34" className="mx-auto block w-full" style={{ height }} aria-hidden="true">
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="8" x2="92" y1="0" y2="0">
          <stop offset="0" stopColor={t.grad[0]} />
          <stop offset="1" stopColor={t.grad[1]} />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#${gid})`} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function ClassChoice({ onPick, picked, correct, disabled }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {["high", "mid", "low"].map((k) => {
        const c = CLASSES[k];
        const Icon = c.icon;
        const state = picked == null ? "idle" : k === correct ? "right" : k === picked ? "wrong" : "idle";
        return (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => onPick(k)}
            className={`rounded-2xl border p-3 text-center transition active:scale-95 ${state === "right" ? "border-emerald-400 bg-emerald-500/15" : state === "wrong" ? "border-rose-400 bg-rose-500/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"}`}
          >
            <Icon size={20} className="mx-auto" style={{ color: c.color }} />
            <div className="mt-1 text-sm font-semibold" style={{ color: c.color }}>{c.name}</div>
            <div className="text-[11px] text-slate-400">{c.persona}</div>
          </button>
        );
      })}
    </div>
  );
}

function ReviewModal({ open, queue, mode, font, onClose, onAnswer }) {
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("read"); // read → second → result
  const [readOk, setReadOk] = useState(null);
  const [pick, setPick] = useState(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const inputRef = useRef(null);
  const pending = useRef(null);

  // An answer is saved when the learner moves on, so "I guessed" can still
  // lower its rating. Closing mid-result saves it too.
  const commit = (guessed = false) => {
    if (!pending.current) return;
    const { id, ok, parts } = pending.current;
    pending.current = null;
    onAnswer(id, ok, { ...parts, guessed });
  };
  const close = () => {
    commit();
    onClose();
  };

  useEffect(() => {
    if (open) {
      pending.current = null;
      setList(shuffle(queue));
      setIdx(0);
      setInput("");
      setPhase("read");
      setReadOk(null);
      setPick(null);
      setScore({ right: 0, wrong: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && phase === "read") inputRef.current?.focus();
  }, [open, idx, phase]);

  if (!open) return null;
  const item = list[idx];
  const finished = idx >= list.length;
  const kind = item ? secondPrompt(item) : null;
  const secondRight = kind === "tone" ? item.tone[0] : kind === "class" ? item.cls : null;
  const secondOk = pick == null ? null : pick === secondRight;

  const speak = () => {
    const audio = getAudio();
    if (mode === "lo") audio.speakHumanVoice(item.ttsLo || item.ttsTh, item.lo);
    else audio.speakHumanVoice(item.ttsTh);
  };

  const finish = (rOk, sOk) => {
    const ok = rOk && (sOk == null || sOk);
    haptic(ok ? "ok" : "miss");
    setScore((s) => ({ ...s, [ok ? "right" : "wrong"]: s[ok ? "right" : "wrong"] + 1 }));
    pending.current = { id: item.id, ok, parts: { read: rOk, second: sOk, kind } };
    setPhase("result");
    speak();
  };

  const next = (guessed = false) => {
    commit(guessed);
    setInput("");
    setPhase("read");
    setReadOk(null);
    setPick(null);
    setIdx(idx + 1);
  };

  const submit = (e) => {
    e.preventDefault();
    if (phase === "result") return next();
    if (phase !== "read" || !input.trim()) return undefined;
    const ok = isCorrect(item, input);
    setReadOk(ok);
    if (kind) setPhase("second");
    else finish(ok, null);
    return undefined;
  };

  const onPick = (k) => {
    if (phase !== "second") return;
    setPick(k);
    finish(readOk, k === secondRight);
  };

  const readingNote = phase === "result" && !readOk ? diagnoseReading(item, input) : null;
  const secondNote = phase === "result" && secondOk === false
    ? kind === "tone" ? diagnoseTone(item, pick) : diagnoseClass(item, pick)
    : null;
  const allOk = phase === "result" && readOk && secondOk !== false;

  return (
    <Modal open={open} onClose={close} title={finished ? "Review complete" : `Review ${idx + 1} / ${list.length}`} accent={item ? TIER[item.tier].color : COLORS.gold}>
      {finished ? (
        <div className="py-6 text-center">
          <Trophy size={44} className="mx-auto text-amber-400" />
          <div className="mt-3 text-2xl font-black text-white">{score.right} / {score.right + score.wrong}</div>
          <p className="mt-1 text-sm text-slate-400">Each item's reading and its tone (or class) are scheduled separately, for about 90% recall. Missed items come back in 10 minutes, then sooner than before.</p>
          <button onClick={close} className="mt-5 rounded-xl bg-amber-500 px-5 py-2 font-bold text-black">Back to the Shrine</button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="rounded-3xl p-8 text-center" style={{ background: `linear-gradient(160deg, ${TIER[item.tier].color}, ${TIER[item.tier].color}88)` }}>
            <DualText th={item.th} lo={item.lo} mode={mode} font={font} className="text-7xl leading-[1.35] text-white" />
          </div>
          <label htmlFor="review-input" className="mt-4 block text-center text-xs font-bold uppercase tracking-widest text-slate-400">1 · Type the reading or the meaning</label>
          <input
            id="review-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            readOnly={phase !== "read"}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="e.g. maa / horse"
            className={`mt-2 w-full rounded-2xl border bg-black/30 px-4 py-3 text-center text-lg text-white outline-none ${readOk === true ? "border-emerald-400 bg-emerald-500/20" : readOk === false ? "border-rose-400 bg-rose-500/20" : "border-white/15 focus:border-amber-400"}`}
          />
          {kind && phase !== "read" && (
            <div className="mt-4">
              <div className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                2 · {kind === "tone" ? "Which tone? (keys 1–5)" : "Which consonant class?"}
              </div>
              {kind === "tone"
                ? <ToneChoice onPick={onPick} picked={pick} correct={phase === "result" ? secondRight : null} disabled={phase !== "second"} />
                : <ClassChoice onPick={onPick} picked={pick} correct={phase === "result" ? secondRight : null} disabled={phase !== "second"} />}
            </div>
          )}
          {phase === "result" && (
            <div className="mt-3 space-y-2 rounded-2xl bg-white/[0.04] p-3 text-sm">
              <div className={`font-bold ${allOk ? "text-emerald-300" : "text-rose-300"}`}>
                {allOk ? "Correct" : !readOk && secondOk === false ? "Reading and " + (kind === "tone" ? "tone" : "class") + " missed" : !readOk ? "Reading missed" : kind === "tone" ? "Tone missed" : "Class missed"}
              </div>
              {readingNote && <p className="text-rose-200">{readingNote}</p>}
              {secondNote && <p className="text-rose-200">{secondNote}</p>}
              <div className="text-slate-200">
                <span className="text-slate-400">Reading:</span> {item.thRoman}{mode !== "th" && <> · <span className="text-purple-200">{item.loRoman}</span></>}
                <br /><span className="text-slate-400">Meaning:</span> {item.meaning}
              </div>
              <div className="flex flex-wrap gap-1.5">{item.tone.map((t, i) => <ToneBadge key={i} tone={t} small />)}{item.cls && <ClassBadge cls={item.cls} small />}</div>
              {allOk && <p className="text-slate-400">{item.mnemonic}</p>}
              <AudioButtons ttsTh={item.ttsTh} ttsLo={item.ttsLo} loRaw={item.lo} tones={item.tone} mode={mode} compact />
            </div>
          )}
          {phase !== "second" && (
            <div className="mt-4 flex gap-2">
              {allOk && (
                <button type="button" onClick={() => next(true)} className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5" title="Right, but you weren't sure: it will come back sooner">
                  I guessed
                </button>
              )}
              <button type="submit" className="flex-1 rounded-2xl bg-amber-500 py-3 font-bold text-black active:scale-[0.99]">
                {phase === "result" ? "Next" : "Check"}
              </button>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}

function Inspector({ item, mode, font, srs, onClose }) {
  if (!item) return null;
  const tone = item.parts ? computeTone(item.parts) : null;
  const st = srs[item.id]?.stage || 0;
  return (
    <Modal open={!!item} onClose={onClose} title="Item inspector" accent={TIER[item.tier].color} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <ItemHero item={item} mode={mode} font={font} />
          <div className="mt-3 flex justify-center"><AudioButtons ttsTh={item.ttsTh} ttsLo={item.ttsLo} loRaw={item.lo} tones={item.tone} mode={mode} /></div>
          <div className="mt-3 text-center text-xs text-slate-400">
            SRS stage: <span className="font-bold" style={{ color: SRS_STAGES[st].color }}>{SRS_STAGES[st].name}</span> ({SRS_STAGES[st].alias})
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <InfoRow icon={Sparkles} label="Mnemonic story" text={item.mnemonic} color={COLORS.gold} />
          {item.loop && <InfoRow icon={PenTool} label="Head-loop topology" text={item.loop} color={COLORS.cyan} />}
          {tone && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-pink-300">Tone equation (Thai)</div>
              <div className="mt-1 font-semibold text-white">{tone.formula}</div>
            </div>
          )}
          {item.bridge && <InfoRow icon={Languages} label="Mekong bridge" text={item.bridge} color={COLORS.purple} />}
          <InfoRow icon={AlertTriangle} label="Lookalike trap" text={item.trap} color="#F43F5E" />
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Head-loop vs street font</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              {["loop", "street"].map((f) => (
                <div key={f} className="rounded-xl bg-black/30 p-2">
                  <DualText th={item.th} lo={item.lo} mode={mode} font={f} className="text-4xl leading-[1.4] text-white" gapClass="gap-2" divider={false} />
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">{f === "loop" ? "Traditional" : "Loopless"}</div>
                </div>
              ))}
            </div>
            {item.street && <p className="mt-2 text-slate-300">{item.street}</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================================
 * Module: Tone Ear Dojo (high-variability listening drills)
 * ========================================================================== */
const EAR_SETS = [
  { id: "maa", label: "มา · ม้า · หมา", words: [
    { th: "มา", tone: "mid", r: "maa", m: "come" },
    { th: "ม้า", tone: "high", r: "máa", m: "horse" },
    { th: "หมา", tone: "rising", r: "mǎa", m: "dog" },
  ] },
  { id: "khaaw", label: "ขาว · ข่าว · ข้าว", words: [
    { th: "ขาว", tone: "rising", r: "khǎaw", m: "white" },
    { th: "ข่าว", tone: "low", r: "khàaw", m: "news" },
    { th: "ข้าว", tone: "falling", r: "khâaw", m: "rice" },
  ] },
  { id: "khaa", label: "คา · ค่า · ค้า · ขา", words: [
    { th: "คา", tone: "mid", r: "khaa", m: "stuck" },
    { th: "ค่า", tone: "falling", r: "khâa", m: "value" },
    { th: "ค้า", tone: "high", r: "kháa", m: "trade" },
    { th: "ขา", tone: "rising", r: "khǎa", m: "leg" },
  ] },
  { id: "mai", label: "ไม้ · ไหม · ใหม่ · ไม่", words: [
    { th: "ไม้", tone: "high", r: "mái", m: "wood" },
    { th: "ไหม", tone: "rising", r: "mǎi", m: "silk / question word" },
    { th: "ใหม่", tone: "low", r: "mài", m: "new" },
    { th: "ไม่", tone: "falling", r: "mâi", m: "not" },
  ] },
  { id: "naa", label: "นา · น่า · น้า · หนา", words: [
    { th: "นา", tone: "mid", r: "naa", m: "rice field" },
    { th: "น่า", tone: "falling", r: "nâa", m: "worth (-able)" },
    { th: "น้า", tone: "high", r: "náa", m: "aunt / uncle (mother's younger sibling)" },
    { th: "หนา", tone: "rising", r: "nǎa", m: "thick" },
  ] },
  { id: "suea", label: "เสือ · เสื่อ · เสื้อ", words: [
    { th: "เสือ", tone: "rising", r: "sʉ̌a", m: "tiger" },
    { th: "เสื่อ", tone: "low", r: "sʉ̀a", m: "mat" },
    { th: "เสื้อ", tone: "falling", r: "sʉ̂a", m: "shirt" },
  ] },
  { id: "paa", label: "ปา · ป่า · ป้า · ป๊า · ป๋า", words: [
    { th: "ปา", tone: "mid", r: "paa", m: "throw" },
    { th: "ป่า", tone: "low", r: "pàa", m: "forest" },
    { th: "ป้า", tone: "falling", r: "pâa", m: "aunt (older)" },
    { th: "ป๊า", tone: "high", r: "páa", m: "dad (colloquial)" },
    { th: "ป๋า", tone: "rising", r: "pǎa", m: "dad / patron (slang)" },
  ] },
];
const EAR_TRIALS = 20;
const EAR_RATES = [0.8, 0.95, 1.05];

const emptyEar = () => ({ tones: Object.fromEntries(TONE_ORDER.map((t) => [t, [0, 0]])), confusions: {}, sessions: 0 });

function earAccuracy(ear, tone) {
  const [r, n] = ear.tones[tone] || [0, 0];
  return n ? r / n : null;
}

/** Pick the next trial, favouring tones and confusions the learner gets wrong. */
function pickEarTrial(ear, prevKey) {
  const options = [];
  EAR_SETS.forEach((set) => set.words.forEach((w) => {
    const acc = earAccuracy(ear, w.tone);
    const confusion = Object.entries(ear.confusions)
      .filter(([k]) => k.startsWith(`${w.tone}>`) && set.words.some((o) => k.endsWith(`>${o.tone}`)))
      .reduce((sum, [, v]) => sum + v, 0);
    const weight = 1 + (acc == null ? 1 : (1 - acc) * 3) + Math.min(confusion, 6) * 0.5;
    const key = `${set.id}:${w.th}`;
    if (key !== prevKey) options.push({ set, word: w, key, weight });
  }));
  let roll = Math.random() * options.reduce((s, o) => s + o.weight, 0);
  for (const o of options) {
    roll -= o.weight;
    if (roll <= 0) return o;
  }
  return options[options.length - 1];
}

function EarDojo({ ear, setEar, logActivity }) {
  const audio = getAudio();
  const [, force] = useState(0);
  useEffect(() => audio.onVoices(() => force((n) => n + 1)), [audio]);
  const [running, setRunning] = useState(false);
  const [trial, setTrial] = useState(null);
  const [count, setCount] = useState(0);
  const [pick, setPick] = useState(null);
  const [session, setSession] = useState({ right: 0, total: 0 });
  const voices = audio.thaiVoices();

  const playTrial = (t) => {
    const voice = voices.length ? voices[Math.floor(Math.random() * voices.length)] : undefined;
    const rate = EAR_RATES[Math.floor(Math.random() * EAR_RATES.length)];
    audio.speakHumanVoice(t.word.th, undefined, { voice, rate });
    return { voice, rate };
  };

  const nextTrial = (prevKey) => {
    const t = pickEarTrial(ear, prevKey);
    const meta = playTrial(t);
    setTrial({ ...t, ...meta });
    setPick(null);
  };

  const start = () => {
    setRunning(true);
    setCount(0);
    setSession({ right: 0, total: 0 });
    nextTrial(null);
  };

  const answer = (tone) => {
    if (pick || !trial) return;
    setPick(tone);
    const ok = tone === trial.word.tone;
    setSession((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    logActivity({ ear: 1 });
    setEar((prev) => {
      const tones = { ...prev.tones, [trial.word.tone]: [prev.tones[trial.word.tone][0] + (ok ? 1 : 0), prev.tones[trial.word.tone][1] + 1] };
      const confusions = { ...prev.confusions };
      if (!ok) confusions[`${trial.word.tone}>${tone}`] = (confusions[`${trial.word.tone}>${tone}`] || 0) + 1;
      return { ...prev, tones, confusions };
    });
    if (ok) {
      audio.playRanatToneChime([trial.word.tone]);
    } else {
      const chosen = trial.set.words.find((w) => w.tone === tone);
      audio.speakSequence([
        { th: chosen.th, voice: trial.voice, rate: trial.rate },
        { th: trial.word.th, voice: trial.voice, rate: trial.rate },
      ], 600);
    }
  };

  const advance = () => {
    const n = count + 1;
    setCount(n);
    if (n >= EAR_TRIALS) {
      setRunning(false);
      setTrial(null);
      setEar((prev) => ({ ...prev, sessions: (prev.sessions || 0) + 1 }));
      return;
    }
    nextTrial(trial.key);
  };

  const topConfusions = Object.entries(ear.confusions).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const setTones = trial ? TONE_ORDER.filter((t) => trial.set.words.some((w) => w.tone === t)) : TONE_ORDER;
  const chosenWord = trial && pick ? trial.set.words.find((w) => w.tone === pick) : null;

  return (
    <div className="space-y-4">
      <SectionTitle icon={Ear} title="Tone Ear Dojo" sub="Hear a syllable, pick its contour. Many speeds and voices, minimal sets, instant feedback." color={TONES.rising.ink} />
      {!running ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card className="p-5" glow={TONES.rising.color}>
            <h3 className="text-lg font-bold text-white">{session.total ? `Session done: ${session.right} / ${session.total}` : "Train your ear on minimal sets"}</h3>
            <p className="mt-1 max-w-prose text-sm text-slate-300">
              Each trial plays one word from a set like <span style={{ fontFamily: FONT_STACKS.loop.th }}>มา · ม้า · หมา</span> with a random speed{voices.length > 1 ? " and voice" : ""}. The word stays hidden until you answer, so you train your ear, not your reading. If you miss, you hear your choice and then the right answer, back to back.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              {voices.length ? `${voices.length} Thai voice${voices.length > 1 ? "s" : ""} on this device.` : (IS_ANDROID ? `No Thai voice found. ${ANDROID_VOICE_HINT}` : "No Thai voice found on this device. Install one in your text-to-speech settings first.")}{" "}
              Device voices sometimes blur tones; recorded native audio is planned.
            </p>
            <button onClick={start} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 font-bold text-black active:scale-[0.98]">
              <Play size={18} /> {session.total ? "Another 20" : `Start ${EAR_TRIALS} trials`}
            </button>
          </Card>
          <Card className="p-5">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Your ear, per tone</div>
            <div className="space-y-2.5">
              {TONE_ORDER.map((t) => {
                const acc = earAccuracy(ear, t);
                const [, n] = ear.tones[t];
                return (
                  <div key={t} className="flex items-center gap-3">
                    <span className="w-20"><ToneBadge tone={t} small /></span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${acc == null ? 0 : acc * 100}%`, background: `linear-gradient(90deg, ${TONES[t].grad[0]}, ${TONES[t].grad[1]})` }} />
                    </div>
                    <span className="w-16 text-right text-xs tabular-nums text-slate-300">{acc == null ? "–" : `${Math.round(acc * 100)}%`} <span className="text-slate-400">/{n}</span></span>
                  </div>
                );
              })}
            </div>
            {topConfusions.length > 0 && (
              <div className="mt-4 text-xs text-slate-300">
                <div className="mb-1 font-bold uppercase tracking-wider text-slate-400">Most confused</div>
                {topConfusions.map(([k, v]) => {
                  const [heard, picked] = k.split(">");
                  return <div key={k}>{TONES[heard].name} heard as {TONES[picked].name} <span className="text-slate-400">×{v}</span></div>;
                })}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card className="mx-auto max-w-xl p-5" glow={TONES.rising.color}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{trial?.set.label && <span style={{ fontFamily: FONT_STACKS.loop.th }}>{trial.set.label}</span>}</span>
            <span className="tabular-nums">{count + 1} / {EAR_TRIALS}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / EAR_TRIALS) * 100}%` }} /></div>
          <div className="my-6 flex flex-col items-center gap-3">
            <button onClick={() => trial && audio.speakHumanVoice(trial.word.th, undefined, { voice: trial.voice, rate: trial.rate })} className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-500 text-black shadow-[0_0_40px_#F59E0B66] active:scale-95" aria-label="Play the syllable again">
              <Volume2 size={40} />
            </button>
            <div className="text-xs text-slate-400">{pick ? "" : "Tap to hear it again. Which contour?"}{trial ? ` · ${trial.rate}×` : ""}</div>
          </div>
          <ToneChoice onPick={answer} picked={pick} correct={pick ? trial.word.tone : null} disabled={!!pick} options={setTones} />
          {pick && (
            <div className="mt-4 space-y-2 rounded-2xl bg-white/[0.04] p-3 text-sm">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-4xl leading-[1.5] text-white" style={{ fontFamily: FONT_STACKS.loop.th }}>{trial.word.th}</span>
                <span className="text-slate-200">{trial.word.r} · {trial.word.m}</span>
                <ToneBadge tone={trial.word.tone} small />
              </div>
              {pick === trial.word.tone ? (
                <p className="font-semibold text-emerald-300">Correct.</p>
              ) : (
                <p className="text-rose-200">
                  You picked {TONES[pick].name}, which is <span style={{ fontFamily: FONT_STACKS.loop.th }}>{chosenWord.th}</span> ({chosenWord.m}). You just heard both, yours first.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {pick !== trial.word.tone && (
                  <button onClick={() => audio.speakSequence([{ th: chosenWord.th, voice: trial.voice, rate: trial.rate }, { th: trial.word.th, voice: trial.voice, rate: trial.rate }], 600)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">
                    <RotateCcw size={13} className="mr-1 inline" />Compare again
                  </button>
                )}
                <button onClick={() => audio.speakSequence(trial.set.words.map((w) => ({ th: w.th, voice: trial.voice, rate: trial.rate })), 500)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">
                  <Volume2 size={13} className="mr-1 inline" />Hear the whole set
                </button>
                <button onClick={advance} className="ml-auto rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black">Next</button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* ============================================================================
 * Module 2: Tracer dojo
 * ========================================================================== */
const TRACE_SIZE = 320;
const TRACE_FONT_PX = 220;
const TRACE_BASELINE = 230;
const TRACE_FONT = '"Noto Serif Thai", "Sarabun", serif';

const TRACE_GLYPHS = [
  { g: "ก", name: "gaw gài", cls: "mid", start: [150, 148], path: "Loopless. Begin at the beak on the upper left, arch over the roof, drop the right leg." },
  { g: "ข", name: "khǎw khài", cls: "high", start: [126, 140], path: "Head loop top-left. Drop the left wall, round the floor, climb the right wall." },
  { g: "ด", name: "daw dèk", cls: "mid", start: [156, 180], path: "Loop inside the bowl. Run down-left to the foot, climb the left wall, arch over, come down the right." },
  { g: "ต", name: "taw tào", cls: "mid", start: [159, 172], path: "Same as ด, but dip into a notch in the middle of the roof." },
  { g: "ค", name: "khaw khwaai", cls: "low", start: [150, 168], path: "Loop hangs inside the straight left wall. Start at the loop and follow the body round to the right foot." },
  { g: "ผ", name: "phǎw phʉ̂ng", cls: "high", start: [131, 126], path: "Head loop top-left. Down, up to a LOW inner peak, down, then up the right wall." },
  { g: "พ", name: "phaw phaan", cls: "low", start: [111, 126], path: "Head loop top-left. Down, up to a FULL-HEIGHT inner peak, down, then up the right wall." },
  { g: "น", name: "naw nǔu", cls: "low", start: [114, 126], path: "Head loop top-left. Down the left wall, up the diagonal, finish in a curled tail at the bottom-right." },
];

function Tracer() {
  const [sel, setSel] = useState(0);
  const [result, setResult] = useState(null);
  const canvasRef = useRef(null);
  const strokes = useRef([]);
  const drawing = useRef(false);
  const activePointer = useRef(null);
  const penSeen = useRef(false);
  const glyph = TRACE_GLYPHS[sel];

  const getCtx = () => {
    const c = canvasRef.current;
    if (!c) return null;
    const ctx = c.getContext("2d");
    return ctx;
  };

  useEffect(() => {
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = TRACE_SIZE * dpr;
    c.height = TRACE_SIZE * dpr;
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  const clear = useCallback(() => {
    activePointer.current = null;
    const ctx = getCtx();
    if (ctx) ctx.clearRect(0, 0, TRACE_SIZE, TRACE_SIZE);
    strokes.current = [];
    setResult(null);
  }, []);

  useEffect(() => { clear(); }, [sel, clear]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * TRACE_SIZE, ((e.clientY - r.top) / r.height) * TRACE_SIZE];
  };

  // Once an S Pen (or any stylus) has touched the canvas, finger and palm
  // contacts are ignored so a resting hand doesn't draw.
  const down = (e) => {
    e.preventDefault();
    if (e.pointerType === "pen") penSeen.current = true;
    else if (e.pointerType === "touch" && penSeen.current) return;
    if (activePointer.current != null) return;
    activePointer.current = e.pointerId;
    try {
      canvasRef.current.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone */
    }
    drawing.current = true;
    strokes.current.push([pos(e)]);
    setResult(null);
  };
  const move = (e) => {
    if (!drawing.current || e.pointerId !== activePointer.current) return;
    const s = strokes.current[strokes.current.length - 1];
    const ctx = getCtx();
    ctx.strokeStyle = "#F59E0B";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "#F59E0B";
    ctx.shadowBlur = 8;
    // Pens report up to 240 samples a second; draw all of them, not just one per frame.
    const samples = e.nativeEvent.getCoalescedEvents?.() || [];
    (samples.length ? samples : [e.nativeEvent]).forEach((ev) => {
      const p = pos(ev);
      const prev = s[s.length - 1];
      s.push(p);
      ctx.lineWidth = e.pointerType === "pen" && ev.pressure > 0 ? 6 + ev.pressure * 16 : 14;
      ctx.beginPath();
      ctx.moveTo(prev[0], prev[1]);
      ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    });
  };
  const up = (e) => {
    if (e && e.pointerId !== activePointer.current) return;
    drawing.current = false;
    activePointer.current = null;
  };

  const check = async () => {
    if (!strokes.current.length) return;
    try { await document.fonts?.load(`${TRACE_FONT_PX}px "Noto Serif Thai"`, glyph.g); } catch { /* fallback font */ }
    const S = TRACE_SIZE;
    const mk = () => { const c = document.createElement("canvas"); c.width = S; c.height = S; return c.getContext("2d", { willReadFrequently: true }); };
    const gctx = mk();
    gctx.font = `${TRACE_FONT_PX}px ${TRACE_FONT}`;
    gctx.textAlign = "center";
    gctx.fillStyle = "#000";
    gctx.fillText(glyph.g, S / 2, TRACE_BASELINE);
    const tctx = mk();
    tctx.font = gctx.font;
    tctx.textAlign = "center";
    tctx.lineWidth = 26;
    tctx.lineJoin = "round";
    tctx.strokeStyle = "#000";
    tctx.strokeText(glyph.g, S / 2, TRACE_BASELINE);
    tctx.fillText(glyph.g, S / 2, TRACE_BASELINE);
    const uctx = mk();
    uctx.strokeStyle = "#000";
    uctx.lineWidth = 22;
    uctx.lineCap = "round";
    uctx.lineJoin = "round";
    strokes.current.forEach((s) => {
      uctx.beginPath();
      s.forEach(([x, y], i) => (i ? uctx.lineTo(x, y) : uctx.moveTo(x, y)));
      if (s.length === 1) uctx.lineTo(s[0][0] + 0.1, s[0][1]);
      uctx.stroke();
    });
    const G = gctx.getImageData(0, 0, S, S).data;
    const T = tctx.getImageData(0, 0, S, S).data;
    const U = uctx.getImageData(0, 0, S, S).data;
    let gTot = 0; let gHit = 0; let uTot = 0; let uIn = 0;
    for (let i = 3; i < G.length; i += 4) {
      const g = G[i] > 100; const u = U[i] > 100;
      if (g) { gTot += 1; if (u) gHit += 1; }
      if (u) { uTot += 1; if (T[i] > 100) uIn += 1; }
    }
    const coverage = gTot ? gHit / gTot : 0;
    const accuracy = uTot ? uIn / uTot : 0;
    const first = strokes.current[0][0];
    const startDist = Math.hypot(first[0] - glyph.start[0], first[1] - glyph.start[1]);
    const score = Math.round(100 * (0.55 * coverage + 0.45 * accuracy));
    setResult({ coverage, accuracy, score, startOk: startDist < 34 });
    const audio = getAudio();
    audio.playRanatToneChime(score >= 70 ? ["high"] : ["low"]);
  };

  return (
    <div className="space-y-4">
      <SectionTitle icon={PenTool} title="Head-Loop Tracing Dojo" sub="Start every letter at its golden head (1), then follow the body. Feel the loop under your finger or S Pen." color={COLORS.cyan} />
      <div className="flex flex-wrap gap-2">
        {TRACE_GLYPHS.map((t, i) => (
          <button key={t.g} onClick={() => setSel(i)} className={`h-12 w-12 rounded-xl border text-2xl transition ${i === sel ? "border-cyan-400 bg-cyan-400/20 text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`} style={{ fontFamily: TRACE_FONT }}>
            {t.g}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="mx-auto w-full max-w-[360px] p-3" glow={COLORS.cyan}>
          <div className="relative aspect-square w-full touch-none select-none">
            <svg viewBox={`0 0 ${TRACE_SIZE} ${TRACE_SIZE}`} className="absolute inset-0 h-full w-full">
              {[...Array(9)].map((_, i) => (
                <g key={i} stroke="#ffffff0d">
                  <line x1={i * 40} y1={0} x2={i * 40} y2={TRACE_SIZE} />
                  <line x1={0} y1={i * 40} x2={TRACE_SIZE} y2={i * 40} />
                </g>
              ))}
              <line x1={0} x2={TRACE_SIZE} y1={TRACE_BASELINE} y2={TRACE_BASELINE} stroke="#22D3EE33" strokeDasharray="6 6" />
              <text x={TRACE_SIZE / 2} y={TRACE_BASELINE} textAnchor="middle" fontSize={TRACE_FONT_PX} fill="#22D3EE26" stroke="#22D3EE88" strokeWidth="1.5" style={{ fontFamily: TRACE_FONT }}>{glyph.g}</text>
              <circle cx={glyph.start[0]} cy={glyph.start[1]} r="16" fill="#F59E0B33" stroke="#F59E0B" strokeWidth="2">
                <animate attributeName="r" values="13;18;13" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <text x={glyph.start[0]} y={glyph.start[1] + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill="#FDE68A">1</text>
            </svg>
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-crosshair touch-none select-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={clear} className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-300 hover:bg-white/5"><Eraser size={15} className="mr-1 inline" />Clear</button>
            <button onClick={check} className="flex-1 rounded-xl bg-cyan-500 py-2 text-sm font-bold text-black"><Check size={15} className="mr-1 inline" />Check</button>
          </div>
        </Card>
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl text-white" style={{ fontFamily: TRACE_FONT }}>{glyph.g}</span>
              <div>
                <div className="font-semibold text-white">{glyph.name}</div>
                <div className="mt-1"><ClassBadge cls={glyph.cls} small /></div>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300">{glyph.path}</p>
            <p className="mt-2 text-xs text-slate-400">The tracer always uses head-loop type, because that is where the loops are visible.</p>
          </Card>
          {result && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl font-black" style={{ color: result.score >= 70 ? "#34D399" : result.score >= 45 ? COLORS.gold : "#F43F5E" }}>{result.score}</div>
                <div className="text-sm text-slate-300">
                  {result.score >= 70 ? "Clean trace." : result.score >= 45 ? "Close. Follow the outline more tightly." : "Try again, slower, on the outline."}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white/5 p-2"><div className="font-bold text-white">{Math.round(result.coverage * 100)}%</div>coverage</div>
                <div className="rounded-xl bg-white/5 p-2"><div className="font-bold text-white">{Math.round(result.accuracy * 100)}%</div>on the line</div>
                <div className="rounded-xl bg-white/5 p-2"><div className={`font-bold ${result.startOk ? "text-emerald-300" : "text-rose-300"}`}>{result.startOk ? "Yes" : "No"}</div>started at 1</div>
              </div>
            </Card>
          )}
          <Card className="p-4 text-sm text-slate-300">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-cyan-300">Feel the difference</div>
            <ul className="list-disc space-y-1 pl-5">
              <li><b>ด vs ค</b>: ด's loop sits inside the bowl with a diagonal run to the foot. ค's loop hangs off a straight left wall.</li>
              <li><b>ผ vs พ</b>: same start, but พ's inner peak climbs to full height.</li>
              <li><b>ก</b> has no loop at all. Start at the beak.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * Module 3: Tone Alchemy Reactor
 * ========================================================================== */
const REACTOR_CONS = {
  mid: [{ th: "ก", lo: "ກ", label: "ก k" }],
  high: [{ th: "ข", lo: "ຂ", label: "ข kh" }],
  low: [
    { th: "ค", lo: "ຄ", label: "ค kh (aspirate)" },
    { th: "ม", lo: "ມ", label: "ม m (sonorant)", hnTh: "หม", hnLo: "ໝ" },
  ],
};

function buildSyllable(script, cons, { live, long, mark }) {
  const T = script === "th"
    ? { aa: "า", a: "ะ", sa: "ั", nFin: "น", pFin: "บ" }
    : { aa: "າ", a: "ະ", sa: "ັ", nFin: "ນ", pFin: "ບ" };
  const m = MARKS[mark][script];
  if (live && long) return `${cons}${m}${T.aa}`; // Caa
  if (live && !long) return `${cons}${T.sa}${m}${T.nFin}`; // Can
  if (!live && long) return `${cons}${m}${T.aa}${T.pFin}`; // Caap
  return `${cons}${m}${T.a}`; // Ca
}

function Reactor({ mode, font }) {
  const [cls, setCls] = useState("low");
  const [lowIdx, setLowIdx] = useState(1);
  const [live, setLive] = useState(true);
  const [long, setLong] = useState(true);
  const [mark, setMark] = useState("none");
  const [hn, setHn] = useState(false);

  const consObj = cls === "low" ? REACTOR_CONS.low[lowIdx] : REACTOR_CONS[cls][0];
  const hnActive = cls === "low" && !!consObj.hnTh && hn;
  const thCons = hnActive ? consObj.hnTh : consObj.th;
  const loCons = hnActive ? consObj.hnLo : consObj.lo;
  const th = buildSyllable("th", thCons, { live, long, mark });
  const lo = buildSyllable("lo", loCons, { live, long, mark });
  const res = computeTone({ cls, live, long, mark, hn: hnActive });
  const t = TONES[res.tone];

  const preset = (p) => {
    setCls(p.cls); setLowIdx(p.lowIdx ?? 1); setLive(p.live); setLong(p.long); setMark(p.mark); setHn(!!p.hn);
  };

  const syllableShape = live ? (long ? "long open (Caa)" : "short + n (Can)") : long ? "long + p (Caap)" : "short open (Ca)";

  return (
    <div className="space-y-4">
      <SectionTitle icon={FlaskConical} title="Tone Alchemy Reactor" sub="Mix class, syllable type, vowel length and tone mark. The reactor derives the tone." color={COLORS.magenta} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-4">
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">1 · Consonant class</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CLASSES).map(([k, c]) => (
                <Chip key={k} active={cls === k} color={c.color} onClick={() => setCls(k)}>{c.name}<span className="ml-1 text-xs opacity-60">{c.persona}</span></Chip>
              ))}
            </div>
            {cls === "low" && (
              <div className="mt-2 flex flex-wrap gap-2">
                {REACTOR_CONS.low.map((c, i) => <Chip key={c.th} active={lowIdx === i} color={COLORS.purple} onClick={() => setLowIdx(i)}>{c.label}</Chip>)}
              </div>
            )}
          </div>
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">2 · Syllable ending</div>
            <div className="flex gap-2">
              <Chip active={live} color="#34D399" onClick={() => setLive(true)}>Live คำเป็น</Chip>
              <Chip active={!live} color="#F43F5E" onClick={() => setLive(false)}>Dead คำตาย</Chip>
            </div>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">3 · Vowel length</div>
            <div className="flex gap-2">
              <Chip active={long} onClick={() => setLong(true)}>Long</Chip>
              <Chip active={!long} onClick={() => setLong(false)}>Short</Chip>
            </div>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">4 · Tone mark</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MARKS).map(([k, m]) => <Chip key={k} active={mark === k} color={COLORS.magenta} onClick={() => setMark(k)}>{m.name}</Chip>)}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">5 · Silent ห นำ / ຫ ນຳ</div>
            <Chip active={hnActive} color={COLORS.cyan} disabled={!(cls === "low" && consObj.hnTh)} onClick={() => setHn(!hn)}>
              {hnActive ? "On: ห lifts ม to High class" : "Off"}
            </Chip>
            {!(cls === "low" && consObj.hnTh) && <p className="mt-1 text-xs text-slate-400">Only works on a Low-class sonorant. Pick Low → ม.</p>}
          </div>
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Presets</div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Chip onClick={() => preset({ cls: "low", live: true, long: true, mark: "none" })}>มา come</Chip>
              <Chip onClick={() => preset({ cls: "low", live: true, long: true, mark: "tho" })}>ม้า horse</Chip>
              <Chip onClick={() => preset({ cls: "low", live: true, long: true, mark: "none", hn: true })}>หมา dog</Chip>
              <Chip onClick={() => preset({ cls: "low", lowIdx: 0, live: false, long: false, mark: "ek" })}>ค่ะ polite</Chip>
              <Chip onClick={() => preset({ cls: "high", live: true, long: true, mark: "none" })}>ขา leg</Chip>
            </div>
          </div>
        </Card>

        <Card className="p-5" glow={t.color}>
          <div className="text-center">
            <DualText th={th} lo={lo} mode={mode} font={font} className="text-7xl leading-[1.4] text-white" />
            <div className="mt-1 text-xs text-slate-400">Shape: {syllableShape}</div>
            <div className="mt-3"><ToneBadge tone={res.tone} /></div>
            <div className="mt-1 text-sm text-slate-400">Thai name: เสียง{t.th}</div>
          </div>
          <div className="mt-4 rounded-2xl bg-black/30 p-3">
            <ToneContour tone={res.tone} />
          </div>
          <div className="mt-4 rounded-2xl border border-pink-400/20 bg-pink-500/5 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-pink-300">Equation</div>
            <div className="mt-1 font-semibold text-white">{res.formula}</div>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-300">
              {res.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            {res.warning && <p className="mt-2 flex gap-2 text-xs text-amber-300"><AlertTriangle size={14} className="shrink-0" />{res.warning}</p>}
          </div>
          {mode !== "th" && (
            <p className="mt-3 flex gap-2 text-xs text-slate-400">
              <Info size={14} className="shrink-0 text-purple-300" />
              Lao uses the same class × live/dead × mark logic, but Vientiane Lao has its own tone values (and up to six tones), so the contour above is Bangkok Thai.
            </p>
          )}
          <div className="mt-4 flex justify-center">
            <AudioButtons ttsTh={th} ttsLo={th} loRaw={lo} tones={[res.tone]} mode={mode === "lo" ? "th" : "th"} />
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">Some combinations are valid spelling but not real words; the voice reads them as written.</p>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================================
 * Module 4: Orbital Vowel Compass + Lookalike traps
 * ========================================================================== */
const ORBIT_CONS = [
  { th: "ก", lo: "ກ", r: "k", cls: "mid" },
  { th: "ด", lo: "ດ", r: "d", cls: "mid" },
  { th: "ข", lo: "ຂ", r: "kh", cls: "high" },
  { th: "ส", lo: "ສ", r: "s", cls: "high" },
  { th: "ม", lo: "ມ", r: "m", cls: "low" },
  { th: "น", lo: "ນ", r: "n", cls: "low" },
];

const ORBIT_VOWELS = [
  { id: "e", dir: "W", th: "เ", lo: "ເ", r: "ee", long: true, open: true, kind: "pre" },
  { id: "ae", dir: "W", th: "แ", lo: "ແ", r: "ɛɛ", long: true, open: true, kind: "pre" },
  { id: "o", dir: "W", th: "โ", lo: "ໂ", r: "oo", long: true, open: true, kind: "pre" },
  { id: "ai", dir: "W", th: "ไ", lo: "ໄ", r: "ai", long: false, open: false, kind: "pre", note: "ai ends in a glide, so it is live." },
  { id: "i", dir: "N", th: "ิ", lo: "ິ", r: "i", long: false, open: true, kind: "post" },
  { id: "ii", dir: "N", th: "ี", lo: "ີ", r: "ii", long: true, open: true, kind: "post" },
  { id: "u", dir: "S", th: "ุ", lo: "ຸ", r: "u", long: false, open: true, kind: "post" },
  { id: "uu", dir: "S", th: "ู", lo: "ູ", r: "uu", long: true, open: true, kind: "post" },
  { id: "aa", dir: "E", th: "า", lo: "າ", r: "aa", long: true, open: true, kind: "post" },
  { id: "a", dir: "E", th: "ะ", lo: "ະ", r: "a", long: false, open: true, kind: "post" },
  { id: "ia", dir: "O", th: "เ◌ีย", lo: "ເ◌ຍ", r: "ia", long: true, open: true, kind: "ia" },
  { id: "ao", dir: "O", th: "เ◌า", lo: "ເ◌ົາ", r: "ao", long: false, open: false, kind: "ao", note: "ao ends in a glide, so it is live." },
];

function composeVowel(v, c, script) {
  if (v.kind === "pre") return v[script] + c;
  if (v.kind === "post") return c + v[script];
  if (v.kind === "ia") return script === "th" ? `เ${c}ีย` : `ເ${c}ຍ`;
  return script === "th" ? `เ${c}า` : `ເ${c}ົາ`;
}
function vowelForm(v, script) {
  if (v.kind === "pre") return `${v[script]}◌`;
  if (v.kind === "post") return `◌${v[script]}`;
  return v[script];
}

const DIRS = {
  W: { label: "West · in front", pos: "col-start-1 row-start-2" },
  N: { label: "North · roof", pos: "col-start-2 row-start-1" },
  S: { label: "South · under", pos: "col-start-2 row-start-3" },
  E: { label: "East · behind", pos: "col-start-3 row-start-2" },
};

const TRAPS = [
  {
    title: "ด vs ต vs ค",
    items: [
      { th: "ด", lo: "ດ", r: "d", cls: "mid", note: "Smooth roof. Loop inside the bowl, diagonal run to the foot." },
      { th: "ต", lo: "ຕ", r: "t", cls: "mid", note: "Same body as ด with a notch dipping into the roof." },
      { th: "ค", lo: "ຄ", r: "kh", cls: "low", note: "Straight left wall; the loop hangs inside it." },
    ],
  },
  {
    title: "ผ / ฝ vs พ / ฟ",
    items: [
      { th: "ผ", lo: "ຜ", r: "ph", cls: "high", note: "Inner peak stays low." },
      { th: "ฝ", lo: "ຝ", r: "f", cls: "high", note: "ผ + tall tail." },
      { th: "พ", lo: "ພ", r: "ph", cls: "low", note: "Inner peak reaches full height." },
      { th: "ฟ", lo: "ຟ", r: "f", cls: "low", note: "พ + tall tail." },
    ],
  },
  {
    title: "น vs ม vs บ / ป",
    items: [
      { th: "น", lo: "ນ", r: "n", cls: "low", note: "Curled tail at bottom-right." },
      { th: "ม", lo: "ມ", r: "m", cls: "low", note: "Second loop at bottom-left." },
      { th: "บ", lo: "ບ", r: "b", cls: "mid", note: "Flat floor, no tail." },
      { th: "ป", lo: "ປ", r: "p", cls: "mid", note: "บ + tall right tail." },
    ],
  },
];

const SILENT_KILLERS = [
  { th: "ไปรษณีย์", silent: "ย์", lo: "ໄປສະນີ", r: "prai-sà-nii", m: "post office", ttsTh: "ไปรษณีย์", ttsLo: "ไปสะนี" },
  { th: "เบียร์", silent: "ร์", lo: "ເບຍ", r: "bia", m: "beer", ttsTh: "เบียร์", ttsLo: "เบีย" },
  { th: "ศูนย์", silent: "ย์", lo: "ສູນ", r: "sǔun", m: "zero / centre", ttsTh: "ศูนย์", ttsLo: "สูน" },
  { th: "อาทิตย์", silent: "ย์", lo: "ອາທິດ", r: "aa-thít", m: "sun / week", ttsTh: "อาทิตย์", ttsLo: "อาทิด" },
];

function OrbitModule({ mode, font }) {
  const [ci, setCi] = useState(0);
  const [vid, setVid] = useState("ii");
  const c = ORBIT_CONS[ci];
  const v = ORBIT_VOWELS.find((x) => x.id === vid);
  const th = composeVowel(v, c.th, "th");
  const lo = composeVowel(v, c.lo, "lo");
  const live = !v.open || v.long;
  const tone = computeTone({ cls: c.cls, live, long: v.long, mark: "none" });
  const showScripts = mode === "dual" ? ["th", "lo"] : [mode];

  const vowelBtn = (x) => (
    <button
      key={x.id}
      onClick={() => setVid(x.id)}
      className={`min-w-[52px] rounded-xl border px-2 py-1 text-xl transition ${x.id === vid ? "border-amber-400 bg-amber-400/20 text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
    >
      <Glyph text={vowelForm(x, mode === "lo" ? "lo" : "th")} script={mode === "lo" ? "lo" : "th"} font={font} />
    </button>
  );

  return (
    <div className="space-y-6">
      <SectionTitle icon={Compass} title="360° Orbital Vowel Compass" sub="Vowels orbit the consonant in every direction, but the consonant is always spoken first." color={COLORS.gold} />
      <div className="flex flex-wrap gap-2">
        {ORBIT_CONS.map((x, i) => (
          <Chip key={x.th} active={i === ci} color={CLASSES[x.cls].color} onClick={() => setCi(i)}>
            <DualText th={x.th} lo={x.lo} mode={mode} font={font} className="text-xl" gapClass="gap-1" divider={false} />
          </Chip>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="grid grid-cols-3 grid-rows-3 items-center justify-items-center gap-2">
            {Object.entries(DIRS).map(([d, info]) => (
              <div key={d} className={`${info.pos} flex flex-col items-center gap-1`}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{info.label}</div>
                <div className="flex flex-wrap justify-center gap-1">{ORBIT_VOWELS.filter((x) => x.dir === d).map(vowelBtn)}</div>
              </div>
            ))}
            <div className="col-start-2 row-start-2 flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-amber-400/40" style={{ boxShadow: "inset 0 0 30px #F59E0B22" }}>
              <DualText th={c.th} lo={c.lo} mode={mode === "dual" ? "th" : mode} font={font} className="text-6xl leading-none text-cyan-300" />
            </div>
          </div>
          <div className="mt-3 border-t border-white/5 pt-3 text-center">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Surrounding · 360°</div>
            <div className="flex justify-center gap-2">{ORBIT_VOWELS.filter((x) => x.dir === "O").map(vowelBtn)}</div>
          </div>
        </Card>
        <Card className="p-5 text-center" glow={COLORS.gold}>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {showScripts.map((s) => (
              <div key={s}>
                <Glyph text={s === "th" ? th : lo} script={s} font={font} className="text-7xl leading-[1.5] text-white" />
                <div className="text-[11px] uppercase tracking-wider text-slate-400">{s === "th" ? "Thai" : "Lao"} · vowel form <Glyph text={vowelForm(v, s)} script={s} font={font} className="text-base normal-case text-amber-300" /></div>
              </div>
            ))}
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-black/30 px-4 py-2 text-lg">
            <span className="font-bold text-cyan-300">{c.r}</span>
            <span className="text-slate-400">+</span>
            <span className="font-bold text-amber-300">{v.r}</span>
            <span className="text-slate-400">=</span>
            <span className="font-black text-white">{c.r}{v.r}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Written {v.dir === "W" ? "in front of" : v.dir === "N" ? "above" : v.dir === "S" ? "below" : v.dir === "E" ? "after" : "around"} the consonant, read after it. {v.long ? "Long" : "Short"} vowel{v.note ? `; ${v.note}` : ""}.
          </p>
          <div className="mt-3"><ToneBadge tone={tone.tone} /></div>
          <div className="mt-1 text-xs text-slate-400">{tone.formula}</div>
          <div className="mt-4 flex justify-center"><AudioButtons ttsTh={th} ttsLo={th} loRaw={lo} tones={[tone.tone]} mode={mode} /></div>
        </Card>
      </div>

      <SectionTitle icon={Eye} title="Lookalike Trap Dojo" sub="X-ray the letters that trip everyone up." color="#F43F5E" />
      <div className="grid gap-4 lg:grid-cols-3">
        {TRAPS.map((group) => (
          <Card key={group.title} className="p-4">
            <div className="mb-3 font-bold text-white">{group.title}</div>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map((x) => (
                <div key={x.th} className="rounded-2xl bg-black/30 p-3 text-center">
                  <DualText th={x.th} lo={x.lo} mode={mode} font="loop" className="text-5xl leading-[1.4] text-white" gapClass="gap-2" divider={false} />
                  <div className="text-xs font-bold" style={{ color: CLASSES[x.cls].color }}>{x.r} · {CLASSES[x.cls].name}</div>
                  <div className="mt-1 text-[11px] leading-snug text-slate-400">{x.note}</div>
                  <button className="mt-1 text-slate-400 hover:text-white" aria-label="Speak" onClick={() => getAudio().speakHumanVoice(`${x.th}อ`)}><Volume2 size={14} /></button>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="mb-1 font-bold text-white">Silent killer: Thai ◌์ การันต์ vs phonetic Lao</div>
        <p className="mb-3 text-sm text-slate-400">Thai keeps letters from Sanskrit and English spellings and silences them with ◌์. Modern Lao mostly writes what it says.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SILENT_KILLERS.map((w) => {
            const head = w.th.slice(0, w.th.length - w.silent.length);
            return (
              <div key={w.th} className="rounded-2xl bg-black/30 p-3 text-center">
                {mode !== "lo" && (
                  <div className="text-3xl leading-[1.6] text-white" style={{ fontFamily: FONT_STACKS[font].th }}>
                    {head}<span className="text-rose-400 line-through decoration-2">{w.silent}</span>
                  </div>
                )}
                {mode !== "th" && <div className="text-3xl leading-[1.6] text-purple-200" style={{ fontFamily: FONT_STACKS[font].lo }}>{w.lo}</div>}
                <div className="text-xs text-slate-300">{w.r} · {w.m}</div>
                <div className="mt-2 flex justify-center"><AudioButtons ttsTh={w.ttsTh} ttsLo={w.ttsLo} loRaw={w.lo} mode={mode} compact /></div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================================
 * Module 5: Zero-space Script Slicer
 * ========================================================================== */
const COMBINING = /[ัิ-ฺ็-๎ັິ-ຼ່-ໍ]/;
function clusters(str) {
  const out = [];
  for (const ch of str) {
    if (COMBINING.test(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

const SENTENCES = [
  {
    id: "eat", script: "th", gloss: "I eat delicious rice and drink water.",
    words: [
      { w: "ฉัน", r: "chǎn", m: "I", tts: "ฉัน", tone: ["rising"] },
      { w: "กิน", r: "gin", m: "eat", tts: "กิน", tone: ["mid"] },
      { w: "ข้าว", r: "khâaw", m: "rice", tts: "ข้าว", tone: ["falling"] },
      { w: "แซ่บ", r: "sɛ̂ɛp", m: "delicious", tts: "แซ่บ", tone: ["falling"] },
      { w: "และ", r: "lɛ́", m: "and", tts: "และ", tone: ["high"] },
      { w: "ดื่ม", r: "dʉ̀ʉm", m: "drink", tts: "ดื่ม", tone: ["low"] },
      { w: "น้ำ", r: "náam", m: "water", tts: "น้ำ", tone: ["high"] },
    ],
  },
  {
    id: "eat", script: "lo", gloss: "I eat delicious rice and drink water.",
    words: [
      { w: "ຂ້ອຍ", r: "khoi", m: "I", tts: "ข้อย" },
      { w: "ກິນ", r: "kin", m: "eat", tts: "กิน" },
      { w: "ເຂົ້າ", r: "khao", m: "rice", tts: "เข้า" },
      { w: "ແຊບ", r: "xaep", m: "delicious", tts: "แซบ" },
      { w: "ແລະ", r: "lae", m: "and", tts: "และ" },
      { w: "ດື່ມ", r: "deum", m: "drink", tts: "ดื่ม" },
      { w: "ນ້ຳ", r: "nam", m: "water", tts: "น้ำ" },
    ],
  },
  {
    id: "meet", script: "th", gloss: "Hello, nice to meet you.",
    words: [
      { w: "สวัสดี", r: "sà-wàt-dii", m: "hello", tts: "สวัสดี", tone: ["low", "low", "mid"] },
      { w: "ครับ", r: "khráp", m: "(polite particle, male)", tts: "ครับ", tone: ["high"] },
      { w: "ยินดี", r: "yin-dii", m: "glad", tts: "ยินดี", tone: ["mid", "mid"] },
      { w: "ที่", r: "thîi", m: "that / to", tts: "ที่", tone: ["falling"] },
      { w: "ได้", r: "dâi", m: "get to", tts: "ได้", tone: ["falling"] },
      { w: "รู้จัก", r: "rúu-jàk", m: "know (someone)", tts: "รู้จัก", tone: ["high", "low"] },
    ],
  },
  {
    id: "meet", script: "lo", gloss: "Hello, nice to meet you.",
    words: [
      { w: "ສະບາຍດີ", r: "sabaidee", m: "hello", tts: "สะบายดี" },
      { w: "ຍິນດີ", r: "nyin dii", m: "glad", tts: "ยินดี" },
      { w: "ທີ່", r: "thii", m: "that / to", tts: "ที่" },
      { w: "ໄດ້", r: "dai", m: "get to", tts: "ได้" },
      { w: "ຮູ້ຈັກ", r: "hu chak", m: "know (someone)", tts: "ฮู้จัก" },
    ],
  },
];

function SliceSentence({ sentence, font, mode }) {
  const text = sentence.words.map((w) => w.w).join("");
  const cl = useMemo(() => clusters(text), [text]);
  const truth = useMemo(() => {
    const s = new Set();
    let acc = 0;
    sentence.words.forEach((w, i) => {
      acc += clusters(w.w).length;
      if (i < sentence.words.length - 1) s.add(acc);
    });
    return s;
  }, [sentence]);
  const [cuts, setCuts] = useState(new Set());
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(null);

  const toggle = (i) => {
    setChecked(false);
    setCuts((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };
  const correct = [...cuts].filter((c) => truth.has(c)).length;
  const wrong = [...cuts].filter((c) => !truth.has(c)).length;
  const perfect = checked && correct === truth.size && wrong === 0;
  const audio = getAudio();
  const isLo = sentence.script === "lo";

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: isLo ? COLORS.purple : COLORS.cyan }}>{isLo ? "Lao ລາວ" : "Thai ไทย"}</div>
        <button className="text-xs text-slate-400 hover:text-white" onClick={() => audio.speakHumanVoice(sentence.words.map((w) => w.tts).join(" "), isLo ? text : undefined)}>
          <Volume2 size={14} className="mr-1 inline" />Play sentence
        </button>
      </div>
      <div className="flex flex-wrap items-stretch justify-center rounded-2xl bg-black/30 px-2 py-4" style={{ fontFamily: FONT_STACKS[font][sentence.script] }}>
        {cl.map((ch, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <button
                onClick={() => toggle(i)}
                aria-label={`Cut before character ${i + 1}`}
                className="group relative -mx-1 w-3 shrink-0"
              >
                <span
                  className={`absolute inset-y-1 left-1/2 w-[3px] -translate-x-1/2 rounded-full transition ${
                    cuts.has(i)
                      ? checked ? (truth.has(i) ? "bg-emerald-400 shadow-[0_0_10px_#34D399]" : "bg-rose-500 shadow-[0_0_10px_#F43F5E]") : "bg-amber-400 shadow-[0_0_12px_#F59E0B]"
                      : checked && truth.has(i) ? "bg-emerald-400/30" : "bg-transparent group-hover:bg-white/20"
                  }`}
                />
              </button>
            )}
            <span className="select-none text-4xl leading-[1.7] text-white sm:text-5xl">{ch}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setChecked(true)} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black"><Scissors size={15} className="mr-1 inline" />Check cuts</button>
        <button onClick={() => { setCuts(new Set()); setChecked(false); }} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300"><RotateCcw size={14} className="mr-1 inline" />Reset</button>
        <button onClick={() => { setCuts(new Set(truth)); setChecked(true); }} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300"><Eye size={14} className="mr-1 inline" />Reveal</button>
        {checked && (
          <span className={`text-sm font-semibold ${perfect ? "text-emerald-300" : "text-slate-300"}`}>
            {perfect ? "Perfect segmentation." : `${correct}/${truth.size} boundaries found${wrong ? `, ${wrong} extra cut${wrong > 1 ? "s" : ""}` : ""}.`}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">“{sentence.gloss}” · Tap the gaps between characters to drop a cut.</p>
      {checked && (
        <div className="mt-3 flex flex-wrap gap-2">
          {sentence.words.map((w, i) => (
            <button key={i} onClick={() => setOpen(open === i ? null : i)} className={`rounded-xl border px-3 py-1.5 text-left transition ${open === i ? "border-amber-400 bg-amber-400/10" : "border-white/10 hover:bg-white/5"}`}>
              <span className="text-xl text-white" style={{ fontFamily: FONT_STACKS[font][sentence.script] }}>{w.w}</span>
              <span className="ml-2 text-xs text-slate-400">{w.m}</span>
            </button>
          ))}
        </div>
      )}
      {checked && open !== null && (
        <div className="mt-3 rounded-2xl bg-white/[0.04] p-3">
          {(() => {
            const w = sentence.words[open];
            return (
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-5xl leading-[1.5] text-white" style={{ fontFamily: FONT_STACKS[font][sentence.script] }}>{w.w}</span>
                <div className="space-y-1 text-sm">
                  <div className="text-white">{w.r} · {w.m}</div>
                  {w.tone ? <div className="flex gap-1">{w.tone.map((t, i) => <ToneBadge key={i} tone={t} small />)}</div> : <div className="text-xs text-slate-400">Vientiane tones differ from Thai; listen and compare.</div>}
                  <AudioButtons ttsTh={w.tts} ttsLo={w.tts} loRaw={isLo ? w.w : undefined} tones={w.tone} mode={isLo ? "lo" : "th"} compact />
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </Card>
  );
}

function Slicer({ mode, font }) {
  const [sid, setSid] = useState("eat");
  const list = SENTENCES.filter((s) => s.id === sid && (mode === "dual" || s.script === mode));
  return (
    <div className="space-y-4">
      <SectionTitle icon={Scissors} title="Zero-Space Script Slicer" sub="Thai and Lao write words with no spaces. Find the word boundaries with golden laser cuts." color={COLORS.gold} />
      <div className="flex gap-2">
        <Chip active={sid === "eat"} onClick={() => setSid("eat")}>Eating</Chip>
        <Chip active={sid === "meet"} onClick={() => setSid("meet")}>Greeting</Chip>
      </div>
      {list.map((s) => <SliceSentence key={`${s.id}-${s.script}`} sentence={s} font={font} mode={mode} />)}
    </div>
  );
}

/* ============================================================================
 * Module: Mekong Predictor (build the Lao spelling from the Thai, or back)
 * ========================================================================== */
const BRIDGE_LAWS = [
  { id: "cluster", name: "Clusters drop", rule: "Thai keeps old pl-, kr-, kl- clusters. Lao drops the second consonant.", words: [
    { th: "ปลา", lo: "ປາ", r: "plaa → paa", m: "fish", tl: "ปา", naive: [["ປລາ", "You kept the l. Lao drops the second consonant of a cluster."]] },
    { th: "ครู", lo: "ຄູ", r: "khruu → khuu", m: "teacher", tl: "คู", naive: [["ຄຣູ", "You kept the r. Lao drops it: ຄູ."], ["ຄລູ", "Lao drops the second consonant entirely."]] },
    { th: "กลาง", lo: "ກາງ", r: "klaang → kaang", m: "middle", tl: "กาง", naive: [["ກລາງ", "You kept the l. Lao drops the second consonant of a cluster."]] },
    { th: "ใกล้", lo: "ໃກ້", r: "klâi → kai", m: "near", tl: "ใก้", naive: [["ໃກລ້", "You kept the l. Lao drops it, and the tone mark moves onto ກ."]] },
  ] },
  { id: "r-h", name: "ร becomes ຮ", rule: "In native words Thai r usually corresponds to Lao h (ຮ).", words: [
    { th: "รัก", lo: "ຮັກ", r: "rák → hak", m: "love", tl: "ฮัก", naive: [["ລັກ", "Here Lao uses ຮ (h), not ລ. ລັກ means 'steal'."], ["ຣັກ", "Lao ຣ is for names and loans. Native words use ຮ."]] },
    { th: "ร้อน", lo: "ຮ້ອນ", r: "ráwn → hon", m: "hot", tl: "ฮ้อน", naive: [["ລ້ອນ", "Native Thai ร → Lao ຮ here."]] },
    { th: "เรือน", lo: "ເຮືອນ", r: "rʉan → heuan", m: "house", tl: "เฮือน", naive: [["ເລືອນ", "Native Thai ร → Lao ຮ here."]] },
    { th: "รู้", lo: "ຮູ້", r: "rúu → hu", m: "know", tl: "ฮู้", naive: [["ລູ້", "Native Thai ร → Lao ຮ here."]] },
  ] },
  { id: "ch-x", name: "ช and ซ become ຊ", rule: "Thai ch (ช) and s (ซ) both correspond to Lao ຊ, pronounced s or x.", words: [
    { th: "ช้าง", lo: "ຊ້າງ", r: "cháang → xang", m: "elephant", tl: "ซ้าง", naive: [["ຈ້າງ", "Thai ช is not Lao ຈ. Use ຊ."], ["ສ້າງ", "ສ is the high-class s. Thai ช (low) → Lao ຊ (low)."]] },
    { th: "ชื่อ", lo: "ຊື່", r: "chʉ̂ʉ → xeu", m: "name", tl: "ซื่อ", naive: [["ຊື່ອ", "Lao drops the silent อ that Thai writes after ื."]] },
    { th: "ซื้อ", lo: "ຊື້", r: "sʉ́ʉ → xeu", m: "buy", tl: "ซื้อ", naive: [["ຊື້ອ", "Lao drops the silent อ that Thai writes after ื."]] },
    { th: "ชาย", lo: "ຊາຍ", r: "chaai → xai", m: "man / male", tl: "ซาย", naive: [["ຈາຍ", "Thai ช → Lao ຊ, not ຈ."]] },
  ] },
  { id: "silent", name: "Silent letters vanish", rule: "Thai keeps etymological letters and silences them with ◌์. Lao writes only what is spoken.", words: [
    { th: "เบียร์", lo: "ເບຍ", r: "bia", m: "beer", tl: "เบีย", naive: [["ເບຍຣ໌", "Lao has no silent letters here. Drop the ร์."]] },
    { th: "ศูนย์", lo: "ສູນ", r: "sǔun → sun", m: "zero / centre", tl: "สูน", naive: [["ສູນຍ໌", "Drop the silent ย์. And ศ becomes plain ສ."]] },
    { th: "อาทิตย์", lo: "ອາທິດ", r: "aa-thít → athit", m: "sun / week", tl: "อาทิด", naive: [["ອາທິຕ", "Lao spells the final t sound with ດ."]] },
    { th: "ไปรษณีย์", lo: "ໄປສະນີ", r: "prai-sà-nii → paisanii", m: "post office", tl: "ไปสะนี", naive: [["ໄປຣສະນີ", "Drop the r of the cluster too."]] },
  ] },
  { id: "hn", name: "ห นำ becomes one letter", rule: "Lao fuses silent h + n and h + m into single letters ໜ and ໝ. Other combinations stay as two letters.", words: [
    { th: "หมา", lo: "ໝາ", r: "mǎa → maa", m: "dog", tl: "หมา", naive: [["ຫມາ", "Lao writes ຫ + ມ as the single letter ໝ."]] },
    { th: "หนาว", lo: "ໜາວ", r: "nǎaw → nao", m: "cold", tl: "หนาว", naive: [["ຫນາວ", "Lao writes ຫ + ນ as the single letter ໜ."]] },
    { th: "หมู", lo: "ໝູ", r: "mǔu → mu", m: "pig / pork", tl: "หมู", naive: [["ຫມູ", "Lao writes ຫ + ມ as ໝ."]] },
    { th: "หนึ่ง", lo: "ໜຶ່ງ", r: "nʉ̀ng → neung", m: "one", tl: "หนึ่ง", naive: [["ຫນຶ່ງ", "Lao writes ຫ + ນ as ໜ."]] },
  ] },
  { id: "sanskrit", name: "Sanskrit letters merge", rule: "Thai keeps several letters for one sound (ศ ษ ส, ภ พ, ธ ท, ณ น). Lao uses one: ສ, ພ, ທ, ນ.", words: [
    { th: "ภาษา", lo: "ພາສາ", r: "phaa-sǎa → phasa", m: "language", tl: "พาสา", naive: [["ພາຊາ", "ษ is an s sound: Lao ສ."]] },
    { th: "ศาลา", lo: "ສາລາ", r: "sǎa-laa → sala", m: "pavilion", tl: "สาลา", naive: [["ຊາລາ", "ศ is the high-class s: Lao ສ."]] },
    { th: "พิเศษ", lo: "ພິເສດ", r: "phí-sèet → phiset", m: "special", tl: "พิเสด", naive: [["ພິເສສ", "As a final, ษ sounds -t. Lao spells final t with ດ."]] },
    { th: "ธรรมดา", lo: "ທຳມະດາ", r: "tham-má-daa → thammada", m: "ordinary", tl: "ทำมะดา", naive: [["ທັມມະດາ", "Lao writes the -am syllable with ຳ."]] },
  ] },
  { id: "ua", name: "◌ัว becomes ◌ົວ", rule: "The Thai vowel -ua written ◌ัว is written ◌ົວ in Lao.", words: [
    { th: "บัว", lo: "ບົວ", r: "bua", m: "lotus", tl: "บัว", naive: [["ບັວ", "Lao uses ◌ົ (mai kon) for -ua, not ◌ັ."]] },
    { th: "หัว", lo: "ຫົວ", r: "hǔa → hua", m: "head", tl: "หัว", naive: [["ຫັວ", "Lao uses ◌ົ for -ua."]] },
    { th: "ผัว", lo: "ຜົວ", r: "phǔa → phua", m: "husband", tl: "ผัว", naive: [["ຜັວ", "Lao uses ◌ົ for -ua."]] },
  ] },
  { id: "o", name: "Hidden o gets written", rule: "Thai leaves the short o between consonants unwritten (นก). Lao writes it with ◌ົ.", words: [
    { th: "นก", lo: "ນົກ", r: "nók → nok", m: "bird", tl: "นก", naive: [["ນກ", "Lao always writes the short o: ◌ົ."]] },
    { th: "คน", lo: "ຄົນ", r: "khon", m: "person", tl: "คน", naive: [["ຄນ", "Lao writes the hidden o with ◌ົ."]] },
    { th: "ผม", lo: "ຜົມ", r: "phǒm → phom", m: "hair", tl: "ผม", naive: [["ຜມ", "Lao writes the hidden o with ◌ົ."]] },
    { th: "รถ", lo: "ລົດ", r: "rót → lot", m: "car", tl: "ลด", exception: "Law breaker: here Thai ร becomes ລ, not ຮ, and final ถ becomes ດ.", naive: [["ຮົດ", "This one breaks the ร → ຮ law: it's ລົດ."]] },
  ] },
  { id: "ia", name: "เ◌ีย becomes ເ◌ຍ or ◌ຽ", rule: "Open -ia (เ◌ีย) is ເ◌ຍ in Lao. With a final consonant it becomes ◌ຽ◌.", words: [
    { th: "เมีย", lo: "ເມຍ", r: "mia", m: "wife", tl: "เมีย", naive: [["ເມີຍ", "Lao doesn't write the ◌ີ: just ເ◌ຍ."]] },
    { th: "เสีย", lo: "ເສຍ", r: "sǐa → sia", m: "broken / lose", tl: "เสีย", naive: [["ເສີຍ", "Lao doesn't write the ◌ີ: just ເ◌ຍ."]] },
    { th: "เรียน", lo: "ຮຽນ", r: "rian → hian", m: "study", tl: "เฮียน", naive: [["ເຮຍນ", "With a final consonant, -ia is written ◌ຽ: ຮຽນ."], ["ເລຍນ", "Native ร → ຮ, and closed -ia is ◌ຽ: ຮຽນ."]] },
    { th: "เขียน", lo: "ຂຽນ", r: "khǐan → khian", m: "write", tl: "เขียน", naive: [["ເຂຍນ", "With a final consonant, -ia is written ◌ຽ: ຂຽນ."]] },
  ] },
  { id: "ao", name: "เ◌า becomes ເ◌ົາ", rule: "Thai -ao (เ◌า) is written ເ◌ົາ in Lao, with ◌ົ on top.", words: [
    { th: "เขา", lo: "ເຂົາ", r: "khǎo → khao", m: "he / she", tl: "เขา", naive: [["ເຂາ", "Lao adds ◌ົ: ເຂົາ."]] },
    { th: "เรา", lo: "ເຮົາ", r: "rao → hao", m: "we", tl: "เฮา", naive: [["ເລົາ", "Native ร → ຮ: ເຮົາ."], ["ເຮາ", "Lao adds ◌ົ: ເຮົາ."]] },
    { th: "เมา", lo: "ເມົາ", r: "mao", m: "drunk", tl: "เมา", naive: [["ເມາ", "Lao adds ◌ົ: ເມົາ."]] },
  ] },
];

const LAO_FILLERS = ["ກ", "ຂ", "ຄ", "ດ", "ຕ", "ນ", "ບ", "ມ", "ລ", "ສ", "ຫ", "ອ", "າ", "ິ", "ີ", "ັ", "່", "້"];
const THAI_FILLERS = ["ก", "ข", "ค", "ด", "ต", "น", "บ", "ม", "ร", "ล", "ส", "ห", "อ", "า", "ิ", "ี", "ั", "่", "้", "์"];
const isMark = (ch) => COMBINING.test(ch);
const showTile = (ch) => (isMark(ch) ? `◌${ch}` : ch);

function buildTiles(target, naive, fillers) {
  const need = [...target];
  const extra = new Set();
  naive.forEach(([w]) => [...w].forEach((ch) => { if (!need.includes(ch)) extra.add(ch); }));
  const pool = shuffle(fillers.filter((f) => !need.includes(f) && !extra.has(f))).slice(0, Math.max(2, 6 - extra.size));
  return shuffle([...need, ...extra, ...pool].map((ch, i) => ({ ch, key: `${i}-${ch}` })));
}

const emptyBridge = () => Object.fromEntries(BRIDGE_LAWS.map((l) => [l.id, [0, 0]]));

function MekongPredictor({ mode, font, bridge, setBridge }) {
  const [dir, setDir] = useState(mode === "lo" ? "lo2th" : "th2lo");
  const [lawId, setLawId] = useState(BRIDGE_LAWS[0].id);
  const [wi, setWi] = useState(0);
  const [built, setBuilt] = useState([]);
  const [result, setResult] = useState(null);
  const law = BRIDGE_LAWS.find((l) => l.id === lawId);
  const word = law.words[wi % law.words.length];
  const toLao = dir === "th2lo";
  const source = toLao ? word.th : word.lo;
  const target = toLao ? word.lo : word.th;
  const tiles = useMemo(
    () => buildTiles(target, toLao ? word.naive : [], toLao ? LAO_FILLERS : THAI_FILLERS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lawId, wi, dir]
  );
  const audio = getAudio();

  useEffect(() => { setBuilt([]); setResult(null); }, [lawId, wi, dir]);

  const answer = built.map((t) => t.ch).join("");
  const check = () => {
    if (!built.length) return;
    const ok = answer === target;
    const naiveHit = toLao ? word.naive.find(([w]) => w === answer) : null;
    setResult({ ok, note: ok ? null : naiveHit ? naiveHit[1] : null });
    setBridge((prev) => {
      const cur = prev[law.id] || [0, 0];
      return { ...prev, [law.id]: [cur[0] + (ok ? 1 : 0), cur[1] + 1] };
    });
    audio.speakHumanVoice(word.tl, word.lo);
  };
  const next = () => {
    const nextIdx = wi + 1;
    if (nextIdx >= law.words.length) {
      const li = BRIDGE_LAWS.findIndex((l) => l.id === law.id);
      setLawId(BRIDGE_LAWS[(li + 1) % BRIDGE_LAWS.length].id);
      setWi(0);
    } else setWi(nextIdx);
  };

  return (
    <div className="space-y-4">
      <SectionTitle icon={Languages} title="Mekong Predictor" sub="Apply the bridge laws to spell a word on the other side of the river. Building the answer yourself makes the rule stick." color={COLORS.purple} />
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={dir === "th2lo"} color={COLORS.purple} onClick={() => setDir("th2lo")}>ไทย → ລາວ</Chip>
        <Chip active={dir === "lo2th"} color={COLORS.purple} onClick={() => setDir("lo2th")}>ລາວ → ไทย</Chip>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="p-5" glow={COLORS.purple}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-300">Law {BRIDGE_LAWS.findIndex((l) => l.id === law.id) + 1} · {law.name}</div>
          <div className="mt-3 text-center">
            <div className="text-xs text-slate-400">{toLao ? "Thai" : "Lao"}</div>
            <Glyph text={source} script={toLao ? "th" : "lo"} font={font} className="text-6xl leading-[1.5] text-white" />
            <div className="text-sm text-slate-300">{word.m}</div>
          </div>
          <div className="my-3 text-center text-2xl text-purple-300">⇣</div>
          <div className={`mx-auto flex min-h-[84px] max-w-sm items-center justify-center rounded-2xl border-2 border-dashed px-4 ${result ? (result.ok ? "border-emerald-400 bg-emerald-500/10" : "border-rose-400 bg-rose-500/10") : "border-purple-400/50"}`}>
            {built.length ? (
              <Glyph text={answer} script={toLao ? "lo" : "th"} font={font} className="text-5xl leading-[1.6] text-white" />
            ) : (
              <span className="text-sm text-slate-400">Tap tiles in reading order</span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {tiles.map((t) => {
              const used = built.some((b) => b.key === t.key);
              return (
                <button
                  key={t.key}
                  disabled={used || !!result}
                  onClick={() => setBuilt([...built, t])}
                  className="min-w-[48px] rounded-xl border border-purple-400/40 bg-purple-500/15 px-2 py-1 text-3xl leading-[1.5] text-white transition active:scale-95 disabled:opacity-25"
                  style={{ fontFamily: FONT_STACKS[font][toLao ? "lo" : "th"] }}
                >
                  {showTile(t.ch)}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {!result ? (
              <>
                <button onClick={() => setBuilt(built.slice(0, -1))} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200"><ChevronLeft size={14} className="mr-1 inline" />Undo</button>
                <button onClick={() => setBuilt([])} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200"><Eraser size={14} className="mr-1 inline" />Clear</button>
                <button onClick={check} className="rounded-xl bg-purple-500 px-5 py-2 text-sm font-bold text-white"><Check size={14} className="mr-1 inline" />Check</button>
              </>
            ) : (
              <button onClick={next} className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-black">Next word <ChevronRight size={14} className="inline" /></button>
            )}
          </div>
          {result && (
            <div className="mt-4 space-y-1 rounded-2xl bg-white/[0.04] p-3 text-sm">
              <div className={`font-bold ${result.ok ? "text-emerald-300" : "text-rose-300"}`}>{result.ok ? "Correct" : "Not quite"}</div>
              {!result.ok && (
                <div className="text-slate-200">Answer: <Glyph text={target} script={toLao ? "lo" : "th"} font={font} className="text-2xl" /></div>
              )}
              {result.note && <p className="text-rose-200">{result.note}</p>}
              <p className="text-slate-300">{word.r} · {law.rule}</p>
              {word.exception && <p className="text-amber-300">{word.exception}</p>}
              <AudioButtons ttsTh={word.th} ttsLo={word.tl} loRaw={word.lo} mode="dual" compact />
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">The ten laws</div>
          <div className="space-y-1.5">
            {BRIDGE_LAWS.map((l, i) => {
              const [r, n] = bridge[l.id] || [0, 0];
              const acc = n ? r / n : 0;
              return (
                <button key={l.id} onClick={() => { setLawId(l.id); setWi(0); }} className={`w-full rounded-xl px-2.5 py-1.5 text-left transition ${l.id === law.id ? "bg-purple-500/20" : "hover:bg-white/5"}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-100">{i + 1}. {l.name}</span>
                    <span className="tabular-nums text-slate-400">{n ? `${Math.round(acc * 100)}%` : "–"}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-purple-400" style={{ width: `${acc * 100}%` }} /></div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================================
 * Module: Street Reader (real-world signs in street type)
 * Tokens: { t, r, m, tone?, id?, tts? }. `id` links to a curriculum item.
 * ========================================================================== */
const STREET_PACKS = [
  { id: "cafe", script: "th", title: "Café menu", place: "Bangkok", style: "cafe", lines: [
    [{ t: "ข้าว", id: "v-khaaw" }, { t: "ผัด", r: "phàt", m: "stir-fried", tone: ["low"] }, { t: "กุ้ง", r: "kûng", m: "shrimp", tone: ["falling"] }, { price: true, t: "๘๐", r: "pɛ̀ɛt-sìp", m: "80", tts: "แปดสิบ" }, { price: true, t: "บาท", id: "v-baht" }],
    [{ t: "น้ำ", id: "v-naam" }, { t: "มะนาว", r: "má-naaw", m: "lime", tone: ["high", "mid"] }, { price: true, t: "๓๕", r: "sǎam-sìp-hâa", m: "35", tts: "สามสิบห้า" }, { price: true, t: "บาท", id: "v-baht" }],
    [{ t: "ส้มตำ", r: "sôm-tam", m: "papaya salad", tone: ["falling", "mid"] }, { t: "แซ่บ", id: "v-saep" }, { price: true, t: "๖๐", r: "hòk-sìp", m: "60", tts: "หกสิบ" }, { price: true, t: "บาท", id: "v-baht" }],
    [{ t: "กาแฟ", r: "kaa-fɛɛ", m: "coffee", tone: ["mid", "mid"] }, { t: "เย็น", r: "yen", m: "cold / iced", tone: ["mid"] }, { price: true, t: "๕๕", r: "hâa-sìp-hâa", m: "55", tts: "ห้าสิบห้า" }, { price: true, t: "บาท", id: "v-baht" }],
  ] },
  { id: "bts", script: "th", title: "Skytrain station", place: "Bangkok", style: "transit", lines: [
    [{ t: "สถานี", r: "sà-thǎa-nii", m: "station", tone: ["low", "rising", "mid"] }, { t: "สยาม", r: "sà-yǎam", m: "Siam", tone: ["low", "rising"] }],
    [{ t: "ทางออก", id: "v-exit" }, { t: "๓", id: "n-3" }],
    [{ t: "ห้องน้ำ", id: "v-toilet" }, { t: "ชาย", r: "chaai", m: "men", tone: ["mid"] }, { t: "หญิง", r: "yǐng", m: "women", tone: ["rising"] }],
  ] },
  { id: "shop", script: "th", title: "Convenience store", place: "Bangkok", style: "shop", lines: [
    [{ t: "น้ำ", id: "v-naam" }, { t: "ดื่ม", r: "dʉ̀ʉm", m: "drinking", tone: ["low"] }, { price: true, t: "๑๐", r: "sìp", m: "10", tts: "สิบ" }, { price: true, t: "บาท", id: "v-baht" }],
    [{ t: "ขนม", id: "v-khanom" }, { t: "ลด", r: "lót", m: "discount (reduce)", tone: ["high"] }, { price: true, t: "๒๐%", r: "yîi-sìp pəə-sen", m: "20%", tts: "ยี่สิบเปอร์เซ็นต์" }],
    [{ t: "เปิด", id: "v-open" }, { price: true, t: "๒๔", r: "yîi-sìp-sìi", m: "24", tts: "ยี่สิบสี่" }, { t: "ชั่วโมง", r: "chûa-moong", m: "hours", tone: ["falling", "mid"] }],
  ] },
  { id: "temple", script: "th", title: "Temple notice", place: "Chiang Mai", style: "temple", lines: [
    [{ t: "กรุณา", r: "kà-rú-naa", m: "please", tone: ["low", "high", "mid"] }, { t: "ถอด", r: "thɔ̀ɔt", m: "take off", tone: ["low"] }, { t: "รองเท้า", r: "rɔɔng-tháaw", m: "shoes", tone: ["mid", "high"] }],
    [{ t: "ห้าม", id: "v-forbid" }, { t: "ถ่าย", r: "thàai", m: "take (a photo)", tone: ["low"] }, { t: "รูป", r: "rûup", m: "picture", tone: ["falling"] }],
  ] },
  { id: "market", script: "lo", title: "Morning market", place: "Vientiane", style: "market", lines: [
    [{ t: "ຕະຫຼາດ", id: "v-talaat" }, { t: "ເຊົ້າ", r: "sao", m: "morning", tts: "เซ้า" }],
    [{ t: "ໝາກໄມ້", r: "mak mai", m: "fruit", tts: "หมากไม้" }, { t: "ລາຄາ", id: "v-price" }, { price: true, t: "໒໐໐໐໐", r: "sao phan", m: "20,000", tts: "ซาวพัน" }, { price: true, t: "ກີບ", id: "v-baht" }],
    [{ t: "ເຂົ້າໜຽວ", r: "khao niao", m: "sticky rice", tts: "เข้าเหนียว" }, { price: true, t: "໑໐໐໐໐", r: "sip phan", m: "10,000", tts: "สิบพัน" }, { price: true, t: "ກີບ", id: "v-baht" }],
  ] },
  { id: "talk-th", script: "th", title: "At the counter", place: "Bangkok", style: "chat", speakers: ["You", "Barista", "You", "Barista", "You", "Barista"], lines: [
    [{ t: "สวัสดี", id: "v-hello" }, { t: "ครับ", id: "p-khrap" }],
    [{ t: "สวัสดี", id: "v-hello" }, { t: "ค่ะ", id: "p-kha" }, { t: "รับ", r: "ráp", m: "receive / have (what would you like?)", tone: ["high"] }, { t: "อะไร", r: "à-rai", m: "what", tone: ["low", "mid"] }, { t: "คะ", id: "p-kha-q" }],
    [{ t: "กาแฟ", r: "kaa-fɛɛ", m: "coffee", tone: ["mid", "mid"] }, { t: "เย็น", r: "yen", m: "iced", tone: ["mid"] }, { t: "เท่าไร", id: "p-howmuch" }, { t: "ครับ", id: "p-khrap" }],
    [{ t: "๕๕", r: "hâa-sìp-hâa", m: "55", tts: "ห้าสิบห้า" }, { t: "บาท", id: "v-baht" }, { t: "ค่ะ", id: "p-kha" }],
    [{ t: "ขอบคุณ", id: "v-thanks" }, { t: "ครับ", id: "p-khrap" }],
    [{ t: "ไม่เป็นไร", id: "p-mai-pen-rai" }, { t: "ค่ะ", id: "p-kha" }],
  ] },
  { id: "talk-lo", script: "lo", title: "Market chat", place: "Luang Prabang", style: "chat", speakers: ["You", "Seller", "You", "Seller", "You"], lines: [
    [{ t: "ສະບາຍດີ", id: "v-hello" }, { t: "ເຈົ້າ", id: "p-khrap", m: "polite particle / yes" }],
    [{ t: "ສະບາຍດີ", id: "v-hello" }, { t: "ແຊບ", id: "v-saep" }, { t: "ເດີ", id: "p-na" }],
    [{ t: "ອັນນີ້", r: "an nii", m: "this one", tts: "อันนี้" }, { t: "ເທົ່າໃດ", id: "p-howmuch" }],
    [{ t: "໕໐໐໐", r: "ha phan", m: "5,000", tts: "ห้าพัน" }, { t: "ກີບ", id: "v-baht" }],
    [{ t: "ຂອບໃຈ", id: "v-thanks" }, { t: "ເຈົ້າ", id: "p-khrap", m: "polite particle / yes" }],
  ] },
];

const STREET_STYLES = {
  cafe: { card: "linear-gradient(170deg, #3a1f0e, #1d1009)", ink: "#FFE7C2", accent: "#FFB86B", border: "#ffb86b44" },
  transit: { card: "linear-gradient(170deg, #0e3b2a, #08241a)", ink: "#F2FFF8", accent: "#7CF0B0", border: "#7cf0b044" },
  shop: { card: "linear-gradient(170deg, #f5f5f0, #e7e5df)", ink: "#1a1a1a", accent: "#E4002B", border: "#00000022" },
  temple: { card: "linear-gradient(170deg, #5a1414, #2e0909)", ink: "#FFE08A", accent: "#F5C542", border: "#f5c54244" },
  market: { card: "linear-gradient(170deg, #12324a, #0a1c2b)", ink: "#EAF6FF", accent: "#7FD1FF", border: "#7fd1ff44" },
  chat: { card: "linear-gradient(170deg, #3a1630, #1f0b1a)", ink: "#FFE4F1", accent: "#F472B6", border: "#f472b644" },
};

function resolveToken(tok, script) {
  if (!tok.id) return tok;
  const item = CURRICULUM.find((c) => c.id === tok.id);
  if (!item) return tok;
  const lao = script === "lo";
  return {
    ...tok,
    r: tok.r || (lao ? item.loRoman : item.thRoman.split(" ·")[0]),
    m: tok.m || item.meaning,
    tone: tok.tone || (lao ? undefined : item.tone),
    tts: tok.tts || (lao ? item.ttsLo : item.ttsTh),
    item,
  };
}

function StreetReader({ mode, srs, setSrs, best, setBest }) {
  const packs = STREET_PACKS.filter((p) => mode === "dual" || p.script === mode);
  const [pid, setPid] = useState(packs[0]?.id);
  const pack = packs.find((p) => p.id === pid) || packs[0];
  const [sel, setSel] = useState(null);
  const [timer, setTimer] = useState({ start: null, last: null });
  const [, tick] = useState(0);
  useEffect(() => { setSel(null); setTimer({ start: null, last: null }); }, [pid]);
  useEffect(() => {
    if (!timer.start) return undefined;
    const id = setInterval(() => tick((n) => n + 1), 200);
    return () => clearInterval(id);
  }, [timer.start]);
  if (!pack) return null;
  const style = STREET_STYLES[pack.style];
  const tokens = pack.lines.flat().map((t) => resolveToken(t, pack.script));
  const words = tokens.filter((t) => !t.price);
  const known = (t) => t.item && (srs[t.item.id]?.stage || 0) >= 1;
  const knownPct = Math.round((words.filter(known).length / words.length) * 100);
  const font = pack.script === "lo" ? '"Noto Sans Lao", "Phetsarath OT", sans-serif' : '"Kanit", "Noto Sans Thai", sans-serif';
  const selTok = sel != null ? tokens[sel] : null;
  const audio = getAudio();

  const toggleTimer = () => {
    if (!timer.start) return setTimer({ start: Date.now(), last: null });
    const secs = (Date.now() - timer.start) / 1000;
    setTimer({ start: null, last: secs });
    if (!best[pack.id] || secs < best[pack.id]) {
      setBest({ ...best, [pack.id]: secs });
    }
    return undefined;
  };

  const addToSrs = (item) => setSrs((prev) => (prev[item.id]?.stage ? prev : { ...prev, [item.id]: { stage: 1, next: Date.now() } }));
  let flat = -1;

  return (
    <div className="space-y-4">
      <SectionTitle icon={BookOpen} title="Street Reader" sub="Real signs and short exchanges in the loopless type you meet on the street. Green words you know; tap the rest." color="#FFB86B" />
      <div className="flex flex-wrap gap-2">
        {packs.map((p) => (
          <Chip key={p.id} active={p.id === pack.id} color="#FFB86B" onClick={() => setPid(p.id)}>
            {p.title} <span className="text-xs opacity-70">{p.place}</span>
          </Chip>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${knownPct}%` }} /></div>
            <span className="text-sm text-slate-300">You can read <b className="text-white">{knownPct}%</b> of this</span>
          </div>
          <div className="rounded-3xl p-5 shadow-2xl sm:p-7" style={{ background: style.card, border: `1px solid ${style.border}`, fontFamily: font }}>
            <div className="mb-3 text-xs uppercase tracking-[0.2em]" style={{ color: style.accent, fontFamily: UI_FONT }}>{pack.place}</div>
            <div className="space-y-2">
              {pack.lines.map((line, li) => (
                <div key={li} className="flex flex-wrap items-baseline gap-x-1 gap-y-1 border-b border-dashed pb-2 last:border-0" style={{ borderColor: style.border }}>
                  {pack.speakers && <span className="mr-2 w-16 shrink-0 text-xs font-bold uppercase tracking-wider" style={{ color: style.accent, fontFamily: UI_FONT }}>{pack.speakers[li]}</span>}
                  {line.map((raw, ri) => {
                    flat += 1;
                    const i = flat;
                    const t = tokens[i];
                    const isKnown = known(t);
                    return (
                      <button
                        key={i}
                        onClick={() => { setSel(i); audio.speakHumanVoice(t.tts || t.t, pack.script === "lo" ? t.t : undefined); }}
                        className={`rounded-md px-0.5 text-3xl leading-[1.6] transition sm:text-4xl ${t.price ? "text-2xl sm:text-3xl" : ""} ${t.price && ri === line.findIndex((x) => x.price) ? "ml-auto" : ""}`}
                        style={{
                          color: t.price ? style.accent : style.ink,
                          borderBottom: t.price ? "none" : `3px solid ${isKnown ? "#34D399" : "#22D3EE"}`,
                          background: sel === i ? `${style.accent}33` : "transparent",
                        }}
                      >
                        {raw.t}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button onClick={toggleTimer} className={`rounded-xl px-4 py-2 font-bold ${timer.start ? "bg-rose-500 text-white" : "bg-amber-500 text-black"}`}>
              {timer.start ? `Done · ${((Date.now() - timer.start) / 1000).toFixed(1)} s` : "Time my reading"}
            </button>
            {timer.last != null && <span className="text-slate-200">{timer.last.toFixed(1)} s</span>}
            {best[pack.id] && <span className="text-slate-400">Best {best[pack.id].toFixed(1)} s</span>}
            <span className="text-xs text-slate-400">Read it all aloud, then stop the timer.</span>
          </div>
        </div>
        <Card className="p-4">
          {selTok ? (
            <div className="space-y-2">
              <div className="text-5xl leading-[1.5] text-white" style={{ fontFamily: font }}>{selTok.t}</div>
              <div className="text-slate-200">{selTok.r} · {selTok.m}</div>
              {selTok.tone && <div className="flex flex-wrap gap-1">{selTok.tone.map((tn, i) => <ToneBadge key={i} tone={tn} small />)}</div>}
              {selTok.item?.parts && <div className="text-xs text-slate-300">{computeTone(selTok.item.parts).formula}</div>}
              <div className="text-xs text-slate-400">Head-loop form: <span className="text-2xl text-slate-200" style={{ fontFamily: FONT_STACKS.loop[pack.script] }}>{selTok.t}</span></div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => audio.speakHumanVoice(selTok.tts || selTok.t, pack.script === "lo" ? selTok.t : undefined)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200"><Volume2 size={13} className="mr-1 inline" />Speak</button>
                {selTok.item && (known(selTok) ? (
                  <span className="rounded-xl bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300"><Check size={13} className="mr-1 inline" />In your SRS</span>
                ) : (
                  <button onClick={() => addToSrs(selTok.item)} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-black">+ Add to SRS</button>
                ))}
              </div>
              {!selTok.item && !selTok.price && <p className="text-xs text-slate-400">Not in the course yet; listen and read it here.</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Tap any word on the sign for its reading, meaning and tone. Words from the course can go straight into your SRS.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ============================================================================
 * Hub tabs: Lab (Reactor, Orbit, Bridge) and Read (Slicer, Street Reader)
 * ========================================================================== */
/* ============================================================================
 * Shadow Mirror: say the syllable back and see your pitch over the target.
 * Pitch is tracked on the device (YIN autocorrelation); no audio leaves it.
 * ========================================================================== */
const CHAO_ST = 2.5; // semitones per Chao step, so 1–5 spans a 10-semitone voice
const SHADOW_PASS = 70;
const SHADOW_UNLOCK = { acc: 0.8, trials: 10 };

const emptyShadow = () => ({ base: null, tones: Object.fromEntries(TONE_ORDER.map((t) => [t, { best: 0, tries: 0 }])) });

/** YIN pitch estimate for one frame, in Hz, or null when unvoiced. */
function detectPitch(buf, sr) {
  let rms = 0;
  for (let i = 0; i < buf.length; i += 1) rms += buf[i] * buf[i];
  if (Math.sqrt(rms / buf.length) < 0.01) return null;
  const minLag = Math.floor(sr / 450);
  const maxLag = Math.min(Math.floor(sr / 70), Math.floor(buf.length / 2));
  const w = buf.length - maxLag;
  const d = new Float32Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau += 1) {
    let s = 0;
    for (let i = 0; i < w; i += 1) {
      const x = buf[i] - buf[i + tau];
      s += x * x;
    }
    d[tau] = s;
  }
  let run = 0;
  for (let tau = 1; tau <= maxLag; tau += 1) {
    run += d[tau];
    d[tau] = run ? (d[tau] * tau) / run : 1;
  }
  let tau = -1;
  for (let t = minLag; t < maxLag; t += 1) {
    if (d[t] < 0.15) {
      while (t + 1 < maxLag && d[t + 1] < d[t]) t += 1;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  const a = d[tau - 1];
  const b = d[tau];
  const c = d[tau + 1] ?? b;
  const shift = (a - 2 * b + c) ? (a - c) / (2 * (a - 2 * b + c)) : 0;
  return sr / (tau + shift);
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};
const toSt = (hz, base) => 12 * Math.log2(hz / base);

/** The longest voiced stretch (gaps of up to 3 frames allowed), octave-fixed and smoothed. */
function voicedSegment(frames) {
  let best = [];
  let cur = [];
  let gap = 0;
  frames.forEach((f) => {
    if (f.hz) {
      cur.push(f);
      gap = 0;
    } else if (cur.length && (gap += 1) > 3) {
      if (cur.length > best.length) best = cur;
      cur = [];
      gap = 0;
    }
  });
  if (cur.length > best.length) best = cur;
  if (best.length < 6) return null;
  // Octave errors show up as sudden jumps of about 12 semitones between frames.
  const mid = median(best.map((f) => f.hz));
  const fixed = [];
  best.forEach((f, i) => {
    let st = toSt(f.hz, mid);
    if (i) {
      while (st - fixed[i - 1] > 7) st -= 12;
      while (fixed[i - 1] - st > 7) st += 12;
    }
    fixed.push(st);
  });
  const smooth = fixed.map((_, i) => median(fixed.slice(Math.max(0, i - 2), i + 3)));
  return { st: smooth, hz: smooth.map((s) => mid * 2 ** (s / 12)) };
}

function resample(xs, n) {
  return Array.from({ length: n }, (_, i) => {
    const p = (i / (n - 1)) * (xs.length - 1);
    const lo = Math.floor(p);
    const hi = Math.min(xs.length - 1, lo + 1);
    return xs[lo] + (xs[hi] - xs[lo]) * (p - lo);
  });
}

/** Target contour in semitones relative to the mid level (Chao 3). */
const targetSt = (tone, n = 24) => resample(TONES[tone].chao.split("").map((d) => (Number(d) - 3) * CHAO_ST), n);

function scoreShadow(tone, seg, base) {
  const n = 24;
  const T = targetSt(tone, n);
  const L = resample(base ? seg.hz.map((h) => toSt(h, base)) : seg.st, n);
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const mT = mean(T);
  const mL = mean(L);
  const rmse = Math.sqrt(mean(L.map((x, i) => ((x - mL) - (T[i] - mT)) ** 2)));
  const shape = Math.max(0, Math.min(100, 100 - rmse * 25));
  const offset = mL - mT;
  const height = base ? Math.max(0, Math.min(100, 100 - Math.max(0, Math.abs(offset) - 1) * 25)) : null;
  const score = Math.round(height == null ? shape : 0.6 * shape + 0.4 * height);
  const third = Math.floor(n / 3);
  const slope = (xs) => mean(xs.slice(-third)) - mean(xs.slice(0, third));
  const sT = slope(T);
  const sL = slope(L);
  // A dip means the middle sits below both ends, as in Rising 214.
  const dips = (xs) => Math.min(...xs.slice(third, 2 * third)) < Math.min(mean(xs.slice(0, 3)), mean(xs.slice(-3))) - 1;
  const dipT = dips(T);
  const dipL = dips(L);
  const name = TONES[tone].name;
  let tip;
  if (dipT && !dipL) tip = `${name} dips before it climbs: let your voice sag first, then lift.`;
  else if (sT <= -2 && sL > -1) tip = `${name} needs a clear drop: start high and let it fall.`;
  else if (sT >= 2 && sL < 1) tip = `${name} has to end higher than it starts: push the pitch up at the end.`;
  else if (Math.abs(sT) < 1.5 && Math.abs(sL) > 2.5) tip = `Keep ${name} level: your pitch ${sL > 0 ? "rose" : "fell"} about ${Math.abs(sL).toFixed(0)} semitones.`;
  else if (height != null && offset > 2) tip = `${shape >= 70 ? "Right shape, but pitched" : "Pitched"} high for ${name}. Relax down toward your normal voice.`;
  else if (height != null && offset < -2) tip = `${shape >= 70 ? "Right shape, but too" : "Too"} low for ${name}. Lift it a little.`;
  else if (score >= SHADOW_PASS) tip = `That matches the ${name} contour.`;
  else tip = `Close. Listen once more and copy where the pitch starts and ends.`;
  return { score, shape: Math.round(shape), height: height == null ? null : Math.round(height), trace: L, tip };
}

function micErrorText(e) {
  const n = e?.name || e?.message;
  if (n === "unsupported") return "This browser has no microphone access.";
  if (n === "NotFoundError" || n === "OverconstrainedError") return "No microphone was found on this device.";
  return "The microphone is blocked here. Embedded previews never allow it: open SuvarnaKani.html directly in Safari or Chrome and allow the microphone when asked.";
}

/** Records up to `ms` and calls onFrame with each pitch frame; resolves with all frames. */
function useMicPitch() {
  const stopRef = useRef(null);
  const capture = useCallback(async (ms, onFrame) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    if (ctx.state === "suspended") await ctx.resume();
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize);
    const frames = [];
    const t0 = performance.now();
    return new Promise((resolve) => {
      let raf = 0;
      let lastT = -1;
      const finish = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        ctx.close();
        stopRef.current = null;
        resolve(frames);
      };
      stopRef.current = finish;
      const step = () => {
        const t = performance.now() - t0;
        if (t >= ms) return finish();
        if (t - lastT >= 30) {
          lastT = t;
          an.getFloatTimeDomainData(buf);
          const f = { t, hz: detectPitch(buf, ctx.sampleRate) };
          frames.push(f);
          onFrame?.(frames);
        }
        raf = requestAnimationFrame(step);
        return undefined;
      };
      raf = requestAnimationFrame(step);
    });
  }, []);
  const stop = useCallback(() => stopRef.current?.(), []);
  useEffect(() => () => stopRef.current?.(), []);
  return { capture, stop };
}

function ShadowPlot({ tone, trace, live, height = 200 }) {
  const width = 360;
  const pad = { l: 30, r: 12, t: 12, b: 12 };
  const range = 8; // ± semitones shown
  const y = (st) => pad.t + ((range - Math.max(-range, Math.min(range, st))) / (2 * range)) * (height - pad.t - pad.b);
  const x = (i, n) => pad.l + (n > 1 ? i / (n - 1) : 0) * (width - pad.l - pad.r);
  const path = (xs) => xs.map((v, i) => `${i ? "L" : "M"} ${x(i, xs.length).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const T = targetSt(tone, 40);
  const t = TONES[tone];
  const liveXs = (live || []).filter((v) => v != null);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto max-h-[260px] w-full" role="img" aria-label={`${t.name} target contour with your pitch`}>
      {[1, 2, 3, 4, 5].map((l) => (
        <g key={l}>
          <line x1={pad.l} x2={width - pad.r} y1={y((l - 3) * CHAO_ST)} y2={y((l - 3) * CHAO_ST)} stroke="#ffffff14" strokeDasharray="3 5" />
          <text x={10} y={y((l - 3) * CHAO_ST) + 4} fill="#94A3B8" fontSize="11">{l}</text>
        </g>
      ))}
      <defs>
        <linearGradient id={`shadow-grad-${tone}`} gradientUnits="userSpaceOnUse" x1={pad.l} x2={width - pad.r} y1="0" y2="0">
          <stop offset="0" stopColor={t.grad[0]} />
          <stop offset="1" stopColor={t.grad[1]} />
        </linearGradient>
      </defs>
      <path d={path(T)} fill="none" stroke={`url(#shadow-grad-${tone})`} strokeOpacity="0.35" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path(T)} fill="none" stroke={`url(#shadow-grad-${tone})`} strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" />
      {trace && <path d={path(trace)} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 4px #ffffffaa)" }} />}
      {!trace && liveXs.length > 1 && <path d={path(liveXs)} fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  );
}

function ShadowMirror({ ear, shadow, setShadow, sandbox, logActivity }) {
  const audio = getAudio();
  const mic = useMicPitch();
  const unlocked = (tone) => {
    if (sandbox) return true;
    const [, n] = ear.tones[tone] || [0, 0];
    return n >= SHADOW_UNLOCK.trials && earAccuracy(ear, tone) >= SHADOW_UNLOCK.acc;
  };
  const [tone, setTone] = useState(() => TONE_ORDER.find(unlocked) || "mid");
  const words = useMemo(() => EAR_SETS.flatMap((s) => s.words).filter((w) => w.tone === tone), [tone]);
  const [wi, setWi] = useState(0);
  const word = words[wi % words.length];
  const [phase, setPhase] = useState("idle"); // idle | calibrating | recording
  const [live, setLive] = useState([]);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { setResult(null); setLive([]); setWi(0); }, [tone]);

  const liveSt = (frames) => {
    const voiced = frames.filter((f) => f.hz).map((f) => f.hz);
    const ref = shadow.base || median(voiced);
    return voiced.map((h) => toSt(h, ref));
  };

  const record = async (calibrate) => {
    audio.cancelSpeech();
    audio.stopTones();
    setErr(null);
    setResult(null);
    setLive([]);
    setPhase(calibrate ? "calibrating" : "recording");
    try {
      const frames = await mic.capture(calibrate ? 2000 : 2200, (fr) => setLive(liveSt(fr)));
      const seg = voicedSegment(frames);
      if (!seg) {
        setErr("I couldn't hear a voice. Hold the syllable a little longer, closer to the microphone.");
      } else if (calibrate) {
        const base = Math.round(median(seg.hz));
        setShadow((s) => ({ ...s, base }));
      } else {
        const r = scoreShadow(tone, seg, shadow.base);
        setResult(r);
        setShadow((s) => {
          const cur = s.tones[tone] || { best: 0, tries: 0 };
          return { ...s, tones: { ...s.tones, [tone]: { best: Math.max(cur.best, r.score), tries: cur.tries + 1 } } };
        });
        logActivity?.({ shadow: 1 });
      }
    } catch (e) {
      setErr(micErrorText(e));
    }
    setPhase("idle");
  };

  const busy = phase !== "idle";
  const t = TONES[tone];

  return (
    <div className="space-y-4">
      <SectionTitle icon={Mic} title="Shadow Mirror" sub="Hear the model, say it back, and see your pitch drawn over the target contour. Analysis runs on this device; no audio is sent anywhere." color={TONES.falling.color} />
      <div className="grid grid-cols-5 gap-2">
        {TONE_ORDER.map((tn) => {
          const open = unlocked(tn);
          const acc = earAccuracy(ear, tn);
          const best = shadow.tones[tn]?.best || 0;
          return (
            <button
              key={tn}
              onClick={() => open && setTone(tn)}
              disabled={!open}
              className={`rounded-2xl border p-2 text-center transition ${tone === tn ? "border-white/40 bg-white/10" : "border-white/10 bg-white/[0.03]"} ${open ? "" : "opacity-60"}`}
              title={open ? "" : `Reach ${SHADOW_UNLOCK.acc * 100}% on ${TONES[tn].name} in the Ear Dojo`}
            >
              <ToneMini tone={tn} height={26} />
              <div className="mt-1 text-xs font-semibold" style={{ color: TONES[tn].ink }}>{TONES[tn].name}</div>
              <div className="text-[11px] text-slate-400">
                {open ? (best ? `best ${best}` : "ready") : <span><Lock size={10} className="mr-0.5 inline" />ear {acc == null ? "–" : `${Math.round(acc * 100)}%`}</span>}
              </div>
            </button>
          );
        })}
      </div>
      {!unlocked(tone) ? (
        <Card className="p-5 text-sm text-slate-300">
          <p>Shadowing opens for a tone once you can hear it: reach {SHADOW_UNLOCK.acc * 100}% on it over at least {SHADOW_UNLOCK.trials} trials in the Ear Dojo. Ears first, then mouth.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <Card className="p-5" glow={t.color}>
            <div className="flex flex-wrap items-center gap-2">
              {words.map((w, i) => (
                <Chip key={w.th} active={i === wi % words.length} color={t.color} onClick={() => { setWi(i); setResult(null); setLive([]); }}>
                  <span style={{ fontFamily: FONT_STACKS.loop.th }}>{w.th}</span>
                </Chip>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <span className="text-5xl leading-[1.5] text-white" style={{ fontFamily: FONT_STACKS.loop.th }}>{word.th}</span>
              <span className="text-slate-200">{word.r} · {word.m}</span>
              <ToneBadge tone={tone} small />
            </div>
            <ShadowPlot tone={tone} trace={result?.trace} live={phase === "recording" ? live : null} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => audio.speakHumanVoice(word.th)} disabled={busy} className="flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-50">
                <Volume2 size={16} /> Hear model
              </button>
              {phase === "recording" ? (
                <button onClick={mic.stop} className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white">
                  <Mic size={16} className="animate-pulse" /> Listening… tap to stop
                </button>
              ) : (
                <button onClick={() => record(false)} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
                  <Mic size={16} /> Say it
                </button>
              )}
            </div>
            {result && (
              <div className="mt-4 rounded-2xl bg-white/[0.04] p-3 text-sm">
                <div className="flex items-baseline gap-3">
                  <span className={`text-3xl font-black tabular-nums ${result.score >= SHADOW_PASS ? "text-emerald-300" : "text-amber-300"}`}>{result.score}</span>
                  <span className="text-slate-400">shape {result.shape}{result.height != null ? ` · height ${result.height}` : " · height not scored until you set your voice"}</span>
                </div>
                <p className="mt-1 text-slate-200">{result.tip}</p>
              </div>
            )}
            {err && <p className="mt-3 flex gap-2 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{err}</p>}
          </Card>
          <div className="space-y-3">
            <Card className="p-4 text-sm">
              <div className="mb-1 font-semibold text-white">Your voice</div>
              {shadow.base ? (
                <p className="text-slate-300">Your mid level is set to <b className="text-white">{shadow.base} Hz</b>. Height is scored against it.</p>
              ) : (
                <p className="text-slate-300">Say a long, relaxed <span className="text-lg" style={{ fontFamily: FONT_STACKS.loop.th }}>อา</span> at your normal speaking pitch. That becomes your Mid level, so High and Low can be scored by height as well as shape.</p>
              )}
              <button onClick={() => record(true)} disabled={busy} className="mt-2 flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-100 disabled:opacity-50">
                <Mic size={14} className={phase === "calibrating" ? "animate-pulse text-rose-300" : ""} /> {phase === "calibrating" ? "Listening…" : shadow.base ? "Set again" : "Set my voice"}
              </button>
            </Card>
            <Card className="p-4 text-xs leading-relaxed text-slate-400">
              The coloured band is the {t.name} contour ({t.chao} on the 1–5 Chao scale), mapped to about {CHAO_ST} semitones per step. Your pitch is the white line. Shape counts most; a score of {SHADOW_PASS} or more is a pass. Tones open here once you hear them reliably in the Ear Dojo.
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function SubTabs({ tabs, active, onChange }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${active === t.id ? "bg-white/10 text-amber-300" : "text-slate-400 hover:text-white"}`}>
          <t.icon size={15} /> {t.label}
        </button>
      ))}
    </div>
  );
}

/* ============================================================================
 * Audio Studio drawer
 * ========================================================================== */
function AudioStudio({ open, onClose, rate, setRate, muted, setMuted }) {
  const audio = getAudio();
  const [, force] = useState(0);
  useEffect(() => audio.onVoices(() => force((n) => n + 1)), [audio]);
  if (!open) return null;
  const th = audio.thaiVoice();
  const lo = audio.laoVoice();
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute right-2 top-16 w-[min(92vw,360px)] rounded-3xl border border-white/10 bg-[#0F172A]/95 p-4 shadow-2xl backdrop-blur" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white"><Headphones size={18} className="text-amber-400" /> Audio Studio</div>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-white/10"><X size={16} /></button>
        </div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Speech rate</div>
        <div className="mb-4 flex gap-2">
          <Chip active={rate === 0.85} onClick={() => setRate(0.85)}>0.85× Clear</Chip>
          <Chip active={rate === 1} onClick={() => setRate(1)}>1.0× Normal</Chip>
        </div>
        <button onClick={() => setMuted(!muted)} className={`mb-4 flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-sm font-semibold ${muted ? "border-rose-400/50 bg-rose-500/10 text-rose-200" : "border-white/10 text-slate-200"}`}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />} {muted ? "Muted" : "Sound on"}
        </button>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Diagnostics</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => audio.speakHumanVoice("สวัสดี ครับ")} className="rounded-xl bg-cyan-500/15 py-2 text-sm text-cyan-200"><Volume2 size={14} className="mr-1 inline" />Test voice</button>
          <button onClick={() => audio.playRanatToneChime(["mid", "low", "falling", "high", "rising"])} className="rounded-xl bg-amber-500/15 py-2 text-sm text-amber-200"><Music size={14} className="mr-1 inline" />5 tone chimes</button>
        </div>
        <div className="mt-3 space-y-1 text-xs">
          <div className={th ? "text-emerald-300" : "text-amber-300"}>{th ? `Thai voice: ${th.name}` : (IS_ANDROID ? `No Thai voice found. ${ANDROID_VOICE_HINT}` : "No Thai voice found. Install a Thai voice in your device's text-to-speech settings.")}</div>
          <div className={lo ? "text-emerald-300" : "text-slate-400"}>{lo ? `Lao voice: ${lo.name}` : "No Lao voice: Lao items are read with Thai-script approximations."}</div>
          <p className="pt-1 text-slate-400">Voice and chimes never play at the same time; starting one stops the other.</p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * App shell
 * ========================================================================== */
const LAB_TABS = [
  { id: "reactor", label: "Tone Reactor", icon: FlaskConical },
  { id: "orbit", label: "Vowel Orbit", icon: Orbit },
  { id: "bridge", label: "Mekong Predictor", icon: Languages },
];
const EAR_TABS = [
  { id: "dojo", label: "Ear Dojo", icon: Ear },
  { id: "shadow", label: "Shadow Mirror", icon: Mic },
];
const READ_TABS = [
  { id: "slicer", label: "Script Slicer", icon: Scissors },
  { id: "street", label: "Street Reader", icon: BookOpen },
];
// Older saved tabs map onto the new hubs.
const LEGACY_TAB = { reactor: ["lab", "reactor"], orbit: ["lab", "orbit"], slicer: ["read", "slicer"] };

const TABS = [
  { id: "shrine", label: "Shrine", icon: Landmark },
  { id: "ear", label: "Ear", icon: Ear },
  { id: "tracer", label: "Tracer", icon: PenTool },
  { id: "lab", label: "Lab", icon: FlaskConical },
  { id: "read", label: "Read", icon: BookOpen },
];

export default function SuvarnaKani() {
  const initial = useMemo(() => loadState() || {}, []);
  const [tab, setTab] = useState(LEGACY_TAB[initial.tab]?.[0] || initial.tab || "shrine");
  const [labTab, setLabTab] = useState(LEGACY_TAB[initial.tab]?.[1] === "reactor" || LEGACY_TAB[initial.tab]?.[1] === "orbit" ? LEGACY_TAB[initial.tab][1] : initial.labTab || "reactor");
  const [readTab, setReadTab] = useState(initial.readTab || "slicer");
  const [earTab, setEarTab] = useState(initial.earTab || "dojo");
  const [shadow, setShadow] = useState(() => ({ ...emptyShadow(), ...(initial.shadow || {}) }));
  const [bridge, setBridge] = useState(() => ({ ...emptyBridge(), ...(initial.bridge || {}) }));
  const [streetBest, setStreetBest] = useState(() => initial.streetBest || {});
  const [mode, setMode] = useState(initial.mode || "dual");
  const [font, setFont] = useState(initial.font || "loop");
  const [sandbox, setSandbox] = useState(!!initial.sandbox);
  const [rate, setRate] = useState(initial.rate || 0.85);
  const [muted, setMuted] = useState(!!initial.muted);
  const [srs, setSrs] = useState(() => {
    const raw = initial.srs || {};
    const fixed = {};
    Object.entries(raw).forEach(([k, v]) => { fixed[k] = { ...v, next: v.next === null ? Infinity : v.next }; });
    return fixed;
  });
  const [ear, setEar] = useState(() => ({ ...emptyEar(), ...(initial.ear || {}) }));
  const [log, setLog] = useState(initial.log || {});
  const [dailyMinutes, setDailyMinutes] = useState(initial.dailyMinutes || 12);
  const [onboarded, setOnboarded] = useState(!!initial.onboarded || !!(initial.srs && Object.keys(initial.srs).length));
  const logActivity = useCallback((delta) => {
    setLog((prev) => {
      const key = todayKey();
      const day = { ...(prev[key] || {}) };
      Object.entries(delta).forEach(([k, v]) => { day[k] = (day[k] || 0) + v; });
      const next = { ...prev, [key]: day };
      // Keep 60 days of history.
      Object.keys(next).sort().slice(0, -60).forEach((k) => delete next[k]);
      return next;
    });
  }, []);
  const finishOnboarding = (a) => {
    if (a.mode) setMode(a.mode);
    if (a.level === "reads") setSandbox(true);
    if (a.minutes) setDailyMinutes(a.minutes);
    setOnboarded(true);
  };
  const [studio, setStudio] = useState(false);
  const [inspect, setInspect] = useState(null);

  useEffect(() => {
    if (document.querySelector("link[data-suvarnakani-fonts]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_HREF;
    link.setAttribute("data-suvarnakani-fonts", "");
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const audio = getAudio();
    audio.rate = rate;
    audio.muted = muted;
    if (muted) { audio.cancelSpeech(); audio.stopTones(); }
  }, [rate, muted]);

  useEffect(() => {
    const prime = () => getAudio().prime();
    window.addEventListener("pointerdown", prime, { once: true });
    return () => window.removeEventListener("pointerdown", prime);
  }, []);

  useEffect(() => {
    saveState({ tab, labTab, readTab, mode, font, sandbox, rate, muted, srs, ear, log, dailyMinutes, onboarded, bridge, streetBest, earTab, shadow });
  }, [earTab, shadow, tab, labTab, readTab, mode, font, sandbox, rate, muted, srs, ear, log, dailyMinutes, onboarded, bridge, streetBest]);

  // Two taps instead of window.confirm, which embedded viewers block.
  const [confirmReset, setConfirmReset] = useState(false);
  const resetProgress = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    setSrs({});
    setEar(emptyEar());
    setLog({});
    setBridge(emptyBridge());
    setStreetBest({});
    setShadow(emptyShadow());
    setConfirmReset(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#0B0F19] pb-[calc(6rem+env(safe-area-inset-bottom))] text-slate-100 sm:pb-8" style={{ fontFamily: UI_FONT, backgroundImage: "radial-gradient(ellipse at top, #1E1B4B55, transparent 60%), radial-gradient(ellipse at bottom right, #F59E0B12, transparent 50%)" }}>
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0B0F19]/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <div className="mr-auto flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 text-lg font-black text-black shadow-[0_0_20px_#F59E0B66]" style={{ fontFamily: FONT_STACKS.loop.th }}>สุ</div>
            <div className="leading-tight">
              <div className="font-extrabold tracking-tight text-white">SuvarṇaKani</div>
              <div className="text-[11px] text-amber-300/80"><span style={{ fontFamily: FONT_STACKS.loop.th }}>สุวรรณกานิ</span> · <span style={{ fontFamily: FONT_STACKS.loop.lo }}>ສຸວັນນະການິ</span></div>
            </div>
          </div>
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-0.5 text-xs font-semibold">
            {[["dual", "Dual", "ไทย/ລາວ"], ["th", "Thai", "ไทย"], ["lo", "Lao", "ລາວ"]].map(([k, en, native]) => (
              <button key={k} onClick={() => setMode(k)} className={`rounded-lg px-2.5 py-1.5 transition ${mode === k ? "bg-amber-500 text-black" : "text-slate-300 hover:text-white"}`}><span className="hidden sm:inline">{en} </span>{native}</button>
            ))}
          </div>
          <button onClick={() => setFont(font === "loop" ? "street" : "loop")} title="Toggle head-loop / street-sign font" className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10">
            <Type size={14} /> <span className="hidden sm:inline">{font === "loop" ? "Head-loop" : "Street"}</span><span className="sm:hidden">{font === "loop" ? "Loop" : "Street"}</span>
          </button>
          <button onClick={() => setSandbox(!sandbox)} title="Sandbox: unlock all levels" className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${sandbox ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"}`}>
            {sandbox ? <Unlock size={14} /> : <Lock size={14} />} <span className="hidden sm:inline">Unlock all</span>
          </button>
          <button onClick={() => setStudio(true)} aria-label="Audio Studio" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10">
            {muted ? <VolumeX size={16} /> : <Headphones size={16} />}
          </button>
        </div>
        <nav className="mx-auto hidden max-w-6xl gap-1 px-4 pb-2 sm:flex">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${tab === t.id ? "bg-white/10 text-amber-300" : "text-slate-400 hover:text-white"}`}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {tab === "shrine" && <Shrine srs={srs} setSrs={setSrs} sandbox={sandbox} mode={mode} font={font} onInspect={setInspect} ear={ear} onOpenEar={() => setTab("ear")} log={log} logActivity={logActivity} dailyMinutes={dailyMinutes} />}
        {tab === "ear" && (
          <>
            <SubTabs tabs={EAR_TABS} active={earTab} onChange={setEarTab} />
            {earTab === "dojo" && <EarDojo ear={ear} setEar={setEar} logActivity={logActivity} />}
            {earTab === "shadow" && <ShadowMirror ear={ear} shadow={shadow} setShadow={setShadow} sandbox={sandbox} logActivity={logActivity} />}
          </>
        )}
        {tab === "tracer" && <Tracer />}
        {tab === "lab" && (
          <>
            <SubTabs tabs={LAB_TABS} active={labTab} onChange={setLabTab} />
            {labTab === "reactor" && <Reactor mode={mode} font={font} />}
            {labTab === "orbit" && <OrbitModule mode={mode} font={font} />}
            {labTab === "bridge" && <MekongPredictor mode={mode} font={font} bridge={bridge} setBridge={setBridge} />}
          </>
        )}
        {tab === "read" && (
          <>
            <SubTabs tabs={READ_TABS} active={readTab} onChange={setReadTab} />
            {readTab === "slicer" && <Slicer mode={mode} font={font} />}
            {readTab === "street" && <StreetReader mode={mode} srs={srs} setSrs={setSrs} best={streetBest} setBest={setStreetBest} />}
          </>
        )}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-4 text-xs text-slate-400">
          <span><Zap size={12} className="mr-1 inline text-amber-400" />Progress is saved on this device.</span>
          <span className="flex items-center gap-1">
            Daily goal:
            {[5, 12, 20].map((m) => (
              <button key={m} onClick={() => setDailyMinutes(m)} className={`rounded-lg px-2 py-0.5 ${dailyMinutes === m ? "bg-amber-500 font-bold text-black" : "hover:text-slate-200"}`}>{m} min</button>
            ))}
          </span>
          <button onClick={resetProgress} className={`underline ${confirmReset ? "font-bold text-rose-300" : "hover:text-slate-300"}`}>{confirmReset ? "Tap again to erase all progress" : "Reset progress"}</button>
        </footer>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-[#0B0F19]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${tab === t.id ? "text-amber-400" : "text-slate-400"}`}>
            <t.icon size={20} />
            {t.label}
          </button>
        ))}
      </nav>

      <AudioStudio open={studio} onClose={() => setStudio(false)} rate={rate} setRate={setRate} muted={muted} setMuted={setMuted} />
      <Inspector item={inspect} mode={mode} font={font} srs={srs} onClose={() => setInspect(null)} />
      {!onboarded && <Onboarding onDone={finishOnboarding} />}
    </div>
  );
}
