import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Landmark, PenTool, FlaskConical, Orbit, Scissors, MessageCircle, Clock, Layers, BarChart3, Train, Library, Volume2, VolumeX, Music, Unlock, Lock,
  Type, Languages, X, ChevronLeft, ChevronRight, Sparkles, RotateCcw, Check, Eye, Info,
  Headphones, BookOpen, Trophy, Eraser, Play, Zap, Compass, AlertTriangle,
  Cloud, Sun, Waves, Ear, Target, Flame, Mic,
  Settings, Download, Upload, History, RefreshCw, Search, Keyboard, Moon, EyeOff, Hand, SunMoon,
} from "lucide-react";

/* ============================================================================
 * SuvarṇaKani (สุวรรณกานิ / ສຸວັນນະການິ)
 * First-principles Thai & Lao script, tone physics and SRS trainer.
 * Single-file React + Tailwind + lucide-react.
 * ========================================================================== */

const STORAGE_KEY = "suvarnakani.v1";
const APP_VERSION = "0.25.0";

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

/* Design tokens. Tailwind's slate, white and black, and the sk-* colours, read
 * these variables (see tailwind.preset.cjs). Values are space-separated RGB.
 * Daylight (V1) flips the neutral ramp: "white" becomes deep indigo ink and the
 * slate scale runs from ink to paper, so `text-white`, `bg-white/5` and
 * `text-slate-400` keep their roles. Pale accent text (amber-300 and the like)
 * gets a darker shade of the same hue. Night can be true black for OLED. */
const LIGHT_TEXT = {
  amber: ["#92400E", "#B45309"], emerald: ["#065F46", "#047857"], rose: ["#9F1239", "#BE123C"], cyan: ["#155E75", "#0E7490"],
  pink: ["#9D174D", "#BE185D"], purple: ["#6B21A8", "#7E22CE"], sky: ["#075985", "#0369A1"], teal: ["#115E59", "#0F766E"],
};
const lightTextCss = Object.entries(LIGHT_TEXT).map(([hue, [deep, mid]]) => [100, 200, 300, 400].map((n) => {
  const c = n <= 200 ? deep : mid;
  return `[data-sk-theme=light] [class~="text-${hue}-${n}"],[data-sk-theme=light] [class*=" text-${hue}-${n}/"],[data-sk-theme=light] [class^="text-${hue}-${n}/"]{color:${c}}`;
}).join("")).join("");
const THEME_CSS = `:root{
--sk-bg:11 15 25;--sk-panel:15 23 42;--sk-ink:241 245 249;--sk-gold:245 158 11;
--sk-white:255 255 255;--sk-black:0 0 0;
--sk-slate-50:248 250 252;--sk-slate-100:241 245 249;--sk-slate-200:226 232 240;--sk-slate-300:203 213 225;--sk-slate-400:148 163 184;
--sk-slate-500:100 116 139;--sk-slate-600:71 85 105;--sk-slate-700:51 65 85;--sk-slate-800:30 41 59;--sk-slate-900:15 23 42;--sk-slate-950:2 6 23;
--sk-script-leading:1.7;
--sk-glow:radial-gradient(ellipse at top, #1E1B4B55, transparent 60%), radial-gradient(ellipse at bottom right, #F59E0B12, transparent 50%);
--sk-river:#22D3EE;--sk-well:0 0 0;
color-scheme:dark;
}
[data-sk-black]{--sk-bg:0 0 0;--sk-panel:10 10 14;--sk-slate-950:0 0 0;--sk-slate-900:12 12 18;--sk-glow:radial-gradient(ellipse at bottom right, #F59E0B0c, transparent 50%)}
[data-sk-theme=light]{
--sk-bg:250 247 240;--sk-panel:255 253 248;--sk-ink:30 27 75;--sk-gold:180 83 9;
--sk-white:30 27 75;--sk-black:0 0 0;
--sk-slate-50:15 17 42;--sk-slate-100:30 33 62;--sk-slate-200:44 49 82;--sk-slate-300:58 64 98;--sk-slate-400:82 89 120;
--sk-slate-500:108 115 143;--sk-slate-600:150 157 180;--sk-slate-700:200 204 218;--sk-slate-800:226 229 237;--sk-slate-900:238 239 244;--sk-slate-950:248 247 243;
--sk-glow:radial-gradient(ellipse at top, #FDE68A55, transparent 60%), radial-gradient(ellipse at bottom right, #A5B4FC22, transparent 50%);
--sk-river:#0E7490;--sk-well:255 255 255;
color-scheme:light;
}
[data-sk-theme=light] .text-slate-950,[data-sk-theme=light] .text-slate-900{color:rgb(2 6 23)}
[data-sk-theme=light] .bg-black\\/20,[data-sk-theme=light] .bg-black\\/30{background-color:rgb(255 255 255/.75);box-shadow:inset 0 0 0 1px rgb(30 27 75/.08)}
[data-sk-theme=light] .sk-card{background-color:rgb(255 255 255/.72);box-shadow:0 1px 2px rgb(30 27 75/.06),0 4px 16px rgb(30 27 75/.05)}
[data-sk-theme=light] .sk-level-bg{background-image:none!important}
[data-sk-theme=light] .sk-on-color,[data-sk-theme=light] .sk-on-color .text-white{color:#fff}
${lightTextCss}
.sk-script{line-height:var(--sk-script-leading)}
@keyframes sk-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
.sk-stop-current{animation:sk-breathe 2.6s ease-in-out infinite}
@keyframes sk-leaf{0%{transform:translate(0,-60px) rotate(0);opacity:0}15%{opacity:1}100%{transform:translate(var(--dx),110px) rotate(var(--rot));opacity:.9}}
@keyframes sk-door-l{to{transform:perspective(600px) rotateY(-78deg)}}
@keyframes sk-door-r{to{transform:perspective(600px) rotateY(78deg)}}
@keyframes sk-lamp{0%{opacity:.15;transform:scale(.6)}60%{opacity:1;transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}
@keyframes sk-rise{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
@keyframes sk-ghost{0%,100%{opacity:.9}50%{opacity:.55}}
@media (prefers-reduced-motion:reduce){.sk-moment *,.sk-stop-current{animation:none!important;opacity:1!important}}`;

/* Extra faces for the Font Gauntlet: loopless display, square, and handwriting. */
const GAUNTLET_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Prompt:wght@500&family=Mitr:wght@400&family=Chakra+Petch:wght@500&family=Sriracha&family=Itim&family=Noto+Sans+Lao+Looped:wght@400&display=swap";
const GAUNTLET_FACES = [
  { id: "loop", name: "Noto Serif Thai", note: "Looped serif: textbooks", looped: true },
  { id: "sarabun", name: "Sarabun", note: "Looped sans: official forms", looped: true, th: '"Sarabun", sans-serif', lo: '"Noto Sans Lao Looped", "Noto Sans Lao", sans-serif' },
  { id: "street", name: "Kanit", note: "Loopless: signs and ads" },
  { id: "prompt", name: "Prompt", note: "Loopless: malls and apps", th: '"Prompt", "Kanit", sans-serif' },
  { id: "mitr", name: "Mitr", note: "Rounded loopless: menus", th: '"Mitr", "Kanit", sans-serif' },
  { id: "chakra", name: "Chakra Petch", note: "Square: tech brands", th: '"Chakra Petch", "Kanit", sans-serif' },
  { id: "sriracha", name: "Sriracha", note: "Handwriting: menu boards", th: '"Sriracha", "Kanit", cursive' },
  { id: "itim", name: "Itim", note: "Rounded handwriting: notes", th: '"Itim", "Kanit", cursive' },
];
// Lao has fewer free faces: serif, sans and looped sans.
const GAUNTLET_LAO = ["loop", "street", "sarabun"];
GAUNTLET_FACES.forEach((f) => { if (!FONT_STACKS[f.id]) FONT_STACKS[f.id] = { th: f.th, lo: f.lo || FONT_STACKS.street.lo }; });
let gauntletFontsLoaded = false;
function loadGauntletFonts() {
  if (gauntletFontsLoaded || typeof document === "undefined") return;
  gauntletFontsLoaded = true;
  if (document.querySelector("[data-suvarnakani-gauntlet]")) return; // the installed app bundles them
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = GAUNTLET_FONTS_HREF;
  link.setAttribute("data-suvarnakani-gauntlet", "");
  document.head.appendChild(link);
}
/** Stage 3+ items appear in a different face each day when random fonts are on. */
function reviewFontFor(item, srsEntry, base, prefs) {
  if (!prefs?.randomFonts || (srsEntry?.stage || 0) < 3) return base;
  const pool = item.toneSet === "lo" ? GAUNTLET_LAO : GAUNTLET_FACES.map((f) => f.id);
  let h = 0;
  for (const ch of item.id + todayKey()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

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

/*
 * Vientiane Lao has its own tone values. Contours follow the common five-way
 * description for learners coming from Thai (rising, high, mid, low falling,
 * high falling). Some speakers split the rising tone by class; we don't.
 */
Object.assign(TONES, {
  lo_rising: { name: "Rising", th: "ສຽງຂຶ້ນ", chao: "24", color: "#4FA3FF", ink: "#7DBBFF", grad: ["#2A5FA8", "#BFE0FF"], notes: ["A3", "E4"], lao: true },
  lo_high: { name: "High", th: "ສຽງສູງ", chao: "45", color: "#FFE27A", ink: "#FFE27A", grad: ["#F5C842", "#FFF0B8"], notes: ["G4", "A4"], lao: true },
  lo_mid: { name: "Mid", th: "ສຽງກາງ", chao: "33", color: "#22C3A6", ink: "#3DDBBE", grad: ["#22C3A6", "#22C3A6"], notes: ["C4", "C4"], lao: true },
  lo_lowfall: { name: "Low falling", th: "ສຽງຕ່ຳຕົກ", chao: "31", color: "#6E5CE6", ink: "#A99DF7", grad: ["#8577EE", "#4D3FC4"], notes: ["C4", "F3"], lao: true },
  lo_highfall: { name: "High falling", th: "ສຽງສູງຕົກ", chao: "52", color: "#FF6B4A", ink: "#FF8A6E", grad: ["#FFB199", "#C2381D"], notes: ["A4", "E4"], lao: true },
});
const LAO_TONE_ORDER = ["lo_mid", "lo_lowfall", "lo_highfall", "lo_high", "lo_rising"];

/*
 * Daylight tone palette (V1). On paper the lightest colour (High) would have the
 * least contrast, so daylight keeps each hue but uses darker inks of similar
 * weight, and pitch is carried by the contour glyph instead of lightness.
 */
const TONE_HUE = { lo_rising: "rising", lo_high: "high", lo_mid: "mid", lo_lowfall: "low", lo_highfall: "falling" };
const TONES_DARK = Object.fromEntries(Object.entries(TONES).map(([k, t]) => [k, { color: t.color, ink: t.ink, grad: t.grad }]));
const TONES_LIGHT_BASE = {
  mid: { color: "#0F9D84", ink: "#0B7360", grad: ["#0F9D84", "#0F9D84"] },
  low: { color: "#5B47D6", ink: "#4434B0", grad: ["#6E5CE6", "#3A2BA6"] },
  falling: { color: "#E04A26", ink: "#B0361A", grad: ["#F07A5C", "#A82E12"] },
  high: { color: "#C28F00", ink: "#7F5E00", grad: ["#A87C00", "#D9A514"] },
  rising: { color: "#2F7FE0", ink: "#1D5BA8", grad: ["#1D4F94", "#5FA4F0"] },
};
let activePalette = "dark";
/** Swap tone colours in place for the theme. Components read TONES at render time. */
function applyTonePalette(theme) {
  const light = theme === "light";
  if ((light ? "light" : "dark") === activePalette) return;
  activePalette = light ? "light" : "dark";
  Object.keys(TONES).forEach((k) => Object.assign(TONES[k], light ? TONES_LIGHT_BASE[TONE_HUE[k] || k] : TONES_DARK[k]));
}

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

/* ============================================================================
 * Thai reading engine: split Thai text into syllables and read each one's
 * class, live/dead, vowel length, mark and tone from its spelling. Used by the
 * Decoder, tone tinting and romanisation. Spelling can't always decide hidden
 * vowels (ขนม, สบาย), so syllables with an inferred vowel are flagged as guesses,
 * and words the course already knows use the course's reading.
 * ========================================================================== */
const TH_MID = "กจดตบปอฎฏ";
const TH_HIGH = "ขฃฉฐถผฝศษสห";
const TH_SONORANT = "งญนมยรลวฬณ";
const TH_TONE_MARKS = { "่": "ek", "้": "tho", "๊": "tri", "๋": "jat" };
const TH_DEPENDENT = "ะัาำิีึืุู็่้๊๋์";
const isThaiCons = (c) => !!c && c >= "ก" && c <= "ฮ" && c !== "ฤ" && c !== "ฦ";
const thaiClassOf = (c) => (TH_MID.includes(c) ? "mid" : TH_HIGH.includes(c) ? "high" : "low");
const TH_INITIAL = {
  ก: "k", ข: "kh", ฃ: "kh", ค: "kh", ฅ: "kh", ฆ: "kh", ง: "ng", จ: "j", ฉ: "ch", ช: "ch", ซ: "s", ฌ: "ch", ญ: "y", ฎ: "d", ฏ: "t", ฐ: "th", ฑ: "th", ฒ: "th", ณ: "n",
  ด: "d", ต: "t", ถ: "th", ท: "th", ธ: "th", น: "n", บ: "b", ป: "p", ผ: "ph", ฝ: "f", พ: "ph", ฟ: "f", ภ: "ph", ม: "m", ย: "y", ร: "r", ล: "l", ว: "w", ศ: "s", ษ: "s", ส: "s", ห: "h", ฬ: "l", อ: "", ฮ: "h",
};
const TH_FINAL = (c) => {
  if ("กขคฆ".includes(c)) return "k";
  if ("บปพฟภ".includes(c)) return "p";
  if (c === "ง") return "ng";
  if (c === "ม") return "m";
  if (c === "ย") return "i";
  if (c === "ว") return "w";
  if ("ญณนรลฬ".includes(c)) return "n";
  if ("จชซฌฎฏฐฑฒดตถทธศษส".includes(c)) return "t";
  return null; // อ ห ฮ never close a syllable
};
const TH_CLUSTERS = { กร: "kr", กล: "kl", กว: "kw", ขร: "khr", ขล: "khl", ขว: "khw", คร: "khr", คล: "khl", คว: "khw", ปร: "pr", ปล: "pl", พร: "phr", พล: "phl", ตร: "tr", ดร: "dr", บร: "br", บล: "bl", ฟร: "fr", ฟล: "fl", ทร: "s", จร: "j", ซร: "s", สร: "s", ศร: "s" };

/* Vowel templates. O = onset, T = optional tone mark, F = optional final, ! = final required. */
const TH_TEMPLATES = [
  ["เOTาะ", "ɔ", false], ["เOีTยะ", "ia", false], ["เOีTยF", "ia", true], ["เOืTอF", "ʉa", true], ["เOิTF!", "əə", true], ["เOTอะ", "ə", false],
  ["เOTอ", "əə", true], ["เOTา", "ao", false], ["เO็TF!", "e", false], ["เOTะ", "e", false], ["เOTF", "ee", true],
  ["แO็TF!", "ɛ", false], ["แOTะ", "ɛ", false], ["แOTF", "ɛɛ", true], ["โOTะ", "o", false], ["โOTF", "oo", true],
  ["ใOT", "ai", false], ["ไOTF", "ai", false],
  ["OัTวะ", "ua", false], ["OัTวF", "ua", true], ["OัTF!", "a", false], ["OTะ", "a", false], ["OTำ", "am", false], ["OTาF", "aa", true],
  ["OิTF", "i", false], ["OีTF", "ii", true], ["OึTF", "ʉ", false], ["OืTอF", "ʉʉ", true], ["OืTF!", "ʉʉ", true], ["OุTF", "u", false], ["OูTF", "uu", true],
  ["O็TอF!", "ɔ", false], ["OTอF", "ɔɔ", true], ["OTวF!", "ua", true],
  ["OTF!", "o", false, 1.5], ["OT", "a", false, 2.5],
];
/* Words read against their spelling. */
const TH_EXCEPTIONS = { ก็: { roman: "kɔ̂", tone: "falling" }, น้ำ: { roman: "náam" }, เก้า: { roman: "kâao" }, เช้า: { roman: "cháao" }, เท้า: { roman: "tháao" }, โทร: { roman: "thoo" } };

function thaiOnsets(s, i) {
  const c = s[i];
  if (!isThaiCons(c)) return [];
  const out = [{ end: i + 1, letters: c, cls: thaiClassOf(c), sound: TH_INITIAL[c] }];
  const pair = c + (s[i + 1] || "");
  if (c === "ห" && "งญนมยรลวฬ".includes(s[i + 1] || "")) out.push({ end: i + 2, letters: pair, cls: "high", sound: TH_INITIAL[s[i + 1]], lead: "ห นำ" });
  if (c === "อ" && s[i + 1] === "ย") out.push({ end: i + 2, letters: pair, cls: "mid", sound: "y", lead: "อ นำ" });
  if (TH_CLUSTERS[pair]) out.push({ end: i + 2, letters: pair, cls: thaiClassOf(c), sound: TH_CLUSTERS[pair], cluster: true });
  return out;
}

/** Every syllable that can start at position i, with its cost (lower is likelier). */
function thaiCandidates(s, i, wordStart) {
  const found = [];
  const tryTemplate = ([tpl, vowel, long, extra = 0]) => {
    let k = i;
    const pre = tpl[0] === "O" ? null : tpl[0];
    if (pre) { if (s[k] !== pre) return; k += 1; }
    const body = pre ? tpl.slice(1) : tpl;
    const run = (onsetOpt) => {
      let p = onsetOpt.end;
      let fin = null;
      let mk = "none";
      for (let t = 1; t < body.length; t += 1) {
        const ch = body[t];
        if (ch === "T") { if (TH_TONE_MARKS[s[p]]) { mk = TH_TONE_MARKS[s[p]]; p += 1; } continue; }
        if (ch === "F") {
          const req = body[t + 1] === "!";
          if (req) t += 1;
          const f = s[p];
          // a letter followed by its own vowel or mark starts the next syllable instead
          if (isThaiCons(f) && TH_FINAL(f) && !(s[p + 1] && TH_DEPENDENT.includes(s[p + 1]))) { fin = f; p += 1; } else if (req) return;
          continue;
        }
        if (s[p] !== ch) return;
        p += 1;
      }
      // silent letters under ◌์ (จันทร์, ศาสตร์)
      let q = p;
      while (q < s.length && isThaiCons(s[q]) && q - p < 3) q += 1;
      if (q < s.length && (s[q] === "ิ" || s[q] === "ุ") && s[q + 1] === "์") q += 1;
      let silent = "";
      if (s[q] === "์" && q > p) { silent = s.slice(p, q).join(""); p = q + 1; }
      else if (s[p] === "์" && fin) { p += 1; silent = fin; fin = null; }
      if ((vowel === "ai" || vowel === "ao") && fin) { if (fin === "ย" && pre === "ไ") fin = null; else return; } // ไทย
      found.push({ start: i, end: p, onset: onsetOpt, vowel, long, mark: mk, final: fin, silent, hidden: extra > 0, cost: 1 + (extra === 2.5 && i === wordStart ? 2.3 : extra) + (onsetOpt.lead || onsetOpt.cluster ? -0.05 : 0) });
    };
    thaiOnsets(s, k).forEach(run);
  };
  TH_TEMPLATES.forEach(tryTemplate);
  // ก็ and the like: a consonant with only ◌็ reads a short ɔ
  if (isThaiCons(s[i]) && s[i + 1] === "\u0E47" && !isThaiCons(s[i + 2]) && !TH_TONE_MARKS[s[i + 2]]) found.push({ start: i, end: i + 2, onset: { letters: s[i], cls: thaiClassOf(s[i]), sound: TH_INITIAL[s[i]] }, vowel: "ɔ", long: false, mark: "none", final: null, silent: "", hidden: false, cost: 1 });
  if (s[i] === "ฤ") found.push({ start: i, end: i + 1, onset: { letters: "ฤ", cls: "low", sound: "r" }, vowel: "ʉ", long: false, mark: "none", final: null, silent: "", hidden: true, cost: 2 });
  return found;
}

/** Best split of one run of Thai letters into syllables (dynamic programming over costs). */
function thaiSplit(word) {
  const s = [...word.normalize("NFC")];
  const best = Array(s.length + 1).fill(null);
  best[0] = { cost: 0, list: [] };
  for (let i = 0; i < s.length; i += 1) {
    if (!best[i]) continue;
    const cands = thaiCandidates(s, i, 0);
    if (!cands.length) {
      // unreadable character (digit, ๆ, stray mark): keep it as its own piece
      const c = best[i].cost + 5;
      if (!best[i + 1] || best[i + 1].cost > c) best[i + 1] = { cost: c, list: [...best[i].list, { start: i, end: i + 1, raw: true }] };
      continue;
    }
    cands.forEach((cd) => {
      const c = best[i].cost + cd.cost;
      if (!best[cd.end] || best[cd.end].cost > c) best[cd.end] = { cost: c, list: [...best[i].list, cd] };
    });
  }
  const list = best[s.length]?.list || [];
  return list.map((cd) => ({ ...cd, text: s.slice(cd.start, cd.end).join("") }));
}

const TONE_DIACRITIC = { mid: "", low: "̀", falling: "̂", high: "́", rising: "̌" };
function addToneMark(roman, tone) {
  const m = TONE_DIACRITIC[tone] || "";
  const at = roman.search(/[aeiouɛɔʉə]/);
  return at < 0 || !m ? roman : (roman.slice(0, at + 1) + m + roman.slice(at + 1)).normalize("NFC");
}

/** Read the syllables of a Thai word: class, live/dead, length, mark, tone, romanisation. */
function readThai(word) {
  const sylls = thaiSplit(word);
  const out = [];
  sylls.forEach((sy, n) => {
    if (sy.raw) { out.push({ text: sy.text, raw: true }); return; }
    let cls = sy.onset.cls;
    const notes = [];
    if (sy.onset.lead) notes.push(`${sy.onset.lead}: the silent ${sy.onset.letters[0]} makes this syllable ${CLASSES[cls].name} class.`);
    const prev = out[n - 1];
    // Leading-consonant rule: after a hidden-a syllable on a High or Middle letter, a lone sonorant follows that letter's class (ขนม, ตลาด).
    if (prev && !prev.raw && prev.hiddenA && prev.cls !== "low" && sy.onset.letters.length === 1 && TH_SONORANT.includes(sy.onset.letters) && cls === "low") {
      cls = prev.cls;
      notes.push(`Leading letter: ${sy.onset.letters} follows the ${CLASSES[cls].name}-class ${prev.text[0]} before it.`);
    }
    const finalSound = sy.final ? TH_FINAL(sy.final) : null;
    const inherentLive = ["ai", "ao", "am"].includes(sy.vowel);
    const live = finalSound ? !["k", "t", "p"].includes(finalSound) : inherentLive || sy.long;
    const parts = { cls, live, long: sy.long, mark: sy.mark };
    const ex = TH_EXCEPTIONS[sy.text];
    const tone = ex?.tone || computeTone(parts).tone;
    let roman = sy.onset.sound + sy.vowel + (finalSound || "");
    roman = roman.replace(/^(.*?)(ia|ʉa|ua)i$/, "$1$2i").replace("aaw", "aaw");
    roman = ex?.roman || addToneMark(roman, tone);
    if (sy.vowel === "a" && sy.hidden) notes.push("Hidden a: no vowel is written, so a short a is read.");
    if (sy.vowel === "o" && sy.hidden) notes.push("Hidden o: a consonant with only a final reads a short o.");
    if (sy.silent) notes.push(`${sy.silent}์ is silent.`);
    if (ex) notes.push("Read against its spelling.");
    out.push({ text: sy.text, cls, live, long: sy.long, mark: sy.mark, tone, roman, guess: sy.hidden, hiddenA: sy.hidden && sy.vowel === "a", onset: sy.onset.letters, final: sy.final, notes, parts });
  });
  return out;
}

/* Words the app already knows, with the course's own reading. */
let thaiLexiconCache = null;
function thaiLexicon() {
  if (thaiLexiconCache) return thaiLexiconCache;
  const lex = new Map();
  const add = (th, e) => {
    if (!th || !/^[ก-๎]+$/.test(th) || lex.has(th)) return;
    lex.set(th, e);
  };
  [...CURRICULUM, ...GARDEN_ITEMS, ...EXTRA_LEXICON_SOURCES()].forEach((it) => {
    if (it.tier === "glyph") return;
    add(it.th, { roman: (it.thRoman || "").split(" ·")[0], meaning: it.meaning, tone: it.tone, id: it.id });
  });
  thaiLexiconCache = lex;
  return lex;
}
const extraLexicon = [];
/* Words from the slicer sentences and street signs also count as known readings. */
function EXTRA_LEXICON_SOURCES() {
  const out = [...extraLexicon];
  SENTENCES.filter((x) => x.script === "th").forEach((x) => x.words.forEach((w) => out.push({ th: w.w, thRoman: w.r, meaning: w.m, tone: w.tone })));
  STREET_PACKS.filter((p) => p.script === "th").forEach((p) => p.lines.flat().forEach((t) => { if (t.r && t.m && !t.price) out.push({ th: t.t, thRoman: t.r, meaning: t.m, tone: t.tone }); }));
  return out;
}
function registerThaiWords(list) { list.forEach((w) => extraLexicon.push(w)); thaiLexiconCache = null; }

/**
 * Split unspaced Thai into words. Known words win; the rest is read syllable by
 * syllable. Returns [{ text, known, meaning, id, syllables: [...] }].
 */
function segmentThai(text) {
  const lex = thaiLexicon();
  const maxLen = Math.max(...[...lex.keys()].map((k) => [...k].length), 1);
  const words = [];
  (text || "").split(/(\s+)/).forEach((chunk) => {
    if (!chunk.trim()) return;
    const s = [...chunk.normalize("NFC")];
    const best = Array(s.length + 1).fill(null);
    best[0] = { cost: 0, list: [] };
    for (let i = 0; i < s.length; i += 1) {
      if (!best[i]) continue;
      if (!/[ก-๎]/.test(s[i])) {
        let j = i; while (j < s.length && !/[ก-๎]/.test(s[j])) j += 1;
        const c = best[i].cost + 0.5;
        if (!best[j] || best[j].cost > c) best[j] = { cost: c, list: [...best[i].list, { kind: "other", start: i, end: j }] };
        continue;
      }
      for (let L = Math.min(maxLen, s.length - i); L >= 1; L -= 1) {
        const w = s.slice(i, i + L).join("");
        if (lex.has(w)) {
          const c = best[i].cost + 0.8;
          if (!best[i + L] || best[i + L].cost > c) best[i + L] = { cost: c, list: [...best[i].list, { kind: "word", start: i, end: i + L }] };
        }
      }
      thaiCandidates(s, i, i).forEach((cd) => {
        // a syllable may not end in the middle of a mark cluster
        const c = best[i].cost + cd.cost + 0.4;
        if (!best[cd.end] || best[cd.end].cost > c) best[cd.end] = { cost: c, list: [...best[i].list, { kind: "syl", start: i, end: cd.end }] };
      });
      const c = best[i].cost + 6;
      if (!best[i + 1] || best[i + 1].cost > c) best[i + 1] = { cost: c, list: [...best[i].list, { kind: "syl", start: i, end: i + 1 }] };
    }
    const list = best[s.length]?.list || [];
    let pending = null;
    const flush = () => { if (pending) { words.push(pending); pending = null; } };
    list.forEach((p) => {
      const t = s.slice(p.start, p.end).join("");
      if (p.kind === "other") { flush(); words.push({ text: t, other: true, syllables: [] }); return; }
      if (p.kind === "word") {
        flush();
        const e = lex.get(t);
        const syl = readThai(t);
        const romans = e.roman ? e.roman.split(/[-\s]+/).filter(Boolean) : [];
        const sylls = syl.map((x, k) => (x.raw ? x : {
          ...x,
          tone: e.tone?.length === syl.length ? e.tone[k] : x.tone,
          roman: romans.length === syl.length ? romans[k] : x.roman,
          guess: false,
        }));
        words.push({ text: t, known: true, meaning: e.meaning, id: e.id, roman: e.roman, syllables: sylls });
        return;
      }
      const sy = readThai(t);
      if (!pending) pending = { text: "", known: false, syllables: [] };
      pending.text += t;
      pending.syllables.push(...sy);
    });
    flush();
  });
  return words;
}

/* Romanisation systems. The course writes a learner spelling with tone accents;
 * RTGS (road signs) drops tones and vowel length; IPA adds Chao tone letters. */
const ROMAN_SYSTEMS = { learner: "Learner (tones marked)", rtgs: "RTGS (road signs)", ipa: "IPA" };
const CHAO_LETTER = { mid: "˧", low: "˨˩", falling: "˥˩", high: "˦˥", rising: "˩˦" };
function toneOfRoman(syl) {
  const d = syl.normalize("NFD");
  if (d.includes("̀")) return "low";
  if (d.includes("̂")) return "falling";
  if (d.includes("́")) return "high";
  if (d.includes("̌")) return "rising";
  return "mid";
}
function romanize(learner, system = "learner") {
  if (!learner || system === "learner") return learner;
  return learner.split(/(\s*·\s*|\s*\/\s*|[\s,]+|-)/).map((part) => {
    if (!/[a-zɛɔʉə]/i.test(part)) return part;
    const tone = toneOfRoman(part);
    let p = part.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (system === "rtgs") {
      p = p.replace(/ʉa/g, "uea").replace(/ʉ+/g, "ue").replace(/ɛ+/g, "ae").replace(/ɔ+/g, "o").replace(/ə+/g, "oe")
        .replace(/aa/g, "a").replace(/ii/g, "i").replace(/uu/g, "u").replace(/ee/g, "e").replace(/oo/g, "o")
        .replace(/^j/, "ch").replace(/^g/, "k").replace(/^bp/, "p").replace(/^dt/, "t").replace(/w$/, "o").replace(/([aeiou])i$/, "$1i");
      return p;
    }
    p = p.replace(/^kh/, "kʰ").replace(/^ph/, "pʰ").replace(/^th/, "tʰ").replace(/^ch/, "tɕʰ").replace(/^j/, "tɕ").replace(/^g/, "k").replace(/ng/g, "ŋ").replace(/^y/, "j")
      .replace(/aa/g, "aː").replace(/ii/g, "iː").replace(/uu/g, "uː").replace(/ee/g, "eː").replace(/oo/g, "oː").replace(/ɛɛ/g, "ɛː").replace(/ɔɔ/g, "ɔː").replace(/ʉʉ/g, "ɯː").replace(/əə/g, "ɤː")
      .replace(/ʉ/g, "ɯ").replace(/ə/g, "ɤ").replace(/([kpt])$/, "$1̚");
    if (/^[aeiouɛɔɯɤ]/.test(p)) p = "ʔ" + p;
    return p + CHAO_LETTER[tone];
  }).join("");
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

/* ============================================================================
 * Word Garden: about 280 everyday words in seven beds (levels 10 to 16). Each
 * line is th|lo|reading|meaning|example|example meaning. Tones come from the
 * reading's marks; the Lao reading is spelled out from the Lao letters.
 * ========================================================================== */
const GARDEN_SRC = `#food|Food and ordering|อาหารและการสั่ง|ອາຫານແລະການສັ່ງ|#F59E0B
หมู|ໝູ|mǔu|pork / pig|ข้าวผัดหมู|fried rice with pork
เนื้อ|ຊີ້ນ|nʉ́a|meat / beef|ไม่กินเนื้อ|I don't eat beef
กุ้ง|ກຸ້ງ|kûng|shrimp|ต้มยำกุ้ง|spicy shrimp soup
ไข่|ໄຂ່|khài|egg|ไข่ดาว|fried egg
ผัก|ຜັກ|phàk|vegetables|ผัดผัก|stir-fried vegetables
ผลไม้|ໝາກໄມ້|phǒn-lá-mái|fruit|ชอบกินผลไม้|I like eating fruit
น้ำแข็ง|ນ້ຳກ້ອນ|nám-khɛ̌ng|ice|ไม่ใส่น้ำแข็ง|no ice, please
ชา|ຊາ|chaa|tea|ชาเย็น|iced tea
นม|ນົມ|nom|milk|ชานม|milk tea
เบียร์|ເບຍ|bia|beer|เบียร์เย็น|cold beer
ข้าวเหนียว|ເຂົ້າໜຽວ|khâaw-nǐaw|sticky rice|ข้าวเหนียวมะม่วง|mango sticky rice
ก๋วยเตี๋ยว|ເຝີ|kǔay-tǐaw|noodle soup|ก๋วยเตี๋ยวหมู|pork noodle soup
ทอด|ທອດ|thɔ̂ɔt|deep-fry|ไก่ทอด|fried chicken
ต้ม|ຕົ້ມ|tôm|boil / soup|ต้มไข่|boil an egg
ย่าง|ປີ້ງ|yâang|grill|หมูย่าง|grilled pork
เผ็ด|ເຜັດ|phèt|spicy|เผ็ดมาก|very spicy
หวาน|ຫວານ|wǎan|sweet|ไม่หวาน|not sweet
เค็ม|ເຄັມ|khem|salty|เค็มไป|too salty
เปรี้ยว|ສົ້ມ|prîaw|sour|เปรี้ยวมาก|very sour
อร่อย|ແຊບ|à-rɔ̀i|delicious|อร่อยมาก|very tasty
จาน|ຈານ|jaan|plate|ข้าวหนึ่งจาน|a plate of rice
ชาม|ຖ້ວຍ|chaam|bowl|ชามใหญ่|a big bowl
แก้ว|ຈອກ|kɛ̂ɛw|glass|น้ำหนึ่งแก้ว|a glass of water
ช้อน|ບ່ວງ|chɔ́ɔn|spoon|ขอช้อน|a spoon, please
ส้อม|ສ້ອມ|sɔ̂m|fork|ช้อนส้อม|spoon and fork
ตะเกียบ|ໄມ້ທູ່|tà-kìap|chopsticks|ใช้ตะเกียบ|use chopsticks
เมนู|ເມນູ|mee-nuu|menu|ขอเมนู|the menu, please
สั่ง|ສັ່ງ|sàng|order|สั่งอาหาร|order food
อิ่ม|ອີ່ມ|ìm|full (after eating)|อิ่มแล้ว|I'm full
หิว|ຫິວ|hǐw|hungry|หิวน้ำ|thirsty
ดื่ม|ດື່ມ|dʉ̀ʉm|drink|ดื่มน้ำ|drink water
เช็คบิล|ໄລ່ເງິນ|chék-bin|the bill, please|เช็คบิลครับ|check, please
ร้านอาหาร|ຮ້ານອາຫານ|ráan-aa-hǎan|restaurant|ร้านอาหารไทย|Thai restaurant
อาหารเช้า|ອາຫານເຊົ້າ|aa-hǎan-cháao|breakfast|กินอาหารเช้า|eat breakfast
น้ำปลา|ນ້ຳປາ|nám-plaa|fish sauce|ใส่น้ำปลา|add fish sauce
น้ำตาล|ນ້ຳຕານ|nám-taan|sugar|ไม่ใส่น้ำตาล|no sugar
เกลือ|ເກືອ|klʉa|salt|ใส่เกลือ|add salt
พริก|ໝາກເຜັດ|phrík|chili|ไม่ใส่พริก|no chili
มะม่วง|ໝາກມ່ວງ|má-mûang|mango|มะม่วงสุก|ripe mango
กล้วย|ໝາກກ້ວຍ|klûay|banana|กล้วยทอด|fried banana
มะพร้าว|ໝາກພ້າວ|má-phráaw|coconut|น้ำมะพร้าว|coconut water
ส้มตำ|ຕຳໝາກຫຸ່ງ|sôm-tam|papaya salad|ส้มตำไม่เผ็ด|papaya salad, not spicy
ลาบ|ລາບ|lâap|minced meat salad|ลาบหมู|pork larb
กาแฟ|ກາເຟ|kaa-fɛɛ|coffee|กาแฟร้อน|hot coffee
#travel|Getting around|การเดินทาง|ການເດີນທາງ|#22D3EE
ไป|ໄປ|pai|go|ไปไหน|where are you going?
ซ้าย|ຊ້າຍ|sáai|left|เลี้ยวซ้าย|turn left
ตรงไป|ກົງໄປ|trong-pai|go straight|ตรงไปเลย|go straight on
เลี้ยว|ລ້ຽວ|líaw|turn|เลี้ยวขวา|turn right
หยุด|ຢຸດ|yùt|stop|หยุดตรงนี้|stop here
ที่นี่|ບ່ອນນີ້|thîi-nîi|here|อยู่ที่นี่|it's here
ที่นั่น|ບ່ອນນັ້ນ|thîi-nân|there|ไปที่นั่น|go there
ใกล้|ໃກ້|klâi|near|ใกล้มาก|very near
ไกล|ໄກ|klai|far|ไกลไหม|is it far?
ถนน|ຖະໜົນ|thà-nǒn|road|ถนนใหญ่|main road
สถานี|ສະຖານີ|sà-thǎa-nii|station|สถานีรถไฟ|train station
สนามบิน|ສະໜາມບິນ|sà-nǎam-bin|airport|ไปสนามบิน|go to the airport
รถเมล์|ລົດເມ|rót-mee|bus|ขึ้นรถเมล์|get on the bus
รถไฟ|ລົດໄຟ|rót-fai|train|นั่งรถไฟ|take the train
เครื่องบิน|ຍົນ|khrʉ̂ang-bin|airplane|ขึ้นเครื่องบิน|board the plane
เรือ|ເຮືອ|rʉa|boat|นั่งเรือ|take a boat
แท็กซี่|ແທັກຊີ|thɛ́k-sîi|taxi|เรียกแท็กซี่|call a taxi
มอเตอร์ไซค์|ລົດຈັກ|mɔɔ-təə-sai|motorbike|ขี่มอเตอร์ไซค์|ride a motorbike
ตั๋ว|ປີ້|tǔa|ticket|ซื้อตั๋ว|buy a ticket
โรงแรม|ໂຮງແຮມ|roong-rɛɛm|hotel|โรงแรมนี้|this hotel
ห้อง|ຫ້ອງ|hɔ̂ng|room|ห้องว่าง|a free room
ประตู|ປະຕູ|prà-tuu|door / gate|เปิดประตู|open the door
ทาง|ທາງ|thaang|way / path|ทางนี้|this way
แผนที่|ແຜນທີ່|phɛ̌ɛn-thîi|map|ดูแผนที่|look at the map
เดิน|ຍ່າງ|dəən|walk|เดินไป|walk there
วิ่ง|ແລ່ນ|wîng|run|วิ่งเร็ว|run fast
ขึ้น|ຂຶ້ນ|khʉ̂n|get on / go up|ขึ้นรถ|get in the car
ลง|ລົງ|long|get off / go down|ลงตรงนี้|get off here
ออก|ອອກ|ɔ̀ɔk|leave / go out|ออกไป|go out
เข้า|ເຂົ້າ|khâo|enter|เข้ามา|come in
ข้างหน้า|ທາງໜ້າ|khâang-nâa|in front|อยู่ข้างหน้า|it's in front
ข้างหลัง|ທາງຫຼັງ|khâang-lǎng|behind|อยู่ข้างหลัง|it's behind
สะพาน|ຂົວ|sà-phaan|bridge|ข้ามสะพาน|cross the bridge
วัด|ວັດ|wát|temple|ไปวัด|go to the temple
โรงพยาบาล|ໂຮງໝໍ|roong-phá-yaa-baan|hospital|ไปโรงพยาบาล|go to hospital
ร้าน|ຮ້ານ|ráan|shop|ร้านนี้|this shop
ธนาคาร|ທະນາຄານ|thá-naa-khaan|bank|ธนาคารปิด|the bank is closed
ทะเล|ທະເລ|thá-lee|sea|ไปทะเล|go to the sea
แม่น้ำ|ແມ່ນ້ຳ|mɛ̂ɛ-náam|river|แม่น้ำโขง|the Mekong River
ภูเขา|ພູເຂົາ|phuu-khǎo|mountain|ภูเขาสูง|a high mountain
เมือง|ເມືອງ|mʉang|town / city|ในเมือง|in town
#time|Numbers and time|ตัวเลขและเวลา|ຕົວເລກແລະເວລາ|#FFD166
หนึ่ง|ໜຶ່ງ|nʉ̀ng|one|หนึ่งคน|one person
สอง|ສອງ|sɔ̌ɔng|two|สองคน|two people
สาม|ສາມ|sǎam|three|สามวัน|three days
สี่|ສີ່|sìi|four|สี่โมง|four o'clock
ห้า|ຫ້າ|hâa|five|ห้าบาท|five baht
หก|ຫົກ|hòk|six|หกโมงเช้า|six in the morning
เจ็ด|ເຈັດ|jèt|seven|เจ็ดวัน|seven days
แปด|ແປດ|pɛ̀ɛt|eight|แปดโมง|eight o'clock
เก้า|ເກົ້າ|kâao|nine|เก้าบาท|nine baht
ยี่สิบ|ຊາວ|yîi-sìp|twenty|ยี่สิบบาท|twenty baht
ร้อย|ຮ້ອຍ|rɔ́ɔi|hundred|หนึ่งร้อยบาท|one hundred baht
พัน|ພັນ|phan|thousand|สองพัน|two thousand
หมื่น|ໝື່ນ|mʉ̀ʉn|ten thousand|หนึ่งหมื่น|ten thousand
แสน|ແສນ|sɛ̌ɛn|hundred thousand|หนึ่งแสน|a hundred thousand
ล้าน|ລ້ານ|láan|million|หนึ่งล้าน|one million
วัน|ມື້|wan|day|ทุกวัน|every day
วันนี้|ມື້ນີ້|wan-níi|today|วันนี้ร้อน|it's hot today
พรุ่งนี้|ມື້ອື່ນ|phrûng-níi|tomorrow|พรุ่งนี้เจอกัน|see you tomorrow
เมื่อวาน|ມື້ວານ|mʉ̂a-waan|yesterday|เมื่อวานฝนตก|it rained yesterday
ตอนเช้า|ຕອນເຊົ້າ|tɔɔn-cháao|in the morning|ตอนเช้าเย็น|mornings are cool
ตอนเย็น|ຕອນແລງ|tɔɔn-yen|in the evening|เจอกันตอนเย็น|see you this evening
กลางคืน|ກາງຄືນ|klaang-khʉʉn|night|ตอนกลางคืน|at night
ชั่วโมง|ຊົ່ວໂມງ|chûa-moong|hour|สองชั่วโมง|two hours
นาที|ນາທີ|naa-thii|minute|ห้านาที|five minutes
สัปดาห์|ອາທິດ|sàp-daa|week|สัปดาห์หน้า|next week
เดือน|ເດືອນ|dʉan|month|เดือนนี้|this month
ปี|ປີ|pii|year|ปีหน้า|next year
เวลา|ເວລາ|wee-laa|time|ไม่มีเวลา|no time
ตอนนี้|ດຽວນີ້|tɔɔn-níi|now|ตอนนี้กี่โมง|what time is it now?
เร็ว|ໄວ|rew|fast / early|มาเร็ว|come early
ช้า|ຊ້າ|cháa|slow / late|ช้าๆ หน่อย|a bit slower
ก่อน|ກ່ອນ|kɔ̀ɔn|before / first|ไปก่อน|go first
หลัง|ຫຼັງ|lǎng|after / back|หลังอาหาร|after meals
สาย|ສວາຍ|sǎai|late (morning)|ตื่นสาย|wake up late
วันจันทร์|ວັນຈັນ|wan-jan|Monday|วันจันทร์หน้า|next Monday
วันศุกร์|ວັນສຸກ|wan-sùk|Friday|ทุกวันศุกร์|every Friday
วันอาทิตย์|ວັນອາທິດ|wan-aa-thít|Sunday|วันอาทิตย์นี้|this Sunday
กี่โมง|ຈັກໂມງ|kìi-moong|what time?|เปิดกี่โมง|what time does it open?
ครึ่ง|ເຄິ່ງ|khrʉ̂ng|half|สองโมงครึ่ง|half past two
เที่ยง|ທ່ຽງ|thîang|noon|เที่ยงตรง|exactly noon
#people|People and family|คนและครอบครัว|ຄົນແລະຄອບຄົວ|#F472B6
พ่อ|ພໍ່|phɔ̂ɔ|father|พ่อของฉัน|my father
พี่|ອ້າຍ|phîi|older sibling (Lao ອ້າຍ = older brother)|พี่สาว|older sister
น้อง|ນ້ອງ|nɔ́ɔng|younger sibling|น้องชาย|younger brother
ผู้ชาย|ຜູ້ຊາຍ|phûu-chaai|man|ผู้ชายคนนั้น|that man
ผู้หญิง|ຜູ້ຍິງ|phûu-yǐng|woman|ผู้หญิงคนนี้|this woman
เพื่อน|ໝູ່|phʉ̂an|friend|เพื่อนสนิท|close friend
แฟน|ແຟນ|fɛɛn|boyfriend / girlfriend|แฟนของฉัน|my partner
สามี|ຜົວ|sǎa-mii|husband|สามีของเธอ|her husband
ปู่|ປູ່|pùu|grandfather (father's side)|ปู่ย่า|grandparents
ย่า|ຍ່າ|yâa|grandmother (father's side)|บ้านย่า|grandma's house
ยาย|ແມ່ຕູ້|yaai|grandmother (mother's side)|ตายาย|grandparents
ป้า|ປ້າ|pâa|aunt (older)|ป้าใจดี|a kind aunt
น้า|ນ້າ|náa|aunt or uncle (younger, mother's side)|น้าชาย|uncle
ครู|ຄູ|khruu|teacher|ครูสอนภาษา|language teacher
นักเรียน|ນັກຮຽນ|nák-rian|student|นักเรียนไทย|Thai students
หมอ|ໝໍ|mɔ̌ɔ|doctor|ไปหาหมอ|see a doctor
คน|ຄົນ|khon|person / people|คนเยอะ|lots of people
คนไทย|ຄົນໄທ|khon-thai|Thai person|เป็นคนไทย|is Thai
คนลาว|ຄົນລາວ|khon-laao|Lao person|เป็นคนลาว|is Lao
ชื่อ|ຊື່|chʉ̂ʉ|name / be named|ชื่ออะไร|what's your name?
อายุ|ອາຍຸ|aa-yú|age|อายุเท่าไร|how old are you?
ฉัน|ຂ້ອຍ|chǎn|I|ฉันชื่อ|my name is
ผม|ຂ້ອຍ|phǒm|I (male) / hair|ผมชื่อ|my name is (male)
เรา|ພວກເຮົາ|rao|we|เราไปกัน|let's go
พวกเขา|ພວກເຂົາ|phûak-khǎo|they|พวกเขามา|they're coming
ใคร|ໃຜ|khrai|who|ใครมา|who's coming?
ทุกคน|ທຸກຄົນ|thúk-khon|everyone|สวัสดีทุกคน|hello everyone
ทำงาน|ເຮັດວຽກ|tham-ngaan|work|ทำงานที่ไหน|where do you work?
แต่งงาน|ແຕ່ງງານ|tɛ̀ng-ngaan|marry|แต่งงานแล้ว|married
คิดถึง|ຄິດຮອດ|khít-thʉ̌ng|miss (someone)|คิดถึงนะ|I miss you
ชอบ|ມັກ|chɔ̂ɔp|like|ชอบมาก|like it a lot
สวย|ງາມ|sǔay|beautiful|สวยมาก|very beautiful
หล่อ|ຫຼໍ່|lɔ̀ɔ|handsome|หล่อมาก|very handsome
ใจดี|ໃຈດີ|jai-dii|kind|คนใจดี|a kind person
#body|Body and health|ร่างกายและสุขภาพ|ຮ່າງກາຍແລະສຸຂະພາບ|#34D399
หัว|ຫົວ|hǔa|head|ปวดหัว|headache
หู|ຫູ|hǔu|ear|เจ็บหู|earache
จมูก|ດັງ|jà-mùuk|nose|จมูกใหญ่|a big nose
ฟัน|ແຂ້ວ|fan|tooth|ปวดฟัน|toothache
มือ|ມື|mʉʉ|hand|ล้างมือ|wash your hands
แขน|ແຂນ|khɛ̌ɛn|arm|แขนเจ็บ|my arm hurts
ขา|ຂາ|khǎa|leg|ขายาว|long legs
เท้า|ຕີນ|tháao|foot|เจ็บเท้า|my foot hurts
ท้อง|ທ້ອງ|thɔ́ɔng|stomach|ปวดท้อง|stomachache
เลือด|ເລືອດ|lʉ̂at|blood|เลือดออก|bleeding
หัวใจ|ຫົວໃຈ|hǔa-jai|heart|หัวใจดี|a good heart
ป่วย|ບໍ່ສະບາຍ|pùay|sick|ป่วยหนัก|very sick
เจ็บ|ເຈັບ|jèp|hurt|เจ็บมาก|it hurts a lot
ปวด|ປວດ|pùat|ache|ปวดหลัง|backache
ไข้|ໄຂ້|khâi|fever|เป็นไข้|have a fever
ไอ|ໄອ|ai|cough|ไอมาก|coughing a lot
ยา|ຢາ|yaa|medicine|กินยา|take medicine
ร้านขายยา|ຮ້ານຂາຍຢາ|ráan-khǎai-yaa|pharmacy|ร้านขายยาอยู่ไหน|where's the pharmacy?
สบาย|ສະບາຍ|sà-baai|well / comfortable|สบายดีไหม|how are you?
เหนื่อย|ເມື່ອຍ|nʉ̀ay|tired|เหนื่อยมาก|very tired
ง่วง|ງ່ວງ|ngûang|sleepy|ง่วงนอน|sleepy
นอน|ນອນ|nɔɔn|sleep / lie down|ไปนอน|go to bed
ตื่น|ຕື່ນ|tʉ̀ʉn|wake up|ตื่นเช้า|wake up early
อาบน้ำ|ອາບນ້ຳ|àap-náam|shower / bathe|อาบน้ำก่อน|shower first
ล้าง|ລ້າງ|láang|wash|ล้างจาน|wash the dishes
ร้อน|ຮ້ອນ|rɔ́ɔn|hot|ร้อนมาก|very hot
เย็น|ເຢັນ|yen|cool / cold|น้ำเย็น|cold water
แพ้|ແພ້|phɛ́ɛ|allergic / lose|แพ้กุ้ง|allergic to shrimp
หายใจ|ຫາຍໃຈ|hǎai-jai|breathe|หายใจลึกๆ|breathe deeply
อ้วน|ຕຸ້ຍ|ûan|fat|ไม่อ้วน|not fat
ผอม|ຈ່ອຍ|phɔ̌ɔm|thin|ผอมลง|got thinner
สูง|ສູງ|sǔung|tall / high|สูงมาก|very tall
เตี้ย|ເຕ້ຍ|tîa|short (height)|เตี้ยกว่า|shorter
แข็งแรง|ແຂງແຮງ|khɛ̌ng-rɛɛng|strong / healthy|แข็งแรงดี|in good health
ช่วย|ຊ່ວຍ|chûay|help|ช่วยด้วย|help!
ระวัง|ລະວັງ|rá-wang|be careful|ระวังนะ|be careful!
ตัว|ໂຕ|tua|body|ตัวร้อน|feverish
หน้า|ໜ້າ|nâa|face / front|ล้างหน้า|wash your face
คอ|ຄໍ|khɔɔ|neck / throat|เจ็บคอ|sore throat
ผิว|ຜິວ|phǐw|skin|ผิวขาว|fair skin
ฝัน|ຝັນ|fǎn|dream|ฝันดี|sweet dreams
#feel|Feelings and describing|ความรู้สึก|ຄວາມຮູ້ສຶກ|#A78BFA
ใหญ่|ໃຫຍ່|yài|big|บ้านใหญ่|a big house
เล็ก|ນ້ອຍ|lék|small|ห้องเล็ก|a small room
ใหม่|ໃໝ່|mài|new|รถใหม่|a new car
เก่า|ເກົ່າ|kào|old (things)|บ้านเก่า|an old house
แก่|ເຖົ້າ|kɛ̀ɛ|old (people)|แก่แล้ว|getting old
สนุก|ມ່ວນ|sà-nùk|fun|สนุกมาก|lots of fun
เบื่อ|ເບື່ອ|bʉ̀a|bored|เบื่อแล้ว|I'm bored
กลัว|ຢ້ານ|klua|afraid|กลัวหมา|afraid of dogs
โกรธ|ໃຈຮ້າຍ|kròot|angry|อย่าโกรธ|don't be angry
เศร้า|ເສົ້າ|sâo|sad|เศร้ามาก|very sad
มีความสุข|ມີຄວາມສຸກ|mii-khwaam-sùk|happy|มีความสุขมาก|very happy
ยาก|ຍາກ|yâak|difficult|ภาษาไทยยาก|Thai is hard
ง่าย|ງ່າຍ|ngâai|easy|ง่ายมาก|very easy
ถูก|ຖືກ|thùuk|cheap / correct|ถูกมาก|very cheap
แพง|ແພງ|phɛɛng|expensive|แพงไป|too expensive
สะอาด|ສະອາດ|sà-àat|clean|ห้องสะอาด|a clean room
น่ารัก|ໜ້າຮັກ|nâa-rák|cute|น่ารักมาก|so cute
เงียบ|ງຽບ|ngîap|quiet|เงียบๆ|quietly
ดัง|ດັງ|dang|loud|เสียงดัง|loud voice
มาก|ຫຼາຍ|mâak|very / a lot|ขอบคุณมาก|thank you very much
น้อย|ໜ້ອຍ|nɔ́ɔi|little / few|น้อยมาก|very little
ทั้งหมด|ທັງໝົດ|tháng-mòt|all|ทั้งหมดเท่าไร|how much altogether?
เหมือน|ຄືກັນ|mʉ̌an|same as / like|เหมือนกัน|the same
ต่าง|ຕ່າງ|tàang|different|ต่างกัน|different from each other
สำคัญ|ສຳຄັນ|sǎm-khan|important|สำคัญมาก|very important
พร้อม|ພ້ອມ|phrɔ́ɔm|ready|พร้อมแล้ว|I'm ready
ว่าง|ຫວ່າງ|wâang|free / available|ว่างไหม|are you free?
ยุ่ง|ຫຍຸ້ງ|yûng|busy|ยุ่งมาก|very busy
ต้องการ|ຕ້ອງການ|tɔ̂ng-kaan|need / want|ต้องการอะไร|what do you need?
เกลียด|ຊັງ|klìat|hate|เกลียดฝน|I hate rain
เข้าใจ|ເຂົ້າໃຈ|khâo-jai|understand|ไม่เข้าใจ|I don't understand
รู้|ຮູ້|rúu|know|ไม่รู้|I don't know
คิด|ຄິດ|khít|think|คิดว่า|I think that
หวัง|ຫວັງ|wǎng|hope|หวังว่า|I hope that
เชื่อ|ເຊື່ອ|chʉ̂a|believe|ไม่เชื่อ|I don't believe it
สงสัย|ສົງໄສ|sǒng-sǎi|wonder / doubt|สงสัยจัง|I really wonder
ตกใจ|ຕົກໃຈ|tòk-jai|startled|ตกใจหมด|really startled
เหงา|ເຫງົາ|ngǎo|lonely|เหงาจัง|so lonely
ภูมิใจ|ພູມໃຈ|phuum-jai|proud|ภูมิใจมาก|very proud
#verbs|Everyday verbs|คำกริยา|ຄຳກິລິຍາ|#FB923C
ทำ|ເຮັດ|tham|do / make|ทำอะไร|what are you doing?
ให้|ໃຫ້|hâi|give / let|ให้คุณ|for you
เอา|ເອົາ|ao|take / want|เอาอันนี้|I'll take this one
ซื้อ|ຊື້|sʉ́ʉ|buy|ซื้อของ|go shopping
ขาย|ຂາຍ|khǎai|sell|ขายอะไร|what do you sell?
จ่าย|ຈ່າຍ|jàai|pay|จ่ายเงิน|pay money
ดู|ເບິ່ງ|duu|look / watch|ดูหนัง|watch a film
เห็น|ເຫັນ|hěn|see|เห็นไหม|do you see?
ฟัง|ຟັງ|fang|listen|ฟังเพลง|listen to music
พูด|ເວົ້າ|phûut|speak|พูดไทย|speak Thai
บอก|ບອກ|bɔ̀ɔk|tell|บอกฉัน|tell me
ถาม|ຖາມ|thǎam|ask|ถามหน่อย|may I ask
ตอบ|ຕອບ|tɔ̀ɔp|answer|ตอบคำถาม|answer the question
อ่าน|ອ່ານ|àan|read|อ่านหนังสือ|read a book
เขียน|ຂຽນ|khǐan|write|เขียนชื่อ|write your name
สอน|ສອນ|sɔ̌ɔn|teach|สอนภาษา|teach languages
นั่ง|ນັ່ງ|nâng|sit|นั่งก่อน|have a seat
ยืน|ຢືນ|yʉʉn|stand|ยืนตรงนี้|stand here
รอ|ຖ້າ|rɔɔ|wait|รอสักครู่|wait a moment
หา|ຊອກຫາ|hǎa|look for|หาห้องน้ำ|look for the toilet
เจอ|ພົບ|jəə|meet / find|เจอกัน|see you
ใช้|ໃຊ້|chái|use|ใช้ได้|it works
เล่น|ຫຼິ້ນ|lên|play|เล่นเกม|play a game
ซัก|ຊັກ|sák|wash (clothes)|ซักผ้า|do the laundry
ทำอาหาร|ແຕ່ງກິນ|tham-aa-hǎan|cook|ทำอาหารไทย|cook Thai food
โทร|ໂທ|thoo|phone / call|โทรหาฉัน|call me
ส่ง|ສົ່ງ|sòng|send|ส่งของ|send a parcel
มี|ມີ|mii|have / there is|มีไหม|do you have it?
เป็น|ເປັນ|pen|be|เป็นอะไร|what's wrong?
คือ|ຄື|khʉʉ|is / namely|นี่คือ|this is
เริ่ม|ເລີ່ມ|rə̂əm|start|เริ่มเลย|let's start
จบ|ຈົບ|jòp|finish|จบแล้ว|it's over
พัก|ພັກ|phák|rest / stay|พักที่ไหน|where are you staying?
ลอง|ລອງ|lɔɔng|try|ลองดู|give it a try
เปลี่ยน|ປ່ຽນ|plìan|change|เปลี่ยนใจ|change your mind
เลือก|ເລືອກ|lʉ̂ak|choose|เลือกเอง|choose yourself
ถือ|ຖື|thʉ̌ʉ|hold / carry|ถือของ|carry things
วาง|ວາງ|waang|put down|วางไว้|leave it there
ร้องเพลง|ຮ້ອງເພງ|rɔ́ɔng-phleeng|sing|ร้องเพลงเก่ง|a good singer
เต้น|ເຕັ້ນ|tên|dance|เต้นรำ|dance
ขับ|ຂັບ|khàp|drive|ขับรถ|drive a car
จอด|ຈອດ|jɔ̀ɔt|park / stop|จอดตรงนี้|park here`;

/** Lao spelling written with Thai letters, for the Thai voice and the Thai reading engine. */
const LAO_TO_THAI = { ກ: "ก", ຂ: "ข", ຄ: "ค", ງ: "ง", ຈ: "จ", ສ: "ส", ຊ: "ซ", ຍ: "ย", ດ: "ด", ຕ: "ต", ຖ: "ถ", ທ: "ท", ນ: "น", ບ: "บ", ປ: "ป", ຜ: "ผ", ຝ: "ฝ", ພ: "พ", ຟ: "ฟ", ມ: "ม", ຢ: "อย", ຣ: "ร", ລ: "ล", ວ: "ว", ຫ: "ห", ອ: "อ", ຮ: "ฮ", ໜ: "หน", ໝ: "หม",
  "ະ": "ะ", "ັ": "ั", "າ": "า", "ຳ": "ำ", "ິ": "ิ", "ີ": "ี", "ຶ": "ึ", "ື": "ื", "ຸ": "ุ", "ູ": "ู", ເ: "เ", ແ: "แ", ໂ: "โ", ໄ: "ไ", ໃ: "ใ", "່": "่", "້": "้", "໊": "๊", "໋": "๋", ໆ: "ๆ", "໌": "์",
  "໐": "๐", "໑": "๑", "໒": "๒", "໓": "๓", "໔": "๔", "໕": "๕", "໖": "๖", "໗": "๗", "໘": "๘", "໙": "๙" };
const LAO_CONS = "ກຂຄງຈສຊຍດຕຖທນບປຜຝພຟມຢຣລວຫອຮໜໝ";
function laoToThai(lo) {
  const C = `(?:ຫຼ|[${LAO_CONS}])(?:ຼ|ວ(?=[ົັ]))?`;
  let s = (lo || "").normalize("NFC");
  s = s.replace(new RegExp(`ເ(${C})ີ([່້໊໋]?)(?=[${LAO_CONS}])`, "g"), "ເ$1ິ$2"); // ເ◌ີ + final = เ◌ิ
  s = s.replace(new RegExp(`(${C})([່້໊໋]?)ຽ`, "g"), "ເ$1ີ$2ຍ"); // ◌ຽ + final = เ◌ีย
  s = s.replace(/ົ([່້໊໋]?)ວ/g, "ັ$1ວ").replace(/ົ(?!າ)/g, "").replace(/ົາ/g, "າ"); // ◌ົວ = ◌ัว; ◌ົ alone is a hidden o; ເ◌ົາ = เ◌า
  s = s.replace(new RegExp(`([ເແ])(${C})ັ([່້໊໋])`, "g"), "$1$2$3").replace(new RegExp(`([ເແ])(${C})ັ`, "g"), "$1$2\u0E47"); // ເ◌ັ = เ◌็
  s = s.replace(new RegExp(`ເ(${C})ີ([່້໊໋]?)(?![່້໊໋${LAO_CONS}])`, "g"), "ເ$1$2ອ"); // open ເ◌ີ = เ◌อ
  s = s.replace(new RegExp(`ເ(${C})([່້໊໋]?)ຍ(?![່້໊໋ະາິີຶືຸູັົ])`, "g"), "ເ$1ີ$2ຍ"); // open ເ◌ຍ = เ◌ีย
  s = s.replace(new RegExp(`ື([່້໊໋]?)(?![່້໊໋])(?=$|[^${LAO_CONS}]|[${LAO_CONS}][ະາິີຶືຸູັົໍ່້])`, "g"), "ື$1ອ"); // open ◌ື = ◌ือ
  s = s.replace(/([ເແໂໄໃ])ຢ/g, "$1ຍ");
  s = s.replace(/ໍ([່້໊໋]?)/g, "$1ອ").replace(/([່້໊໋])ໍ/g, "$1ອ");
  s = s.replace(/ຫຼ/g, "ຫລ").replace(/ຼ/g, "ລ");
  return [...s].map((c) => LAO_TO_THAI[c] ?? c).join("");
}
/** A plain reading of Lao spelling (no tone marks), as the course writes Lao readings. */
function laoReading(lo) {
  return lo.split(/\s+/).map((w) => readThai(laoToThai(w)).filter((x) => !x.raw).map((x) => x.roman.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ɛ+/g, "ae").replace(/ɔ+/g, "o").replace(/ʉ+/g, "eu").replace(/ə+/g, "oe").replace(/ee/g, "e").replace(/oo/g, "o").replace(/^j/, "ch").replace(/^g/, "k")).join("")).join(" ");
}

const GARDEN_LEVEL0 = 10;
const { GARDEN_BEDS, GARDEN_ITEMS } = (() => {
  const beds = [];
  const items = [];
  const known = new Set(CURRICULUM.filter((i) => i.tier !== "glyph").map((i) => i.th));
  GARDEN_SRC.split("\n").forEach((line) => {
    const f = line.trim().split("|");
    if (line.startsWith("#")) {
      beds.push({ id: f[0].slice(1), title: f[1], th: f[2], lo: f[3], color: f[4], level: GARDEN_LEVEL0 + beds.length, n: 0 });
      return;
    }
    if (f.length < 6) return;
    const bed = beds[beds.length - 1];
    const [th, lo, roman, meaning, exTh, exEn] = f;
    bed.n += 1;
    if (known.has(th)) return;
    known.add(th);
    const plain = roman.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zɛɔʉə]/g, "");
    items.push({
      id: `w-${bed.id}-${bed.n}`, level: bed.level, tier: "vocab", garden: bed.id, th, lo, thRoman: roman, loRoman: laoReading(lo), meaning,
      accept: [plain, romanize(roman, "rtgs").replace(/-/g, "")], ttsTh: th, ttsLo: laoToThai(lo), tone: roman.split("-").map(toneOfRoman),
      example: { th: exTh, en: exEn }, mnemonic: `In a phrase: ${exTh}, "${exEn}".`,
    });
  });
  return { GARDEN_BEDS: beds, GARDEN_ITEMS: items };
})();
GARDEN_BEDS.forEach((b) => LEVELS.push({ n: b.level, title: b.title, sub: `Word Garden · ${b.th}`, accent: b.color, bg: `linear-gradient(160deg, ${b.color}22, transparent 70%)`, garden: b.id }));
const COURSE_LEVELS = LEVELS.filter((l) => !l.garden);

/* ---------------------------------------------------------------------------
 * SRS
 * ------------------------------------------------------------------------- */
/* Stage colours are a gold ramp from bronze seed to bright Nirvana (V8), so stage
 * never competes with tone colour. Each stage has its own small icon. */
const SRS_STAGES = [
  { name: "Locked", alias: "Queue", color: "#64748B", icon: "lock" },
  { name: "Lotus Seed", alias: "Apprentice", color: "#9A6432", icon: "seed" },
  { name: "Novice Monk", alias: "Guru", color: "#BD7A2A", icon: "monk" },
  { name: "Naga Adept", alias: "Master", color: "#D99424", icon: "naga" },
  { name: "Temple Guardian", alias: "Enlightened", color: "#EDB43A", icon: "guardian" },
  { name: "Golden Nirvana", alias: "Burned", color: "#FFD54F", icon: "stupa" },
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

/* ============================================================================
 * Lao course: Vientiane tones from Lao spelling, and the Lao item list.
 * ========================================================================== */
const LAO_HIGH = "ຂສຖຜຝຫໜໝ";
const LAO_MID = "ກຈດຕບປຢອ";
const LAO_LOW = "ຄງຊຍທນພຟມຣລວຮ";
const SONORANT_LEAD = "ງຍນມລວຣ";
const PRE = "ເແໂໄໃ";
const EK = "່";
const THO = "້";
const LO_SUB = "ຼ"; // ◌ຼ
const SHORT_MARKS = "ະັິຶຸົ"; // ະ ັ ິ ຶ ຸ ົ
const LONG_MARKS = "າີືູໍ"; // າ ີ ື ູ ໍ
const STOP_FINAL = "ກດບ";
const SON_FINAL = "ງນມຍວ";
const isCons = (c) => (LAO_HIGH + LAO_MID + LAO_LOW).includes(c);

function laoClassOf(ch) {
  if (LAO_HIGH.includes(ch)) return "high";
  if (LAO_MID.includes(ch)) return "mid";
  if (LAO_LOW.includes(ch)) return "low";
  return null;
}

/** Returns { cls, live, long, mark, tone } for a single Lao syllable, or null if it can't be parsed. */
function laoSyllable(syl) {
  const s = [...syl.normalize("NFC")].filter((c) => c !== "​");
  if (!s.length) return null;
  let i = 0;
  const pre = PRE.includes(s[0]) ? s[i++] : null;
  let init = s[i++];
  if (!isCons(init)) return null;
  let cls = laoClassOf(init);
  // ຫ leading a sonorant (ຫຍ, ຫລ, ຫຼ) makes it high class.
  if (init === "ຫ" && s[i] === LO_SUB) { i += 1; }
  else if (init === "ຫ" && SONORANT_LEAD.includes(s[i] || "") ) { i += 1; }
  else if (s[i] === LO_SUB) { i += 1; }
  const rest = s.slice(i);
  let mark = "none";
  if (rest.includes(EK)) mark = "ek";
  if (rest.includes(THO)) mark = "tho";
  if (rest.includes("໊") || rest.includes("໋")) return null;
  const body = rest.filter((c) => c !== EK && c !== THO);
  const last = body[body.length - 1];
  // Live endings that are vowels themselves: ໄ◌ ໃ◌ ◌ຳ ເ◌ົາ
  const am = body.includes("ຳ");
  const ao = pre === "ເ" && body.includes("ົ") && last === "າ";
  let finalC = null;
  if (last && isCons(last) && body.length >= 1) {
    // ອ / ວ / ຍ as the only following letter can be a vowel (◌ອ = ɔɔ, ◌ົວ, ເ◌ຍ); treat ວ ຍ as sonorant finals (live) anyway.
    if (!(last === "ອ" && body.length === 1)) finalC = last;
  }
  let live; let long;
  const hasShort = body.some((c) => SHORT_MARKS.includes(c));
  const hasLong = body.some((c) => LONG_MARKS.includes(c)) || body.includes("ອ") || body.includes("ຽ") || (pre && pre !== "ໄ" && pre !== "ໃ" && !hasShort);
  if (pre === "ໄ" || pre === "ໃ" || am || ao) { live = true; long = false; }
  else if (finalC && STOP_FINAL.includes(finalC)) { live = false; long = !hasShort || body.includes("ົ") && body.includes("ວ"); }
  else if (finalC && SON_FINAL.includes(finalC)) { live = true; long = !hasShort; }
  else if (!finalC) {
    if (body.includes("ະ") || (hasShort && !hasLong)) { live = false; long = false; }
    else if (hasLong || body.length === 0 && pre) { live = true; long = true; }
    else if (body.length === 0) { live = true; long = true; } // bare consonant = ◌ໍ / ◌ົ inherent; treat as letter name
    else return null;
  } else return null;
  const tone = laoTone({ cls, live, long, mark });
  return { cls, live, long, mark, tone };
}

function laoTone({ cls, live, long, mark }) {
  if (mark === "ek") return "lo_mid";
  if (mark === "tho") return cls === "high" ? "lo_lowfall" : "lo_highfall";
  if (live) return cls === "low" ? "lo_high" : "lo_rising";
  if (!long) return cls === "low" ? "lo_mid" : "lo_high";
  return cls === "low" ? "lo_highfall" : "lo_lowfall";
}

const DEP = "ັິີຶືຸູົຼ່້໊໋໌ໍາຳະຽ";
/** Split unspaced Lao into written syllables (good enough for the curriculum's words). */
function laoSyllables(word) {
  const out = [];
  word.split(/\s+/).filter(Boolean).forEach((w) => {
    const s = [...w.normalize("NFC")];
    let cur = "";
    let hasNucleus = false;
    for (let k = 0; k < s.length; k += 1) {
      const c = s[k];
      const next = s[k + 1];
      if (PRE.includes(c)) {
        if (cur) out.push(cur);
        cur = c; hasNucleus = false; continue;
      }
      if (isCons(c)) {
        const startsNew = cur && (hasNucleus || (cur && !PRE.includes(cur) && [...cur].some(isCons) && !(cur === "ຫ" && SONORANT_LEAD.includes(c))));
        if (!cur) { cur += c; continue; }
        // A front vowel (ເ ແ ໂ ໄ ໃ) plus its consonant already has its nucleus.
        if (PRE.includes(cur) && cur.length === 1) { cur += c; hasNucleus = true; continue; }
        // ◌ວ / ◌ລ clusters (ຂວາ, ຄວາມ): a bare consonant then ວ with a vowel sign after it.
        if (!hasNucleus && [...cur].length === 1 && (c === "ວ") && next && DEP.includes(next)) { cur += c; continue; }
        // ເ◌ືອ / ເ◌ຍ keep their ອ / ຍ inside the vowel.
        if (c === "ອ" && /[\u0EB7\u0EB5]$/.test(cur)) { cur += c; continue; }
        if (cur === "ຫ" && SONORANT_LEAD.includes(c)) { cur += c; continue; }
        // a consonant directly after a vowel is a final unless a dependent sign follows it
        if (hasNucleus && (SON_FINAL + STOP_FINAL).includes(c) && !(next && DEP.includes(next)) && !cur.endsWith("ະ")) {
          // ◌ອ / ◌ວ as vowel carriers stay in the syllable
          cur += c; out.push(cur); cur = ""; hasNucleus = false; continue;
        }
        if (c === "ອ" && !hasNucleus) { cur += c; hasNucleus = true; continue; }
        if (c === "ວ" && cur.endsWith("ົ")) { cur += c; hasNucleus = true; continue; }
        if (startsNew || hasNucleus) { out.push(cur); cur = c; hasNucleus = false; continue; }
        // bare consonant followed by consonant: inherent vowel syllable
        out.push(cur); cur = c; hasNucleus = false; continue;
      }
      cur += c;
      if (!"່້໊໋ຼ".includes(c)) hasNucleus = true;
      if (c === "ະ") { out.push(cur); cur = ""; hasNucleus = false; }
    }
    if (cur) out.push(cur);
  });
  return out;
}

const LAO_CLASS_RULE = {
  high: "High class (ຂ ສ ຖ ຜ ຝ ຫ, and ໜ ໝ ຫຼ).",
  mid: "Middle class (ກ ຈ ດ ຕ ບ ປ ຢ ອ).",
  low: "Low class (ຄ ງ ຊ ຍ ທ ນ ພ ຟ ມ ລ ວ ຮ).",
};

/** One line on why a Lao syllable has its tone, in the same order as the Thai rule. */
function explainLaoTone(p) {
  const kind = p.live ? "live" : `dead ${p.long ? "long" : "short"}`;
  const mark = p.mark === "ek" ? "ໄມ້ເອກ (◌່)" : p.mark === "tho" ? "ໄມ້ໂທ (◌້)" : "no mark";
  return `${CLASSES[p.cls].name} class + ${kind} + ${mark} = ${TONES[p.tone].name} (${TONES[p.tone].chao}, Vientiane).`;
}

// Letters and vowels Lao has and Thai doesn't. They appear only in the Lao course.
const LAO_ONLY_ITEMS = [
  { id: "lo-yo", level: 1, tier: "glyph", th: "", lo: "ຢ", thRoman: "", loRoman: "y · yo yaa", meaning: "y sound, Middle class · medicine (ຢາ)", accept: ["y", "yo", "ya", "yaa", "medicine"], ttsTh: "ยา", ttsLo: "ยา", cls: "mid", tone: [],
    mnemonic: "ຢ is the Middle-class y. Thai needs a silent อ in front of ย for the same job (อยู่); Lao just writes ຢູ່.", bridge: "Thai อย ↔ Lao ຢ: อยู่ ↔ ຢູ່, อยาก ↔ ຢາກ." },
  { id: "lo-no-h", level: 3, tier: "glyph", th: "", lo: "ໜ", thRoman: "", loRoman: "n (high) · no nuu", meaning: "n with High-class tones (ຫ + ນ in one letter) · mouse (ໜູ)", accept: ["n", "no", "nuu", "nu", "mouse", "hno", "honam"], ttsTh: "หนู", ttsLo: "หนู", cls: "high", tone: [],
    mnemonic: "ຫ climbed inside ນ: one letter, High class.", bridge: "Thai หน ↔ Lao ໜ: หนาว ↔ ໜາວ." },
  { id: "lo-mo-h", level: 3, tier: "glyph", th: "", lo: "ໝ", thRoman: "", loRoman: "m (high) · mo maa", meaning: "m with High-class tones (ຫ + ມ in one letter) · dog (ໝາ)", accept: ["m", "mo", "maa", "ma", "dog", "hmo", "homam"], ttsTh: "หมา", ttsLo: "หมา", cls: "high", tone: [],
    mnemonic: "The dog's ຫ is tucked into ມ: ໝາ rises like a howl.", bridge: "Thai หม ↔ Lao ໝ: หมา ↔ ໝາ." },
  { id: "lo-lo-h", level: 3, tier: "glyph", th: "", lo: "ຫຼ", thRoman: "", loRoman: "l (high) · lo", meaning: "l with High-class tones (ຫ + ◌ຼ)", accept: ["l", "lo", "hlo", "highl"], ttsTh: "หลอ", ttsLo: "หลอ", cls: "high", tone: [],
    mnemonic: "The little ◌ຼ hanging under ຫ is a folded ລ: together they make a High-class l.", bridge: "Thai หล ↔ Lao ຫຼ: ตลาด ↔ ຕະຫຼາດ." },
  { id: "lo-v-o", level: 5, tier: "glyph", th: "", lo: "◌ົ", thRoman: "", loRoman: "o (short) · mai kong", meaning: "short o before a final (ໄມ້ກົງ)", accept: ["o", "shorto", "maikong", "kong"], ttsTh: "โอะ", ttsLo: "โอะ", tone: [],
    mnemonic: "Thai hides the short o (นก); Lao writes it on top: ນົກ.", bridge: "นก ↔ ນົກ, รถ ↔ ລົດ: the hidden o law." },
  { id: "lo-v-ia", level: 5, tier: "glyph", th: "", lo: "◌ຽ", thRoman: "", loRoman: "ia · before a final", meaning: "ia vowel when a final follows (Thai เ◌ีย)", accept: ["ia", "ie", "iya", "iia"], ttsTh: "เอีย", ttsLo: "เอีย", tone: [],
    mnemonic: "ເ◌ຍ folds into ◌ຽ once a final consonant joins: ຮຽນ (study).", bridge: "เรียน ↔ ຮຽນ, เปลี่ยน ↔ ປ່ຽນ." },
];

const courseCache = {};
/**
 * The item list for a mode. Thai and dual use the curriculum as written. The Lao course
 * drops Thai-only letters (they collapse onto Lao letters you already have), adds the
 * Lao-only ones, gives glyphs their Lao class, and gives every word Vientiane tones read
 * from its Lao spelling.
 */
function courseItems(mode) {
  const key = mode === "lo" ? "lo" : "th";
  if (courseCache[key]) return courseCache[key];
  if (key === "th") return (courseCache.th = [...CURRICULUM, ...GARDEN_ITEMS]);
  const seen = new Set();
  const out = [];
  [...CURRICULUM, ...LAO_ONLY_ITEMS, ...GARDEN_ITEMS].forEach((it) => {
    if (it.tier === "glyph") {
      if (seen.has(it.lo)) return;
      seen.add(it.lo);
      const cls = it.cls ? laoClassOf([...it.lo][0]) || it.cls : it.cls;
      out.push({ ...it, cls, tone: [], parts: undefined, toneSet: "lo" });
      return;
    }
    const syl = laoSyllables(it.lo);
    const parsed = syl.map(laoSyllable);
    const ok = parsed.length && parsed.every(Boolean);
    out.push({ ...it, tone: ok ? parsed.map((p) => p.tone) : [], parts: undefined, loParts: ok ? parsed : null, loSyl: syl, toneSet: "lo" });
  });
  out.sort((a, b) => a.level - b.level);
  courseCache.lo = out;
  return out;
}

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
  // A track added to an item you already know (e.g. tone questions on words) starts
  // from the read track's memory when answered right, instead of dragging the item back to stage 1.
  Object.entries(ratings).forEach(([track, g]) => {
    if (g >= 3 && !fsrs[track] && fsrs.read) fsrs[track] = { ...fsrs.read };
  });
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

/* Forgiving romanisation: aspiration, vowel length, g/k, j/ch and r/l are not marked down when typing a reading. */
function looseRoman(s) {
  return normalizeAnswer(s).replace(/ue/g, "u").replace(/ae/g, "e").replace(/([kpt])h/g, "$1").replace(/ch|j/g, "c").replace(/^g|(?<=[^n])g/g, "k").replace(/r/g, "l").replace(/([a-z])\1+/g, "$1").replace(/w$/, "o").replace(/y$/, "i");
}
function isCorrect(item, input) {
  const n = normalizeAnswer(input);
  if (!n) return false;
  const readings = [...item.accept, item.thRoman, item.loRoman, romanize(item.thRoman, "rtgs")].filter(Boolean).flatMap((r) => r.split(/\s*·\s*|\s*\/\s*/));
  const pool = [...readings, ...item.meaning.split(/[\/·,()]/)];
  if (pool.some((a) => normalizeAnswer(a) === n)) return true;
  const l = looseRoman(input);
  return l.length >= 2 && readings.some((a) => looseRoman(a) === l);
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
 * Backups. A backup file is the saved state wrapped with the app name and a
 * date. Seven daily snapshots also live in IndexedDB on the phone, so a bad day
 * (or a cleared review queue) can be rolled back without a file.
 * ------------------------------------------------------------------------- */
const BACKUP_APP = "suvarnakani";
const SNAPSHOT_DAYS = 7;
let restoringState = false; // set while a restore reloads the page, so nothing overwrites it

function backupSummary(state) {
  const srs = state?.srs || {};
  const started = Object.values(srs).filter((v) => (v?.stage || 0) >= 1).length;
  const burned = Object.values(srs).filter((v) => (v?.stage || 0) >= 5).length;
  return { started, burned, days: Object.keys(state?.log || {}).length };
}

function makeBackup(state) {
  return { app: BACKUP_APP, version: APP_VERSION, exportedAt: new Date().toISOString(), summary: backupSummary(state), state };
}

/** Returns the state inside a backup file, or throws with a message to show. */
function readBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error("That file isn't a SuvarṇaKani backup (it isn't JSON)."); }
  if (!obj || obj.app !== BACKUP_APP || !obj.state || typeof obj.state !== "object") throw new Error("That file isn't a SuvarṇaKani backup.");
  return obj;
}

/** Share the backup through the Android share sheet, or download it where sharing files isn't possible. */
async function deliverBackup(state) {
  const day = new Date().toISOString().slice(0, 10);
  const name = `suvarnakani-backup-${day}.json`;
  // Voice Bank recordings and your best takes travel with the backup.
  const blob = new Blob([JSON.stringify({ ...makeBackup(state), voices: await exportVoices() })], { type: "application/json" });
  try {
    const file = new File([blob], name, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "SuvarṇaKani backup" });
      return "shared";
    }
  } catch (e) {
    if (e?.name === "AbortError") return "cancelled";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}

/** Replace the saved state and reload, so every component starts from it. */
function restoreState(state) {
  restoringState = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    restoringState = false;
    throw new Error("The browser refused to save. Free some space and try again.");
  }
  window.location.reload();
}

const IDB_NAME = "suvarnakani";
const IDB_VERSION = 3;
function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("no IndexedDB")); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("snapshots")) db.createObjectStore("snapshots", { keyPath: "key" });
      if (!db.objectStoreNames.contains("reviews")) db.createObjectStore("reviews", { autoIncrement: true }).createIndex("t", "t");
      if (!db.objectStoreNames.contains("voices")) db.createObjectStore("voices", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function idbRequest(store, mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const out = fn(tx.objectStore(store));
    tx.oncomplete = () => { db.close(); resolve(out?.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}
async function listSnapshots() {
  try {
    const all = (await idbRequest("snapshots", "readonly", (s) => s.getAll())) || [];
    return all.sort((a, b) => b.key.localeCompare(a.key));
  } catch {
    return [];
  }
}
/** One snapshot per day, taken the first time the app saves that day (so it holds the end of the day before). */
async function snapshotToday(state) {
  const key = todayKey();
  try {
    const existing = await listSnapshots();
    if (existing.some((s) => s.key === key)) return;
    await idbRequest("snapshots", "readwrite", (s) => s.put({ key, at: Date.now(), summary: backupSummary(state), state: JSON.parse(JSON.stringify(state)) }));
    const old = [...existing.map((s) => s.key), key].sort().slice(0, -SNAPSHOT_DAYS);
    if (old.length) await idbRequest("snapshots", "readwrite", (s) => old.forEach((k) => s.delete(k)));
  } catch {
    /* no IndexedDB (private window): the backup file still works */
  }
}

/* ---------------------------------------------------------------------------
 * Review log (F4). Every answer is kept as { t, id, track, g } in IndexedDB for
 * a year: about 40 bytes each, so ten thousand reviews stay well under a megabyte.
 * The Ledger reads it for recall by track and tone confusions over time.
 * ------------------------------------------------------------------------- */
const REVIEW_KEEP_DAYS = 365;
const reviewBuffer = [];
let reviewFlushTimer = null;
function logReview(id, track, g, extra) {
  if (!g || !id) return;
  reviewBuffer.push({ t: Date.now(), id, track, g, ...(extra || {}) });
  clearTimeout(reviewFlushTimer);
  reviewFlushTimer = setTimeout(flushReviews, 1200);
}
async function flushReviews() {
  const batch = reviewBuffer.splice(0);
  if (!batch.length) return;
  try { await idbRequest("reviews", "readwrite", (s) => batch.forEach((r) => s.add(r))); } catch { /* no IndexedDB: the daily log still counts */ }
}
async function readReviews(sinceMs = 0) {
  await flushReviews();
  try { return (await idbRequest("reviews", "readonly", (s) => s.index("t").getAll(IDBKeyRange.lowerBound(sinceMs)))) || []; } catch { return []; }
}
async function pruneReviews() {
  try { await idbRequest("reviews", "readwrite", (s) => { const r = s.index("t").openCursor(IDBKeyRange.upperBound(Date.now() - REVIEW_KEEP_DAYS * DAY)); r.onsuccess = () => { const c = r.result; if (c) { c.delete(); c.continue(); } }; }); } catch { /* ignore */ }
}
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushReviews(); });

/* ---------------------------------------------------------------------------
 * Voice Bank (N11). Recordings of real voices, keyed "th:<text>" or "lo:<text>",
 * replace text-to-speech wherever that text is spoken. Your shadowing takes are
 * kept in the same store as "take:<line>" and are never used as a model.
 * ------------------------------------------------------------------------- */
const voiceBank = new Map(); // key -> object URL
const voiceBankListeners = new Set();
const voiceKey = (script, text) => `${script}:${(script === "lo" ? sanitizeLao(text) : sanitizeThai(text))}`;
function notifyVoiceBank() { voiceBankListeners.forEach((fn) => fn()); }
async function loadVoiceBank() {
  try {
    const all = (await idbRequest("voices", "readonly", (s) => s.getAll())) || [];
    all.forEach((r) => { if (!voiceBank.has(r.key)) voiceBank.set(r.key, URL.createObjectURL(r.blob)); });
    notifyVoiceBank();
  } catch { /* no IndexedDB */ }
}
async function saveVoice(key, blob) {
  await idbRequest("voices", "readwrite", (s) => s.put({ key, blob, at: Date.now() }));
  if (voiceBank.has(key)) URL.revokeObjectURL(voiceBank.get(key));
  voiceBank.set(key, URL.createObjectURL(blob));
  notifyVoiceBank();
}
async function deleteVoice(key) {
  try { await idbRequest("voices", "readwrite", (s) => s.delete(key)); } catch { /* ignore */ }
  if (voiceBank.has(key)) URL.revokeObjectURL(voiceBank.get(key));
  voiceBank.delete(key);
  notifyVoiceBank();
}
function useVoiceBank() {
  const [, force] = useState(0);
  useEffect(() => { const fn = () => force((n) => n + 1); voiceBankListeners.add(fn); return () => voiceBankListeners.delete(fn); }, []);
  return voiceBank;
}
const blobToB64 = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.readAsDataURL(blob); });
async function exportVoices() {
  try {
    const all = (await idbRequest("voices", "readonly", (s) => s.getAll())) || [];
    return Promise.all(all.map(async (r) => ({ key: r.key, type: r.blob.type, data: await blobToB64(r.blob) })));
  } catch { return []; }
}
async function importVoices(list = []) {
  for (const v of list) {
    const bytes = Uint8Array.from(atob(v.data), (c) => c.charCodeAt(0));
    // eslint-disable-next-line no-await-in-loop
    await idbRequest("voices", "readwrite", (s) => s.put({ key: v.key, blob: new Blob([bytes], { type: v.type }), at: Date.now() }));
  }
}
/** Record from the microphone until stop() or `ms`, resolving with the audio. */
function recordClip(ms = 2500) {
  let stopper = null;
  const done = (async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("unsupported");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    return new Promise((resolve) => {
      rec.onstop = () => { stream.getTracks().forEach((tr) => tr.stop()); resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" })); };
      rec.start();
      const timer = setTimeout(() => rec.state !== "inactive" && rec.stop(), ms);
      stopper = () => { clearTimeout(timer); if (rec.state !== "inactive") rec.stop(); };
    });
  })();
  return { done, stop: () => stopper?.() };
}
function playUrl(url, rate = 1) {
  return new Promise((resolve) => {
    const a = new Audio(url);
    playUrl.current = a;
    try { a.preservesPitch = true; a.playbackRate = Math.min(1.3, Math.max(0.7, rate)); } catch { /* old browser */ }
    a.onended = resolve;
    a.onerror = resolve;
    a.play().catch(resolve);
  });
}

/* ---------------------------------------------------------------------------
 * Android back gesture. Each open sheet (and leaving the Shrine) pushes one
 * history entry; back pops the top one and closes it instead of leaving the app.
 * ------------------------------------------------------------------------- */
const backStack = [];
let ignorePops = 0;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (ignorePops > 0) { ignorePops -= 1; return; }
    const top = backStack.pop();
    if (top) { top.popped = true; top.close.current?.(); }
  });
}
function useBackClose(open, onClose) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const entry = { close, popped: false };
    backStack.push(entry);
    try { window.history.pushState({ suvarnakani: backStack.length }, ""); } catch { /* sandboxed frame */ }
    return () => {
      const i = backStack.indexOf(entry);
      if (i >= 0) backStack.splice(i, 1);
      if (!entry.popped) {
        ignorePops += 1;
        try { window.history.back(); } catch { ignorePops -= 1; }
      }
    };
  }, [open]);
}

/** Keep the screen on while `active` (reviews, tracing, shadowing). */
/** The theme in use: "light" or "dark", following the phone unless Settings picks one (V1). */
function useResolvedTheme(pref) {
  const query = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
  const [sysLight, setSysLight] = useState(() => !!query?.matches);
  useEffect(() => {
    if (!query) return undefined;
    const on = (e) => setSysLight(e.matches);
    query.addEventListener?.("change", on);
    return () => query.removeEventListener?.("change", on);
  }, [query]);
  return pref === "light" || pref === "dark" ? pref : sysLight ? "light" : "dark";
}

function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.wakeLock) return undefined;
    let lock = null;
    let gone = false;
    const take = () => {
      if (gone || document.visibilityState !== "visible") return;
      navigator.wakeLock.request("screen").then((l) => { if (gone) l.release(); else lock = l; }).catch(() => {});
    };
    take();
    document.addEventListener("visibilitychange", take);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", take);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

/* ---------------------------------------------------------------------------
 * Preferences shared by many screens.
 * ------------------------------------------------------------------------- */
const DEFAULT_PREFS = { particle: "unset", textSize: 100, haptics: true, roman: "learner", tint: true, randomFonts: false, theme: "system", trueBlack: false };
const PrefsContext = React.createContext(DEFAULT_PREFS);
const usePrefs = () => React.useContext(PrefsContext);
const runtimePrefs = { haptics: true, roman: "learner" };
/** Thai romanisation in the system chosen in Settings. */
const R = (learner) => romanize(learner, runtimePrefs.roman);

const QUESTION_WORDS = ["ไหม", "อะไร", "เท่าไร", "เท่าไหร่", "ที่ไหน", "ไหน", "ใคร", "เมื่อไร", "เมื่อไหร่", "ยังไง", "อย่างไร", "หรือ", "กี่", "มั้ย"];
/**
 * Your own lines in dialogues use your polite particle. Written lines carry ครับ;
 * "female" turns it into ค่ะ (statements) or คะ (questions); "unset" shows both.
 */
function politeLine(line, particle) {
  if (!line || !line.th || !line.th.includes("ครับ") || particle === "male") return line;
  const chunks = line.th.split("ครับ");
  if (particle === "unset") return { ...line, th: line.th.replaceAll("ครับ", "ครับ/ค่ะ"), r: line.r?.replaceAll("khráp", "khráp/khâ") };
  const forms = chunks.slice(0, -1).map((c) => (QUESTION_WORDS.some((q) => c.trim().endsWith(q) || c.includes(q)) ? "คะ" : "ค่ะ"));
  const th = chunks.reduce((acc, c, i) => acc + c + (i < forms.length ? forms[i] : ""), "");
  let k = 0;
  const r = line.r?.replace(/khráp/g, () => (forms[k++] === "คะ" ? "khá" : "khâ"));
  let j = 0;
  const syl = line.syl?.map((s) => (s === "khráp" ? (forms[j++] === "คะ" ? "khá" : "khâ") : s));
  const tones = line.tones && line.syl ? line.tones.map((t, i) => (line.syl[i] === "khráp" && syl[i] === "khâ" ? "falling" : t)) : line.tones;
  return { ...line, th, r, syl, tones };
}

const verCmp = (a, b) => {
  const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i += 1) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
};

/* What's new, newest first. Shown once after an update. */
const WHATS_NEW = [
  { v: "0.25.0", title: "Hand and look", points: [
    "Daylight theme for reading in the sun, and true black for night on an OLED screen. Both follow your phone unless you pick one in Settings.",
    "The Shrine is now a journey down the Mekong: each level is a stop that fills with gold as its items burn, with the next gate in view.",
    "Memory Writer (Write → From memory): hear a letter's name and write it with no template. Syllables puts whole syllables on a four-line guide.",
    "Show me: a ghost pen draws each letter from its head loop before you trace it.",
    "Keyboard (Write → Keyboard): hear a word and type it on the Thai Kedmanee layout your phone uses. Clean typing counts on the spelling track.",
    "Tap a big letter in a lesson or the inspector to see its parts: the head loop, the body, and what tells it from its lookalike.",
    "New stage colours and icons, from bronze seed to golden stupa, and short moments for burns, new levels and streaks.",
  ] },
  { v: "0.24.0", title: "Real voices", points: [
    "Voice Bank (Ear → Voice Bank): hand the phone to a tutor or friend and they read each word. Their recordings replace the synthetic voice everywhere, and go into your backups.",
    "Talk Paths (Ear): five conversations where you choose your reply, then say it. A politeness meter reacts to what you pick.",
    "Sound Dojo (Ear Dojo): puffed or plain consonants, short or long vowels, hidden final stops and initial ง.",
    "Tones in phrases (Ear Dojo): name one syllable's tone inside running speech.",
    "The Ear speeds up as you improve, from 0.7× to 1.2×, and rotates the voices on your phone.",
    "Hear yourself: after shadowing, play the model then your take, A then B. Your best take for each line is kept.",
  ] },
  { v: "0.23.0", title: "Read the world", points: [
    "Lantern Library (Read → Library): twelve short stories in Thai and in Lao. Tap any word, read aloud with the sentence lit up, and time your re-reads to see your speed grow.",
    "Press and hold a story sentence to add it to the Sentence deck.",
    "Street Reader has 23 signs: road signs, a pharmacy, a hospital, a river pier, neon and worn paint, and a menu that changes every day.",
    "Ride the line (Read): signs in the order you meet them, with a few seconds less at each stop.",
    "Ledger on the Shrine: your last 26 weeks, recall by track against the 90% target, confused tones, hardest items, time studied and what's due.",
    "Every answer is now kept on the phone for a year, and the daily log keeps a year too.",
  ] },
  { v: "0.22.0", title: "Words in the wild", points: [
    "Word Garden: 280 everyday words in seven beds (food, getting around, numbers and time, people, body, feelings, verbs). It opens after Level 4; plant a bed and its words join your lessons.",
    "Lesson cards play each word inside a short phrase.",
    "Sentence deck on the Shrine: whole lines to read, hear and complete, about five new a day. Words saved in the Decoder join once you add a meaning.",
    "Market Clock (Lab): hear prices, Thai six-period times and Buddhist-era years, and type or pick them.",
    "Classifier Corral (Lab): sort things into คน, ตัว, อัน, ใบ, เล่ม, คัน, หลัง and ลูก, then count them.",
    "Typed readings are more forgiving: RTGS spellings, missing h, single vowels, g for k and l for r all count.",
  ] },
  { v: "0.21.0", title: "Take it outside", points: [
    "Decoder (Read → Decoder): paste any Thai or Lao and see every syllable's class, live or dead, length, mark and tone. Words from your course are recognised.",
    "Share text from Google Lens or any app to SuvarṇaKani and it opens in the Decoder.",
    "Long-press the app icon for Reviews, Ear Dojo and Decoder. The icon also works with Android's themed icons.",
    "Tone colours: syllables are tinted by tone in the Decoder, Street Reader and Slicer, fading as you learn each word.",
    "Font Gauntlet: read words in eight faces, from looped serif to handwriting, and drill letters in loopless type.",
    "Romanisation can be learner spelling, RTGS or IPA (Settings), and reviews can show older items in random fonts.",
    "The Slicer has 30 lines across 15 topics.",
  ] },
  { v: "0.20.0", title: "Safe ground", points: [
    "Back up your progress to a file and restore it on any phone (Settings → Backup).",
    "The phone keeps seven daily snapshots, so you can roll back to yesterday.",
    "The Android back gesture closes sheets instead of leaving the app.",
    "One Settings sheet: script, font, daily goal, audio, your polite particle, text size and haptics.",
    "The screen stays on during reviews, lessons, tracing and shadowing.",
    "A bar tells you when a new version is ready.",
  ] },
];

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
    try { playUrl.current?.pause(); } catch { /* ignore */ }
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
    if (this.muted || typeof window === "undefined") return;
    this.stopTones();
    this.cancelSpeech();
    const token = this.seqToken;
    // A Voice Bank recording of the same text wins over the synthetic voice.
    const recOf = (e) => (e.lo && voiceBank.get(voiceKey("lo", e.lo))) || (e.th && voiceBank.get(voiceKey("th", e.th)));
    if (list.some(recOf) || !("speechSynthesis" in window)) {
      const run = async () => {
        for (let i = 0; i < list.length; i += 1) {
          if (token !== this.seqToken) return;
          const url = recOf(list[i]);
          if (url) {
            // eslint-disable-next-line no-await-in-loop
            await playUrl(url, (list[i].rate || this.rate) / 0.85);
          } else if ("speechSynthesis" in window) {
            // eslint-disable-next-line no-await-in-loop
            await new Promise((res) => {
              const e = list[i];
              const lv = e.lo ? this.laoVoice() : null;
              const text = lv ? sanitizeLao(e.lo) : sanitizeThai(e.th);
              if (!text) { res(); return; }
              const u = new SpeechSynthesisUtterance(text);
              u.lang = lv ? "lo-LA" : "th-TH";
              const voice = lv || e.voice || this.thaiVoice();
              try { if (voice) u.voice = voice; } catch { /* stale voice */ }
              u.rate = e.rate || this.rate;
              u.onend = res;
              u.onerror = res;
              window.speechSynthesis.speak(u);
            });
          }
          // eslint-disable-next-line no-await-in-loop
          if (i + 1 < list.length) await new Promise((r) => setTimeout(r, gapMs));
        }
      };
      this.speechTimer = setTimeout(run, 60);
      return;
    }
    const utterances = list
      .map((e) => {
        const lv = e.lo ? this.laoVoice() : null;
        const text = lv ? sanitizeLao(e.lo) : sanitizeThai(e.th);
        if (!text) return null;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lv ? "lo-LA" : "th-TH";
        const voice = lv || e.voice || this.thaiVoice();
        try { if (voice) u.voice = voice; } catch { /* stale voice object */ }
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
  if (!runtimePrefs.haptics) return;
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

/* ---------------------------------------------------------------------------
 * Moments (V5): a short animation and haptic pattern for each milestone.
 * ------------------------------------------------------------------------- */
const momentListeners = new Set();
function celebrate(m) { momentListeners.forEach((fn) => fn(m)); }
const MOMENT_HAPTICS = { leaf: [12, 70, 12, 70, 40], gate: [35, 90, 70], lamps: [14, 45, 14, 45, 14, 45, 60] };
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function MomentLayer() {
  const [m, setM] = useState(null);
  useEffect(() => {
    const on = (next) => {
      setM({ ...next, key: Date.now() });
      if (runtimePrefs.haptics && navigator.userActivation?.hasBeenActive !== false) { try { navigator.vibrate?.(MOMENT_HAPTICS[next.kind] || 20); } catch { /* not supported */ } }
    };
    momentListeners.add(on);
    return () => { momentListeners.delete(on); };
  }, []);
  useEffect(() => {
    if (!m) return undefined;
    const id = setTimeout(() => setM(null), reducedMotion() ? 2200 : 3200);
    return () => clearTimeout(id);
  }, [m]);
  if (!m) return null;
  return (
    <div key={m.key} data-moment={m.kind} className="sk-moment pointer-events-auto fixed inset-x-0 top-[18vh] z-[60] mx-auto flex w-[min(20rem,calc(100vw-2rem))] flex-col items-center rounded-3xl border border-amber-400/30 bg-sk-panel/95 px-5 pb-5 pt-4 text-center shadow-2xl backdrop-blur" style={{ animation: "sk-rise .35s ease-out both" }} onClick={() => setM(null)} role="status">
      <div className="relative h-28 w-full overflow-hidden">
        {m.kind === "leaf" && (
          <>
            <div className="absolute inset-x-0 bottom-1 flex justify-center"><StageIcon stage={5} size={54} /></div>
            {[...Array(9)].map((_, i) => (
              <span key={i} className="absolute top-0 h-3 w-2 rounded-[60%_0] bg-gradient-to-br from-amber-200 to-amber-500" style={{ left: `${12 + i * 9}%`, "--dx": `${(i % 3 - 1) * 14}px`, "--rot": `${180 + i * 40}deg`, animation: `sk-leaf ${1.4 + (i % 4) * 0.25}s ${i * 0.09}s cubic-bezier(.3,.6,.4,1) both` }} />
            ))}
          </>
        )}
        {m.kind === "gate" && (
          <div className="absolute inset-0 flex items-end justify-center">
            <div className="relative flex h-24 w-32 items-center justify-center rounded-t-[3rem] border-2 border-amber-400/70 bg-gradient-to-b from-amber-200/40 to-transparent text-3xl font-black text-amber-300">
              {m.level}
              <div className="absolute inset-y-0 left-0 w-1/2 origin-left rounded-tl-[3rem] border-r border-amber-700/50 bg-gradient-to-br from-amber-600 to-amber-800" style={{ animation: "sk-door-l 1.1s .35s ease-in-out both" }} />
              <div className="absolute inset-y-0 right-0 w-1/2 origin-right rounded-tr-[3rem] border-l border-amber-700/50 bg-gradient-to-bl from-amber-600 to-amber-800" style={{ animation: "sk-door-r 1.1s .35s ease-in-out both" }} />
            </div>
          </div>
        )}
        {m.kind === "lamps" && (
          <div className="absolute inset-0 flex items-end justify-center gap-2 pb-2">
            {[...Array(Math.min(7, m.lamps || 5))].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="h-5 w-3 rounded-[50%_50%_45%_45%/60%_60%_40%_40%] bg-gradient-to-t from-amber-500 via-amber-300 to-yellow-100 shadow-[0_0_14px_#F59E0B]" style={{ animation: `sk-lamp .5s ${0.2 + i * 0.22}s ease-out both` }} />
                <span className="mt-0.5 h-2 w-6 rounded-b-full bg-gradient-to-b from-amber-700 to-amber-900" />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 text-xs font-bold uppercase tracking-widest text-amber-300">{m.label}</div>
      <div className="mt-1 text-lg font-bold text-white">{m.title}</div>
      {m.sub && <div className="mt-0.5 text-sm text-slate-400">{m.sub}</div>}
    </div>
  );
}

const RIVER_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='120'%3E%3Cpath d='M8 0C14 20 14 40 8 60C2 80 2 100 8 120' stroke='black' stroke-width='5' fill='none'/%3E%3C/svg%3E")`;
/** Small stage icons (V8): seed, monk, naga, guardian, stupa. */
const STAGE_PATHS = {
  seed: ["M12 21c-3.4 0-5.8-2.5-5.8-5.8 0-2.9 2.4-5.3 5.8-5.8 3.4.5 5.8 2.9 5.8 5.8 0 3.3-2.4 5.8-5.8 5.8z", "M12 9.4V5.2M12 5.2C10.6 3.5 8.8 3.2 7.2 3.6M12 5.2c1.4-1.7 3.2-2 4.8-1.6"],
  monk: ["M5 21c0-6 3-10 7-10s7 4 7 10z", "M12 9.2a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9 16.5h6"],
  naga: ["M4 19c3 0 3.5-4 6.5-4s3 3.5 6 3.5 3.5-5.5.5-7.5c-2.2-1.5-1-4.5 1.5-4.5", "M18.5 6.5l2-1.5M17.6 4.6l.4 2.2"],
  guardian: ["M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z", "M12 8v8M9 11h6"],
  stupa: ["M7 15c0-4 2.5-6 5-7 2.5 1 5 3 5 7z", "M12 2v6M10 4.5h4M5 15h14v3H5zM4 21h16"],
};
function StageIcon({ stage, size = 14, className = "" }) {
  const s = SRS_STAGES[stage] || SRS_STAGES[0];
  if (s.icon === "lock") return <Lock size={size} className={className} style={{ color: s.color }} />;
  const [fill, line] = STAGE_PATHS[s.icon];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={fill} fill={`${s.color}55`} />
      <path d={line} />
    </svg>
  );
}

const CLASS_INK_LIGHT = { mid: "#A16207", high: "#57534E", low: "#9A3412" };
function ClassBadge({ cls, small }) {
  const c = CLASSES[cls];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"}`} style={{ background: `${c.color}1f`, color: activePalette === "light" ? CLASS_INK_LIGHT[cls] : c.color, border: `1px solid ${c.color}55` }}>
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
  useBackClose(open, onClose);
  useWakeLock(open);
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
        className={`relative w-full ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"} max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:pb-0 sm:rounded-3xl border border-white/10 bg-sk-panel/95 shadow-2xl`}
        style={{ boxShadow: `0 0 60px ${accent}22` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-sk-panel/95 px-5 py-3 backdrop-blur">
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
    <div className={`sk-card rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md ${className}`} style={{ ...(glow ? { boxShadow: `0 0 40px ${glow}1f` } : {}), ...style }}>
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
  const active = (k) => !!log[k] && ((log[k].reviews || 0) + (log[k].ear || 0) + (log[k].lessons || 0) + (log[k].shadow || 0) + (log[k].traces || 0) + (log[k].bridge || 0) + (log[k].signs || 0) + (log[k].drills || 0) + (log[k].reads || 0) > 0);
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


const PRACTICE_GOALS = { trace: 3, mekong: 4, sign: 1, shadow: 5 };
/**
 * The fourth Today Path step rotates by day so writing, the Mekong laws, street signs and
 * speaking each come round. What is due wins the day: write reviews first, then Mekong laws.
 * Once picked, today's activity stays put even after its due list empties.
 */
function todayPractice({ srs, mode, bridgeSched, log, now = Date.now() }) {
  const today = log[todayKey(now)] || {};
  const writes = writeDue(srs, mode, now);
  const laws = lawsDue(bridgeSched, now);
  const startedGlyphs = traceTargets(mode).some((t) => srs[t.id]);
  const dayNo = Math.floor(new Date(todayKey(now)).getTime() / DAY);
  const rotation = ["trace", "mekong", "sign", "shadow"].filter((k) => k !== "trace" || startedGlyphs);
  let kind = rotation[dayNo % rotation.length];
  // Keep whatever was already started today.
  const begun = ["trace", "mekong", "sign", "shadow"].find((k) => (today[{ trace: "traces", mekong: "bridge", sign: "signs", shadow: "shadow" }[k]] || 0) > 0);
  if (begun) kind = begun;
  else if (writes.length >= 3) kind = "trace";
  else if (laws.length) kind = "mekong";
  const count = today[{ trace: "traces", mekong: "bridge", sign: "signs", shadow: "shadow" }[kind]] || 0;
  const goal = PRACTICE_GOALS[kind];
  const done = count >= goal;
  if (kind === "trace") {
    const show = writes.slice(0, 3).map((t) => t.g).join(" ");
    return { kind, label: show ? `Trace 3 letters: ${show}` : "Trace 3 letters", thai: !!show, done, note: `${Math.min(count, goal)} / ${goal} traced${writes.length ? ` · ${writes.length} due` : ""}` };
  }
  if (kind === "mekong") {
    const law = laws[0] || nextNewLaw(bridgeSched);
    return { kind, label: `Mekong law: ${law ? law.name : "review"}`, done, note: `${Math.min(count, goal)} / ${goal} words${laws.length ? ` · ${laws.length} law${laws.length > 1 ? "s" : ""} due` : law ? " · new law" : ""}` };
  }
  if (kind === "sign") return { kind, label: "Read a street sign against the clock", done, note: done ? "Read today" : "Street Reader" };
  return { kind, label: "Shadow 5 syllables", done, note: `${Math.min(count, goal)} / ${goal} attempts` };
}

function TodayPath({ srs, now, reviewCount, lessonQueue, leeches, log, dailyMinutes, onReviews, onLessons, onEar, onLeech, practice, onPractice }) {
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
  if (practice) steps.push({ id: `practice-${practice.kind}`, label: practice.label, thai: practice.thai, min: 3, done: practice.done, note: practice.note, onClick: () => onPractice?.(practice.kind) });
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

/**
 * Three items most easily confused with `item` in the given script: a lookalike set first,
 * then same tier, shared letters, similar length, same first tone and nearby level.
 */
function confusables(item, mode = "th") {
  const text = (c) => (mode === "lo" ? c.lo : c.th);
  const mine = text(item);
  const group = TRAPS.find((g) => g.items.some((x) => x.th === item.th));
  const seen = new Set([mine]);
  const scored = courseItems(mode).filter((c) => c.id !== item.id).map((c) => {
    const t = text(c);
    let score = Math.random();
    if (group && group.items.some((x) => x.th === c.th)) score += 6;
    if (c.tier === item.tier) score += 3;
    score += [...new Set(t)].filter((ch) => mine.includes(ch)).length * 1.5;
    if (Math.abs(t.length - mine.length) <= 1) score += 1;
    if (c.tone[0] && c.tone[0] === item.tone[0]) score += 0.5;
    if (Math.abs(c.level - item.level) <= 1) score += 1;
    return { c, t, score };
  }).sort((a, b) => b.score - a.score);
  const out = [];
  for (const { c, t } of scored) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(c);
    if (out.length === 3) break;
  }
  return out;
}

/** Contrast drill for leeches: pick the item among its lookalikes. */
function leechOptions(item) {
  return shuffle([item, ...confusables(item)]);
}

/** Which direction to review: "spell" (sound → Thai) once an item is known, alternating by due date. */
function reviewDirection(st) {
  if (!st || st.stage < 2 || !st.fsrs?.read) return "read";
  const due = (t) => t.last + fsrsInterval(t.S) * DAY;
  if (!st.fsrs.spell) return "spell";
  return due(st.fsrs.spell) <= due(st.fsrs.read) ? "spell" : "read";
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
          <p className="text-center text-xl font-bold text-white">{mode === "lo" ? round.item.loRoman : R(round.item.thRoman)}</p>
          <p className="text-center text-sm text-slate-400">{round.item.meaning}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {round.options.map((o) => {
              const state = !pick ? "" : o.id === round.item.id ? "border-emerald-400 bg-emerald-500/15" : o.id === pick ? "border-rose-400 bg-rose-500/15" : "opacity-50";
              return (
                <button key={o.id} onClick={() => choose(o)} className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center transition active:scale-95 ${state}`}>
                  <Glyph text={scriptText(o)} script={mode === "lo" ? "lo" : "th"} font={font} className="text-5xl leading-[1.4] text-white" />
                  {pick && <div className="text-xs text-slate-300">{mode === "lo" ? o.loRoman.split(" ·")[0] : R(o.thRoman.split(" ·")[0])} · {o.meaning.split(" ·")[0]}</div>}
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
      <div className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-sk-panel p-6 sm:rounded-3xl">
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
function Shrine({ srs, setSrs, sandbox, mode, font, onInspect, ear, onOpenEar, log, logActivity, dailyMinutes, bridgeSched = {}, onPractice, autoReview, onAutoReviewDone, garden = [], setGarden, sentSrs = {}, setSentSrs, decoderSaved = [], mined = [] }) {
  const prefs = usePrefs();
  const course = useMemo(() => courseItems(mode), [mode]);
  const [now, setNow] = useState(Date.now());
  const [lessonOpen, setLessonOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [leechOpen, setLeechOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const stageOf = (id) => srs[id]?.stage || 0;
  const gardenOpen = sandbox || course.filter((i) => i.level === 4).every((i) => stageOf(i.id) >= 2);

  const unlockedLevels = useMemo(() => {
    const set = new Set([1]);
    for (let n = 2; n <= COURSE_LEVELS.length; n += 1) {
      const prev = course.filter((i) => i.level === n - 1);
      // A level you have already started stays open when new items join the level before it.
      const started = course.some((i) => i.level === n && stageOf(i.id) > 0);
      if (sandbox || started || prev.every((i) => stageOf(i.id) >= 2)) set.add(n);
      else break;
    }
    if (sandbox) COURSE_LEVELS.forEach((l) => set.add(l.n));
    // Word Garden beds open once Level 4 is at Novice Monk, and feed lessons once planted.
    GARDEN_BEDS.forEach((b) => { if (gardenOpen && (garden.includes(b.id) || course.some((i) => i.garden === b.id && stageOf(i.id) > 0))) set.add(b.level); });
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srs, sandbox, garden, course]);

  // Moments: a burn or a newly opened level since this screen opened (V5).
  const seenRef = useRef(null);
  useEffect(() => {
    const burnedIds = course.filter((i) => stageOf(i.id) >= 5).map((i) => i.id);
    const levels = COURSE_LEVELS.filter((l) => unlockedLevels.has(l.n)).map((l) => l.n);
    const prev = seenRef.current;
    seenRef.current = { burned: new Set(burnedIds), levels: new Set(levels), sandbox };
    if (!prev || prev.sandbox !== sandbox) return;
    const opened = levels.filter((n) => !prev.levels.has(n));
    const fresh = burnedIds.filter((id) => !prev.burned.has(id));
    if (opened.length) {
      const lvl = COURSE_LEVELS.find((l) => l.n === opened[0]);
      celebrate({ kind: "gate", label: `Level ${lvl.n} is open`, title: lvl.title, sub: lvl.sub, level: lvl.n });
    } else if (fresh.length) {
      const it = course.find((i) => i.id === fresh[0]);
      celebrate({ kind: "leaf", label: "Golden Nirvana", title: `${mode === "lo" ? it.lo : it.th} · ${it.meaning}`, sub: fresh.length > 1 ? `and ${fresh.length - 1} more burned` : "Burned. It won't come back for review." });
    }
  }, [srs, unlockedLevels]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentLevel = Math.max(...COURSE_LEVELS.filter((l) => unlockedLevels.has(l.n)).map((l) => l.n));
  const lessonQueue = useMemo(() => {
    const fresh = course.filter((i) => unlockedLevels.has(i.level) && stageOf(i.id) === 0);
    const core = fresh.filter((i) => !i.garden).sort((a, b) => a.level - b.level);
    const order = (i) => { const k = garden.indexOf(i.garden); return k < 0 ? 99 : k; };
    const words = fresh.filter((i) => i.garden).sort((a, b) => order(a) - order(b));
    return interleave(core, words, 3, 2);
  }, [srs, unlockedLevels, course, garden]); // eslint-disable-line react-hooks/exhaustive-deps
  const reviewQueue = useMemo(
    () => course.filter((i) => { const s = srs[i.id]; return s && s.stage >= 1 && s.stage < 5 && (sandbox || s.next <= now); }),
    [srs, now, sandbox, course]
  );
  const reviewDirections = useMemo(() => Object.fromEntries(reviewQueue.map((i) => [i.id, reviewDirection(srs[i.id])])), [reviewQueue]); // eslint-disable-line react-hooks/exhaustive-deps
  // Opened from the home-screen "Reviews" shortcut.
  useEffect(() => {
    if (!autoReview) return;
    if (reviewQueue.length) setReviewOpen(true);
    onAutoReviewDone?.();
  }, [autoReview]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextReview = useMemo(() => {
    const times = course.map((i) => srs[i.id]).filter((s) => s && s.stage >= 1 && s.stage < 5 && s.next > now).map((s) => s.next);
    return times.length ? Math.min(...times) : null;
  }, [srs, now]);

  // Words in beds you haven't planted don't count as locked items.
  const counted = course.filter((i) => !i.garden || garden.includes(i.garden) || stageOf(i.id) > 0);
  const counts = SRS_STAGES.map((_, idx) => counted.filter((i) => stageOf(i.id) === idx).length);

  const leeches = useMemo(() => course.filter((i) => isLeech(srs[i.id])), [srs, course]);

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
      if (parts.spell != null) stats.spell = bump(stats.spell || [0, 0], parts.spell);
      return { ...prev, [id]: { ...scheduleItem(cur, { read: grade(parts.read), second: grade(parts.second), spell: grade(parts.spell) }), stats } };
    });
    ["read", "second", "spell"].forEach((k) => logReview(id, k, grade(parts[k])));
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
        practice={todayPractice({ srs, mode, bridgeSched, log })}
        onPractice={onPractice}
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
              <div className="flex items-center justify-center gap-1 text-lg font-black text-white"><StageIcon stage={idx} size={15} />{counts[idx]}</div>
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

      <button onClick={() => setLedgerOpen(true)} className="flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left">
        <BarChart3 size={18} className="text-amber-300" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-widest text-amber-300">Ledger</div>
          <div className="text-xs text-slate-400">Your year, recall by track, hardest items and what's due.</div>
        </div>
        <ChevronRight size={16} className="text-slate-400" />
      </button>
      <Ledger open={ledgerOpen} onClose={() => setLedgerOpen(false)} log={log} srs={srs} ear={ear} mode={mode} />

      <SentenceDeck mode={mode} font={font} deck={sentSrs} setDeck={setSentSrs} saved={decoderSaved} mined={mined} sandbox={sandbox} logActivity={logActivity} course={course} stageOf={stageOf} />

      {/* The levels as stops down the Mekong (V3): each stop fills with gold as its items burn. */}
      <div className="relative" data-river>
        <div aria-hidden="true" className="pointer-events-none absolute bottom-8 left-[10px] top-8 w-4 opacity-40" style={{ backgroundColor: "var(--sk-river)", WebkitMaskImage: RIVER_MASK, maskImage: RIVER_MASK, WebkitMaskSize: "16px 120px", maskSize: "16px 120px", WebkitMaskRepeat: "repeat-y", maskRepeat: "repeat-y" }} />
        {COURSE_LEVELS.map((lvl, k) => {
          const items = course.filter((i) => i.level === lvl.n);
          const unlocked = unlockedLevels.has(lvl.n);
          const done = items.filter((i) => stageOf(i.id) >= 2).length;
          const burned = items.filter((i) => stageOf(i.id) >= 5).length;
          const current = lvl.n === currentLevel;
          const gate = !unlocked && (k === 0 || unlockedLevels.has(lvl.n - 1));
          const prev = course.filter((i) => i.level === lvl.n - 1);
          const prevDone = prev.filter((i) => stageOf(i.id) >= 2).length;
          return (
            <div key={lvl.n} className="relative mb-4 pl-10" data-level-stop={lvl.n}>
              <div className={`absolute left-0 top-5 flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-black ${current ? "sk-stop-current" : ""}`} title={`${burned} of ${items.length} burned`}
                style={{ borderColor: unlocked ? lvl.accent : "rgb(var(--sk-slate-600))", background: unlocked ? `conic-gradient(#FFD54F ${(burned / Math.max(1, items.length)) * 360}deg, rgb(var(--sk-bg)) 0)` : "rgb(var(--sk-bg))", boxShadow: current ? `0 0 0 4px ${lvl.accent}33, 0 0 22px ${lvl.accent}88` : undefined }}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sk-bg" style={{ color: unlocked ? lvl.accent : undefined }}>{unlocked ? lvl.n : <Lock size={12} className="text-slate-500" />}</span>
              </div>
              {unlocked ? (
                <Card className="sk-level-bg p-4 sm:p-5" style={{ backgroundImage: lvl.bg }}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: lvl.accent }}>
                        Level {lvl.n}{current && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white">You are here</span>}
                      </div>
                      <h3 className="text-base font-bold text-white">{lvl.title}</h3>
                      <p className="text-xs text-slate-400">{lvl.sub}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div className="font-bold text-slate-200">{burned ? `${burned}/${items.length} burned` : `${done}/${items.length}`}</div>
                      {burned ? `${done} at Novice Monk+` : "at Novice Monk+"}
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
                                className="sk-on-color group relative min-w-[52px] rounded-xl px-2.5 py-1.5 text-center text-white shadow transition hover:-translate-y-0.5 active:scale-95"
                                style={{ background: `linear-gradient(160deg, ${TIER[tier].color}, ${TIER[tier].color}aa)`, opacity: unlocked ? 1 : 0.55 }}
                                title={item.meaning}
                              >
                                <DualText th={item.th} lo={item.lo} mode={mode} font={font} className="text-2xl leading-tight" gapClass="gap-1.5" divider={false} />
                                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-sk-bg" style={{ background: SRS_STAGES[st].color }} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </Card>
              ) : gate ? (
                <Card className="border-dashed p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><Lock size={13} /> Level {lvl.n} · next gate</div>
                  <h3 className="text-base font-bold text-white">{lvl.title}</h3>
                  <p className="text-xs text-slate-400">{lvl.sub}</p>
                  <p className="mt-2 text-xs text-slate-300">Opens when every Level {lvl.n - 1} item reaches Novice Monk: {prevDone} of {prev.length}.</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${(prevDone / Math.max(1, prev.length)) * 100}%`, background: lvl.accent }} /></div>
                </Card>
              ) : (
                <div className="flex min-h-[3.25rem] items-center gap-2 pt-4 text-sm text-slate-500"><span className="font-semibold">Level {lvl.n}</span> · {lvl.title}</div>
              )}
            </div>
          );
        })}
      </div>

      <WordGarden open={gardenOpen} course={course} planted={garden} setPlanted={setGarden} stageOf={stageOf} mode={mode} font={font} onInspect={onInspect} />

      <LessonModal open={lessonOpen} queue={lessonQueue.slice(0, dailyMinutes <= 5 ? 3 : 5)} mode={mode} font={font} onClose={() => setLessonOpen(false)} onFinish={finishLessons} />
      <ReviewModal open={reviewOpen} queue={reviewQueue} directions={reviewDirections} mode={mode} font={font} fontFor={(it) => reviewFontFor(it, srs[it.id], font, prefs)} onClose={() => setReviewOpen(false)} onAnswer={answer} />
      <LeechDrill open={leechOpen} leeches={leeches} mode={mode} font={font} onClose={() => setLeechOpen(false)} onFinish={finishLeechDrill} />
    </div>
  );
}

function ItemHero({ item, mode, font }) {
  const color = TIER[item.tier].color;
  const [anat, setAnat] = useState(false);
  useEffect(() => setAnat(false), [item.id]);
  // Single letters can be tapped to show their parts (V4).
  const single = item.tier === "glyph" && [...item.th].length === 1 && /[ก-ฮ]/.test(item.th);
  const scripts = mode === "lo" ? ["lo"] : mode === "th" ? ["th"] : ["th", "lo"];
  return (
    <div className="rounded-3xl p-6 text-center" style={{ background: `radial-gradient(circle at 50% 30%, ${color}55, ${color}11 70%)` }}>
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{TIER[item.tier].label}</div>
      {anat ? (
        <button type="button" data-anatomy-toggle onClick={() => setAnat(false)} className={`my-3 grid w-full gap-2 ${scripts.length > 1 ? "grid-cols-2" : ""}`}>
          {scripts.map((sc) => <GlyphAnatomy key={sc} g={item[sc]} script={sc} size={scripts.length > 1 ? 140 : 200} />)}
        </button>
      ) : (
        <div className="my-3 text-white drop-shadow-lg" onClick={single ? () => setAnat(true) : undefined} data-anatomy-toggle={single ? "" : undefined} role={single ? "button" : undefined} title={single ? "Tap to see the letter's parts" : undefined}>
          <DualText th={item.th} lo={item.lo} mode={mode} font={font} className="text-7xl leading-[1.35]" />
          {single && <div className="mt-1 text-[11px] font-normal text-slate-400 drop-shadow-none">Tap the letter to see its parts</div>}
        </div>
      )}
      <div className="text-sm text-slate-200">
        {mode !== "lo" && <span>{R(item.thRoman)}</span>}
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
  // The batch is frozen when the modal opens, so finishing items doesn't reshuffle it mid-lesson.
  const [batch, setBatch] = useState([]);
  // After the cards, a short quiz: every item must be answered right once before it
  // enters SRS. Misses go to the back of the line, as in WaniKani.
  const [quiz, setQuiz] = useState(null); // { line: [ids], input, result: null | "ok" | "miss", misses }
  const quizInput = useRef(null);
  useEffect(() => {
    if (open) {
      setBatch(queue);
      setIdx(0);
      setQuiz(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (quiz && !quiz.result) quizInput.current?.focus();
  }, [quiz]);
  const items = open ? batch : [];
  const item = items[idx];
  if (!open || !item) return null;
  const last = idx === items.length - 1;

  if (quiz) {
    const qItem = items.find((i) => i.id === quiz.line[0]);
    const done = items.length - new Set(quiz.line).size;
    const check = (e) => {
      e.preventDefault();
      if (quiz.result) {
        const [head, ...rest] = quiz.line;
        const line = quiz.result === "ok" ? rest : [...rest, head];
        if (!line.length) return onFinish(items.map((i) => i.id));
        return setQuiz({ ...quiz, line, input: "", result: null });
      }
      if (!quiz.input.trim()) return undefined;
      const ok = isCorrect(qItem, quiz.input);
      haptic(ok ? "ok" : "miss");
      const audio = getAudio();
      if (mode === "lo") audio.speakHumanVoice(qItem.ttsLo || qItem.ttsTh, qItem.lo);
      else audio.speakHumanVoice(qItem.ttsTh);
      return setQuiz({ ...quiz, result: ok ? "ok" : "miss", misses: quiz.misses + (ok ? 0 : 1) });
    };
    return (
      <Modal open={open} onClose={onClose} title={`Lesson quiz · ${done} / ${items.length}`} accent={TIER[qItem.tier].color}>
        <form onSubmit={check}>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(done / items.length) * 100}%` }} /></div>
          <div className="sk-on-color mt-4 rounded-3xl p-8 text-center" style={{ background: `linear-gradient(160deg, ${TIER[qItem.tier].color}, ${TIER[qItem.tier].color}88)` }}>
            <DualText th={qItem.th} lo={qItem.lo} mode={mode} font={font} className={`${qItem.th.length + qItem.lo.length > 8 ? "text-5xl sm:text-6xl" : "text-7xl"} leading-[1.35] text-white`} />
          </div>
          <label htmlFor="lesson-quiz-input" className="mt-4 block text-center text-xs font-bold uppercase tracking-widest text-slate-400">Type the reading or the meaning</label>
          <input
            id="lesson-quiz-input"
            ref={quizInput}
            value={quiz.input}
            onChange={(e) => setQuiz({ ...quiz, input: e.target.value })}
            readOnly={!!quiz.result}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            className={`mt-2 w-full rounded-2xl border bg-black/30 px-4 py-3 text-center text-lg text-white outline-none ${quiz.result === "ok" ? "border-emerald-400 bg-emerald-500/20" : quiz.result === "miss" ? "border-rose-400 bg-rose-500/20" : "border-white/15 focus:border-amber-400"}`}
          />
          {quiz.result && (
            <div className="mt-3 rounded-2xl bg-white/[0.04] p-3 text-sm">
              <div className={`font-bold ${quiz.result === "ok" ? "text-emerald-300" : "text-rose-300"}`}>{quiz.result === "ok" ? "Got it" : "Not yet: it comes back at the end of this quiz"}</div>
              <div className="mt-1 text-slate-200"><span className="text-slate-400">Reading:</span> {mode === "lo" ? <span className="text-purple-200">{qItem.loRoman}</span> : <>{R(qItem.thRoman)}{mode !== "th" && <> · <span className="text-purple-200">{qItem.loRoman}</span></>}</>} · <span className="text-slate-400">Meaning:</span> {qItem.meaning}</div>
              {quiz.result === "miss" && <p className="mt-1 text-slate-400">{qItem.mnemonic}</p>}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setQuiz(null)} className="rounded-2xl border border-white/15 px-4 py-3 text-sm text-slate-300">Cards</button>
            <button type="submit" className="flex-1 rounded-2xl bg-amber-500 py-3 font-bold text-black">{quiz.result ? (quiz.line.length === 1 && quiz.result === "ok" ? "Add to SRS" : "Next") : "Check"}</button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={`Lesson ${idx + 1} / ${items.length}`} accent={TIER[item.tier].color}>
      <ItemHero item={item} mode={mode} font={font} />
      <div className="mt-4 flex justify-center">
        <AudioButtons ttsTh={item.ttsTh} ttsLo={item.ttsLo} loRaw={item.lo} tones={item.tone} mode={mode} />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <ExampleLine item={item} mode={mode} />
        {!item.example && <InfoRow icon={Sparkles} label="Mnemonic" text={item.mnemonic} color={COLORS.gold} />}
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
          <button onClick={() => setQuiz({ line: shuffle(items.map((i) => i.id)), input: "", result: null, misses: 0 })} className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black">
            <Check size={16} /> Quiz me
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
  if (!text) return null;
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

/* ============================================================================
 * Sentence deck: whole lines and phrases as review cards, kept apart from the
 * letter course. Directions rotate: read for meaning, listen for meaning, and
 * fill the gap. Words saved in the Decoder join once you give them a meaning.
 * ========================================================================== */
const SENTENCE_NEW_PER_DAY = 5;
function sentenceCards({ mode, saved = [], course = [], stageOf = () => 0, mined = [] }) {
  const script = mode === "lo" ? "lo" : "th";
  const join = (ws) => ws.join(script === "lo" ? " " : "");
  const cards = SENTENCES.filter((s) => s.script === script).map((s) => ({
    id: `sen-${s.id}-${script}`, script, words: s.words.map((w) => w.w), text: join(s.words.map((w) => w.w)), tts: s.words.map((w) => w.tts || w.w).join(" "), en: s.gloss,
  }));
  if (script === "th") {
    course.filter((i) => i.example && stageOf(i.id) >= 2 && i.example.th.includes(i.th)).forEach((i) => {
      const [before, ...rest] = i.example.th.split(i.th);
      const after = rest.join(i.th);
      cards.push({ id: `gx-${i.id}`, script, words: [before, i.th, after].filter(Boolean), gap: i.th, text: i.example.th, tts: i.example.th, en: i.example.en });
    });
  }
  // Sentences long-pressed in the Lantern Library.
  mined.forEach((m) => {
    const [sid, i, sc] = m.split(":");
    const story = LIBRARY.find((s) => s.id === sid);
    if (!story || sc !== script) return;
    const s = storyText(story, script)[Number(i)];
    if (s) cards.push({ id: `lib-${m}`, script, words: s.tokens.map((tk) => tk.t), text: s.tokens.map((tk) => tk.t).join(""), tts: s.tokens.map((tk) => tk.tts || tk.t).join(" "), en: s.en });
  });
  saved.filter((x) => x.meaning && (x.script || "th") === script).forEach((x) => cards.push({ id: `dw-${x.th}`, script, text: x.th, tts: script === "lo" ? laoToThai(x.th) : x.th, en: x.meaning, single: true }));
  return cards;
}
function sentenceDirection(card, st) {
  const order = card.single ? ["meaning", "listen"] : ["meaning", "listen", "cloze"];
  return order[(st?.reps || 0) % order.length];
}
function sentenceSession(cards, deck, now, sandbox) {
  const day = todayKey(now);
  const newToday = deck.__new?.day === day ? deck.__new.n : 0;
  const due = cards.filter((c) => deck[c.id] && deck[c.id].stage < 5 && (sandbox || deck[c.id].next <= now));
  const fresh = cards.filter((c) => !deck[c.id]).slice(0, Math.max(0, SENTENCE_NEW_PER_DAY - newToday));
  return { due, fresh };
}

function SentenceDeck({ mode, font, deck = {}, setDeck, saved, mined, sandbox, logActivity, course, stageOf }) {
  const [open, setOpen] = useState(false);
  const now = Date.now();
  const cards = useMemo(() => sentenceCards({ mode, saved, course, stageOf, mined }), [mode, saved, course, stageOf, mined]);
  const { due, fresh } = sentenceSession(cards, deck, now, sandbox);
  const known = cards.filter((c) => deck[c.id]).length;
  return (
    <>
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-300"><MessageCircle size={13} /> Sentence deck</div>
          <p className="text-xs text-slate-400">Whole lines: read them, hear them, fill the gap. {known}/{cards.length} started.</p>
        </div>
        <button disabled={!due.length && !fresh.length} onClick={() => setOpen(true)} className="shrink-0 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-black disabled:bg-white/10 disabled:text-slate-400">
          {due.length || fresh.length ? `${due.length} due · ${fresh.length} new` : "All done"}
        </button>
      </div>
    </Card>
    {/* Outside the card: its backdrop blur would trap the fixed sheet. */}
    {open && <SentenceSession open={open} onClose={() => setOpen(false)} cards={cards} queue={[...due, ...fresh].slice(0, 12)} deck={deck} setDeck={setDeck} mode={mode} font={font} logActivity={logActivity} />}
    </>
  );
}

function SentenceSession({ open, onClose, cards, queue, deck, setDeck, mode, logActivity }) {
  const [line] = useState(() => queue);
  const [dirs] = useState(() => queue.map((c) => sentenceDirection(c, deck[c.id])));
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState(null);
  const card = line[idx];
  const dir = dirs[idx];
  const say = useCallback((c) => { if (!c) return; const a = getAudio(); if (c.script === "lo") a.speakHumanVoice(c.tts, c.text); else a.speakHumanVoice(c.tts); }, []);
  const q = useMemo(() => {
    if (!card) return null;
    if (dir === "cloze") {
      const gap = card.gap || [...card.words].filter((w) => [...w].length >= 2).sort(() => Math.random() - 0.5)[0] || card.words[0];
      const pool = [...new Set(cards.flatMap((c) => c.words || []).filter((w) => w !== gap && [...w].length >= 2 && !/\s/.test(w)))];
      const opts = shuffle([gap, ...shuffle(pool).slice(0, 3)]);
      const k = card.words.indexOf(gap);
      const shown = card.words.map((w, i) => (i === k ? "＿＿" : w)).join(card.script === "lo" ? " " : "");
      return { kind: "cloze", prompt: shown, answer: gap, opts };
    }
    const pool = [...new Set(cards.map((c) => c.en).filter((e) => e !== card.en))];
    return { kind: dir, answer: card.en, opts: shuffle([card.en, ...shuffle(pool).slice(0, 3)]) };
  }, [card, dir]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (card && dir === "listen") setTimeout(() => say(card), 250); }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  if (!card) {
    return (
      <Modal open={open} onClose={onClose} title="Sentence deck">
        <div className="py-6 text-center"><Check className="mx-auto text-emerald-300" size={28} /><p className="mt-2 text-white">Done for now.</p></div>
        <button onClick={onClose} className="w-full rounded-2xl bg-amber-500 py-3 font-bold text-black">Close</button>
      </Modal>
    );
  }
  const fontFam = card.script === "lo" ? FONT_STACKS.loop.lo : FONT_STACKS.loop.th;
  const choose = (o) => {
    if (pick) return;
    setPick(o);
    const ok = o === q.answer;
    haptic(ok ? "ok" : "miss");
    if (dir !== "listen") say(card);
    setDeck?.((d) => {
      const cur = d[card.id];
      const fresh = !cur;
      const day = todayKey();
      const n = d.__new?.day === day ? d.__new.n : 0;
      const next = { ...scheduleItem(cur || { stage: 1, next: 0 }, { read: ok ? 3 : 1 }), reps: (cur?.reps || 0) + 1 };
      logReview(card.id, "sentence", ok ? 3 : 1);
      return { ...d, [card.id]: next, ...(fresh ? { __new: { day, n: n + 1 } } : {}) };
    });
    logActivity?.({ reviews: 1, reviewsRight: ok ? 1 : 0 });
  };
  const next = () => { setPick(null); setIdx(idx + 1); };
  return (
    <Modal open={open} onClose={onClose} title={`Sentence deck · ${idx + 1} / ${line.length}`}>
      <div className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">{dir === "listen" ? "Listen: what does it mean?" : dir === "cloze" ? "Fill the gap" : "What does it mean?"}</div>
      <div className="mt-3 rounded-3xl bg-white/[0.04] p-5 text-center">
        {dir === "listen" && !pick ? (
          <button onClick={() => say(card)} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20 text-amber-200"><Volume2 size={32} /></button>
        ) : (
          <div className={`${[...card.text].length > 14 ? "text-2xl" : "text-4xl"} leading-[1.7] text-white`} lang={card.script} style={{ fontFamily: fontFam }}>{pick ? card.text : q.kind === "cloze" ? q.prompt : card.text}</div>
        )}
        {(pick || q.kind === "cloze") && <div className="mt-1 text-sm text-slate-300">{card.en}</div>}
        {!pick && dir !== "listen" && <button onClick={() => say(card)} className="mt-2 text-xs text-slate-400 underline">Play</button>}
      </div>
      <div className="mt-4 grid gap-2">
        {q.opts.map((o) => {
          const right = pick && o === q.answer;
          const wrong = pick === o && o !== q.answer;
          return (
            <button key={o} onClick={() => choose(o)} className={`rounded-2xl border px-4 py-3 text-left transition ${right ? "border-emerald-400 bg-emerald-500/20" : wrong ? "border-rose-400 bg-rose-500/20" : "border-white/10 bg-white/[0.04]"}`}>
              <span className={q.kind === "cloze" ? "text-2xl text-white" : "text-sm text-white"} style={q.kind === "cloze" ? { fontFamily: fontFam } : undefined}>{o}</span>
            </button>
          );
        })}
      </div>
      {pick && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => say(card)} className="rounded-2xl border border-white/15 px-4 py-3 text-sm text-slate-200"><Volume2 size={16} /></button>
          <button onClick={next} className="flex-1 rounded-2xl bg-amber-500 py-3 font-bold text-black">{idx === line.length - 1 ? "Finish" : "Next"}</button>
        </div>
      )}
    </Modal>
  );
}

/* ============================================================================
 * Ledger (N15): a year of study on the phone. Heatmap, reviews per day, real
 * recall per track against the 90% target, tone confusions, hardest items,
 * time spent and a 30-day forecast.
 * ========================================================================== */
const LEDGER_TRACKS = [["read", "Reading"], ["second", "Tone"], ["spell", "Spelling"], ["write", "Writing"], ["sentence", "Sentences"]];
const dayActivity = (d) => (d ? (d.reviews || 0) + (d.lessons || 0) + (d.ear || 0) + (d.shadow || 0) + (d.traces || 0) + (d.bridge || 0) + (d.signs || 0) + (d.drills || 0) + (d.reads || 0) : 0);
const fmtMinutes = (secs) => { const m = Math.round((secs || 0) / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };

/** Recall per track: share of answers that weren't "Again", from the review log, else from per-item counts. */
function trackRecall(reviews, srs) {
  const out = {};
  if (reviews.length) {
    reviews.forEach((r) => { if (r.track === "ear") return; const o = (out[r.track] ||= [0, 0]); o[0] += r.g >= 2 ? 1 : 0; o[1] += 1; });
    return out;
  }
  Object.values(srs).forEach((s) => Object.entries(s?.stats || {}).forEach(([k, [r, n]]) => { const o = (out[k] ||= [0, 0]); o[0] += r; o[1] += n; }));
  return out;
}

function dueForecast(srs, days = 30, now = Date.now()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const counts = Array(days).fill(0);
  Object.values(srs).forEach((s) => {
    if (!s || !(s.stage >= 1) || s.stage >= 5) return;
    const k = Math.floor((Math.max(s.next, now) - start.getTime()) / DAY);
    if (k >= 0 && k < days) counts[k] += 1;
  });
  return counts;
}

function Ledger({ open, onClose, log = {}, srs = {}, ear, mode }) {
  const [reviews, setReviews] = useState([]);
  useEffect(() => { if (open) readReviews(Date.now() - 90 * DAY).then(setReviews); }, [open]);
  const course = useMemo(() => courseItems(mode), [mode]);
  if (!open) return null;
  const now = Date.now();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  // Heatmap: 26 weeks ending this week, Monday rows.
  const weeks = 26;
  const end = new Date(today); end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));
  const cells = [];
  for (let w = weeks - 1; w >= 0; w -= 1) for (let d = 6; d >= 0; d -= 1) { const x = new Date(end); x.setDate(end.getDate() - (w * 7 + d)); cells.push(x); }
  const vals = cells.map((c) => dayActivity(log[todayKey(c.getTime())]));
  const max = Math.max(1, ...vals);
  const studyDays = Object.values(log).filter((d) => dayActivity(d) > 0).length;
  const last30 = Array.from({ length: 30 }, (_, i) => { const x = new Date(today); x.setDate(x.getDate() - (29 - i)); return log[todayKey(x.getTime())] || {}; });
  const revMax = Math.max(1, ...last30.map((d) => d.reviews || 0));
  const secs7 = last30.slice(-7).reduce((s, d) => s + (d.secs || 0), 0);
  const secs30 = last30.reduce((s, d) => s + (d.secs || 0), 0);
  const secsAll = Object.values(log).reduce((s, d) => s + (d.secs || 0), 0);
  const recall = trackRecall(reviews, srs);
  const toneTotals = ear?.tones || {};
  const confusions = Object.entries(ear?.confusions || {}).map(([k, n]) => { const [a, b] = k.split(">"); const tot = toneTotals[a]?.[1] || n; return { a, b, n, share: n / Math.max(1, tot) }; }).sort((x, y) => y.share - x.share).slice(0, 4);
  const recentEar = reviews.filter((r) => r.track === "ear");
  const hardest = course.map((i) => ({ i, s: srs[i.id] })).filter((x) => x.s?.fsrs).map((x) => ({ ...x, lapses: lapsesOf(x.s), D: Math.max(...Object.values(x.s.fsrs).map((tk) => tk.D || 0)) })).filter((x) => x.lapses > 0 || x.D > 7).sort((a, b) => b.lapses - a.lapses || b.D - a.D).slice(0, 10);
  const forecast = dueForecast(srs, 30, now);
  const fMax = Math.max(1, ...forecast);
  const label = "text-[11px] font-bold uppercase tracking-wider text-slate-400";
  return (
    <Modal open={open} onClose={onClose} title="Ledger · your statistics" wide>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/[0.04] p-3"><div className="text-2xl font-black text-white">{studyDays}</div><div className="text-[11px] text-slate-400">study days</div></div>
          <div className="rounded-2xl bg-white/[0.04] p-3"><div className="text-2xl font-black text-white">{last30.reduce((s, d) => s + (d.reviews || 0), 0)}</div><div className="text-[11px] text-slate-400">reviews, 30 days</div></div>
          <div className="rounded-2xl bg-white/[0.04] p-3"><div className="text-lg font-black text-white">{fmtMinutes(secs7)}</div><div className="text-[11px] text-slate-400">this week</div></div>
        </div>
        <section>
          <div className={label}>Last 26 weeks</div>
          <div className="mt-2 grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
            {cells.map((c, k) => {
              const v = vals[k];
              const future = c.getTime() > now;
              return <div key={k} title={`${todayKey(c.getTime())}: ${v}`} className="aspect-square rounded-[3px]" style={{ background: future ? "transparent" : v ? `rgba(245,158,11,${0.25 + 0.75 * (v / max)})` : "rgb(var(--sk-ink) / 0.06)" }} />;
            })}
          </div>
        </section>
        <section>
          <div className={label}>Reviews per day · last 30 days</div>
          <div className="mt-2 flex h-20 items-end gap-[2px]">
            {last30.map((d, k) => <div key={k} className="flex-1 rounded-t bg-cyan-400/70" style={{ height: `${((d.reviews || 0) / revMax) * 100}%`, minHeight: d.reviews ? 2 : 0 }} title={`${d.reviews || 0}`} />)}
          </div>
        </section>
        <section>
          <div className={label}>Recall by track · line marks the 90% target</div>
          <div className="mt-2 space-y-2">
            {LEDGER_TRACKS.map(([k, name]) => {
              const [r, n] = recall[k] || [0, 0];
              const pct = n ? r / n : null;
              const low = pct != null && pct < TARGET_RETENTION;
              return (
                <div key={k} className="flex items-center gap-3 text-sm">
                  <span className="w-20 shrink-0 text-slate-300">{name}</span>
                  <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${(pct || 0) * 100}%`, background: low ? "#FB7185" : "#34D399" }} />
                    <div className="absolute inset-y-0 w-0.5 bg-white/70" style={{ left: "90%" }} />
                  </div>
                  <span className={`w-16 shrink-0 text-right tabular-nums ${low ? "text-rose-300" : "text-slate-200"}`}>{pct == null ? "–" : `${Math.round(pct * 100)}%`}<span className="text-[10px] text-slate-500"> {n || ""}</span></span>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{reviews.length ? "From your last 90 days of answers." : "From all answers so far; the per-answer log starts with this version."}</p>
        </section>
        <section>
          <div className={label}>Most confused tones</div>
          {confusions.length ? (
            <div className="mt-2 space-y-1.5">
              {confusions.map((c) => (
                <div key={`${c.a}>${c.b}`} className="flex items-center gap-2 text-sm">
                  <span style={{ color: TONES[c.a]?.ink }}>{TONES[c.a]?.name}</span><span className="text-slate-400">heard as</span><span style={{ color: TONES[c.b]?.ink }}>{TONES[c.b]?.name}</span>
                  <span className="ml-auto tabular-nums text-slate-300">{Math.round(c.share * 100)}%</span>
                </div>
              ))}
              {recentEar.length > 0 && <p className="text-[11px] text-slate-500">Last 90 days: {Math.round((recentEar.filter((r) => r.g >= 2).length / recentEar.length) * 100)}% of {recentEar.length} tone answers right.</p>}
            </div>
          ) : <p className="mt-1 text-sm text-slate-400">No confusions yet. The Ear Dojo fills this in.</p>}
        </section>
        <section>
          <div className={label}>Ten hardest items</div>
          {hardest.length ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {hardest.map(({ i, lapses }) => (
                <div key={i.id} className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-2.5 py-1.5">
                  <span className="text-xl text-white" style={{ fontFamily: mode === "lo" ? FONT_STACKS.loop.lo : FONT_STACKS.loop.th }}>{mode === "lo" ? i.lo : i.th}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-400">{i.meaning}</span>
                  <span className="text-xs tabular-nums text-rose-300">{lapses}×</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-1 text-sm text-slate-400">Nothing has given you trouble yet.</p>}
        </section>
        <section>
          <div className={label}>Due over the next 30 days</div>
          <div className="mt-2 flex h-16 items-end gap-[2px]">
            {forecast.map((n, k) => <div key={k} className="flex-1 rounded-t bg-purple-400/70" style={{ height: `${(n / fMax) * 100}%`, minHeight: n ? 2 : 0 }} title={`${n}`} />)}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-500"><span>today</span><span>+15 d</span><span>+30 d</span></div>
        </section>
        <p className="text-xs text-slate-400">Time studied: {fmtMinutes(secs30)} in 30 days, {fmtMinutes(secsAll)} in all. Everything here stays on this phone.</p>
      </div>
    </Modal>
  );
}

/** Merge two lists, taking a from the first and b from the second in turn. */
function interleave(xs, ys, a = 3, b = 2) {
  const out = [];
  let i = 0;
  let j = 0;
  while (i < xs.length || j < ys.length) {
    for (let k = 0; k < a && i < xs.length; k += 1) out.push(xs[i++]);
    for (let k = 0; k < b && j < ys.length; k += 1) out.push(ys[j++]);
  }
  return out;
}

function WordGarden({ open, course, planted, setPlanted, stageOf, mode, font, onInspect }) {
  const [shown, setShown] = useState(null);
  const toggle = (id) => setPlanted?.((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  return (
    <Card className="p-4 sm:p-5" style={{ backgroundImage: "radial-gradient(ellipse at 10% 0%, #34D39922, transparent 60%)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">{open ? <Unlock size={13} /> : <Lock size={13} />} Word Garden · Levels 10–16</div>
          <h3 className="text-base font-bold text-white">Everyday words, one bed at a time</h3>
          <p className="text-xs text-slate-400">{open ? "Plant a bed and its words join your lessons, mixed in with the course. Each word comes with a short phrase to hear it in." : "Opens when every Level 4 item reaches Novice Monk."}</p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {GARDEN_BEDS.map((b) => {
          const items = course.filter((i) => i.garden === b.id);
          const done = items.filter((i) => stageOf(i.id) >= 2).length;
          const started = items.filter((i) => stageOf(i.id) > 0).length;
          const isPlanted = planted.includes(b.id);
          return (
            <div key={b.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setShown(shown === b.id ? null : b.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: b.color }} />
                    <span className="truncate text-sm font-semibold text-white">{b.title}</span>
                    <span className="truncate text-xs text-slate-400" style={{ fontFamily: mode === "lo" ? FONT_STACKS.loop.lo : FONT_STACKS.loop.th }}>{mode === "lo" ? b.lo : b.th}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${(done / Math.max(1, items.length)) * 100}%`, background: b.color }} /></div>
                  <div className="mt-1 text-[11px] text-slate-400">{done}/{items.length} at Novice Monk+{started > done ? ` · ${started - done} growing` : ""}</div>
                </button>
                <button
                  disabled={!open}
                  onClick={() => toggle(b.id)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-40 ${isPlanted ? "border border-emerald-400/50 bg-emerald-500/15 text-emerald-200" : "bg-white/10 text-white"}`}
                >
                  {isPlanted ? <><Check size={12} className="mr-1 inline" />Planted</> : "Plant"}
                </button>
              </div>
              {shown === b.id && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {items.map((it) => (
                    <button key={it.id} onClick={() => onInspect(it)} className="relative rounded-lg px-2 py-1 text-white" style={{ background: `${b.color}33` }} title={it.meaning}>
                      <DualText th={it.th} lo={it.lo} mode={mode} font={font} className="text-lg leading-tight" gapClass="gap-1" divider={false} />
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-sk-bg" style={{ background: SRS_STAGES[stageOf(it.id)].color }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** A phrase to hear the word in: the word's own example, or a slicer line that uses it. */
function exampleFor(item, mode) {
  if (item.example && mode !== "lo") return { text: item.example.th, en: item.example.en, script: "th" };
  if (item.tier === "glyph") return null;
  const script = mode === "lo" ? "lo" : "th";
  const word = script === "lo" ? item.lo : item.th;
  if (!word || [...word].length < 2) return null;
  const line = SENTENCES.find((s) => s.script === script && s.words.some((w) => w.w === word));
  return line ? { text: line.words.map((w) => w.w).join(script === "lo" ? " " : ""), en: line.gloss, script, tts: line.words.map((w) => w.tts || w.w).join(" ") } : null;
}

function ExampleLine({ item, mode }) {
  const ex = exampleFor(item, mode);
  if (!ex) return null;
  const say = () => { const a = getAudio(); if (ex.script === "lo") a.speakHumanVoice(ex.tts || ex.text, ex.text); else a.speakHumanVoice(ex.tts || ex.text); };
  return (
    <button onClick={say} className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-left">
      <Volume2 size={16} className="shrink-0 text-amber-300" />
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Hear it in a phrase</div>
        <div className="text-xl text-white" lang={ex.script} style={{ fontFamily: ex.script === "lo" ? FONT_STACKS.loop.lo : FONT_STACKS.loop.th }}>{ex.text}</div>
        <div className="text-xs text-slate-400">{ex.en}</div>
      </div>
    </button>
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
  if (item.toneSet === "lo") return item.loParts ? `${item.loSyl[0]}: ${explainLaoTone(item.loParts[0])}` : `This word is ${TONES[right].name} (${TONES[right].chao}).`;
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
  if (item.toneSet === "lo") return `${item.lo} is ${CLASSES[item.cls].name} class, not ${CLASSES[picked].name}. ${LAO_CLASS_RULE[item.cls]}`;
  return `${item.th} is ${CLASSES[item.cls].name} class, not ${CLASSES[picked].name}. ${CLASSES[item.cls].rule}`;
}

/** Which second question an item gets after its reading: tone or class. */
function secondPrompt(item) {
  if (item.tier === "glyph") return item.cls ? "class" : null;
  return item.tone.length ? "tone" : null;
}

/** Romanised syllables with the tone diacritics stripped, so the label can't give the tone away. */
function syllableLabels(item) {
  if (item.toneSet === "lo") {
    const lp = item.loRoman.split(" ·")[0].split(/[-\s]+/).filter(Boolean);
    return lp.length === item.tone.length ? lp : item.loSyl?.length === item.tone.length ? item.loSyl : item.tone.map((_, i) => `syllable ${i + 1}`);
  }
  const parts = item.thRoman.split(" ·")[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[-\s]+/).filter(Boolean);
  return parts.length === item.tone.length ? parts : item.tone.map((_, i) => `syllable ${i + 1}`);
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

function ReviewModal({ open, queue, directions = {}, mode, font, onClose, onAnswer, fontFor }) {
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("read"); // read → second → result
  const [readOk, setReadOk] = useState(null);
  const [pick, setPick] = useState(null);
  const [tonePicks, setTonePicks] = useState([]);
  const [dirs, setDirs] = useState({});
  const [spell, setSpell] = useState(null); // { options, pick }
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
      setDirs(directions);
      setIdx(0);
      setInput("");
      setPhase("read");
      setReadOk(null);
      setPick(null);
      setTonePicks([]);
      setScore({ right: 0, wrong: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && phase === "read") inputRef.current?.focus();
  }, [open, idx, phase]);

  // Reverse reviews: hear the word, see its reading and meaning, pick the spelling.
  useEffect(() => {
    const it = list[idx];
    if (!open || !it || dirs[it.id] !== "spell") return setSpell(null);
    setSpell({ id: it.id, options: shuffle([it, ...confusables(it, mode === "lo" ? "lo" : "th")]), pick: null });
    const audio = getAudio();
    if (mode === "lo") audio.speakHumanVoice(it.ttsLo || it.ttsTh, it.lo);
    else audio.speakHumanVoice(it.ttsTh);
    return undefined;
  }, [open, idx, list, dirs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!spell || spell.pick) return undefined;
    const onKey = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= spell.options.length) document.querySelectorAll("[data-spell-opt]")[n - 1]?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spell]);

  if (!open) return null;
  const item = list[idx];
  const finished = idx >= list.length;
  const kind = item ? secondPrompt(item) : null;
  const sylTones = kind === "tone" ? item.tone : [];
  const multi = sylTones.length > 1;
  const sylLabels = multi ? syllableLabels(item) : [];
  const secondRight = kind === "tone" ? item.tone[tonePicks.length] ?? item.tone[0] : kind === "class" ? item.cls : null;
  const secondOk = multi
    ? (tonePicks.length < sylTones.length ? null : tonePicks.every((t, i) => t === sylTones[i]))
    : pick == null ? null : pick === secondRight;

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

  const pickSpelling = (opt) => {
    if (!spell || spell.pick) return;
    const ok = opt.id === item.id;
    haptic(ok ? "ok" : "miss");
    setSpell({ ...spell, pick: opt.id });
    setScore((s) => ({ ...s, [ok ? "right" : "wrong"]: s[ok ? "right" : "wrong"] + 1 }));
    pending.current = { id: item.id, ok, parts: { spell: ok } };
    setPhase("result");
  };

  const next = (guessed = false) => {
    commit(guessed);
    setInput("");
    setPhase("read");
    setReadOk(null);
    setPick(null);
    setTonePicks([]);
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
    if (multi) {
      // Words are asked one syllable at a time; the tone track passes only if every syllable is right.
      const picks = [...tonePicks, k];
      setTonePicks(picks);
      if (picks.length < sylTones.length) return;
      setPick(k);
      finish(readOk, picks.every((t, i) => t === sylTones[i]));
      return;
    }
    setPick(k);
    finish(readOk, k === secondRight);
  };

  const readingNote = phase === "result" && !readOk ? diagnoseReading(item, input) : null;
  const secondNote = phase === "result" && secondOk === false
    ? multi
      ? sylTones.map((t, i) => (tonePicks[i] === t ? null : `${sylLabels[i]} is ${TONES[t].name} (${TONES[t].chao}), not ${TONES[tonePicks[i]].name}.${item.loParts ? ` ${explainLaoTone(item.loParts[i])}` : ""}`)).filter(Boolean).join(" ")
      : kind === "tone" ? diagnoseTone(item, pick) : diagnoseClass(item, pick)
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
      ) : spell && spell.id === item.id ? (
        <div>
          <div className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">Which spelling? (keys 1–4)</div>
          <div className="mt-3 flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <button type="button" onClick={speak} aria-label="Play again" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-500 text-black active:scale-95"><Volume2 size={28} /></button>
            <div>
              <div className="text-2xl font-bold text-white">{mode === "lo" ? item.loRoman : R(item.thRoman.split(" ·")[0])}</div>
              {/* Thai in brackets (e.g. "child (เด็ก)") would give the spelling away. */}
              <div className="text-slate-300">{item.meaning.replace(/\s*\([^)]*[\u0E00-\u0EFF][^)]*\)/g, "")}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {spell.options.map((o, i) => {
              const right = o.id === item.id;
              const picked = spell.pick === o.id;
              const state = !spell.pick ? "border-white/10 bg-white/[0.04]" : right ? "border-emerald-400 bg-emerald-500/20" : picked ? "border-rose-400 bg-rose-500/20" : "border-white/10 bg-white/[0.04] opacity-50";
              return (
                <button key={o.id} data-spell-opt type="button" onClick={() => pickSpelling(o)} disabled={!!spell.pick} className={`relative rounded-2xl border-2 px-2 py-4 text-center transition ${state}`}>
                  <span className="absolute left-2 top-1.5 text-[11px] text-slate-500">{i + 1}</span>
                  <span className={`${(mode === "lo" ? o.lo : o.th).length > 5 ? "text-3xl" : "text-5xl"} leading-[1.5] text-white`} style={{ fontFamily: FONT_STACKS[font][mode === "lo" ? "lo" : "th"] }}>{mode === "lo" ? o.lo : o.th}</span>
                </button>
              );
            })}
          </div>
          {phase === "result" && (
            <div className="mt-3 space-y-1 rounded-2xl bg-white/[0.04] p-3 text-sm">
              {spell.pick === item.id ? (
                <div className="font-bold text-emerald-300">Correct</div>
              ) : (
                <>
                  <div className="font-bold text-rose-300">Spelling missed</div>
                  {(() => { const o = spell.options.find((x) => x.id === spell.pick); return o ? <p className="text-rose-200">{mode === "lo" ? o.lo : o.th} is {mode === "lo" ? o.loRoman : o.thRoman.split(" ·")[0]}, "{o.meaning}". {item.trap || ""}</p> : null; })()}
                </>
              )}
              <div className="text-slate-300"><DualText th={item.th} lo={item.lo} mode={mode} font={font} className="text-3xl leading-[1.5] text-white" /></div>
            </div>
          )}
          {phase === "result" && (
            <div className="mt-4 flex gap-2">
              {spell.pick === item.id && (
                <button type="button" onClick={() => next(true)} className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">I guessed</button>
              )}
              <button type="button" onClick={() => next()} className="flex-1 rounded-2xl bg-amber-500 py-3 font-bold text-black">Next</button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="sk-on-color rounded-3xl p-8 text-center" style={{ background: `linear-gradient(160deg, ${TIER[item.tier].color}, ${TIER[item.tier].color}88)` }}>
            <DualText th={item.th} lo={item.lo} mode={mode} font={fontFor ? fontFor(item) : font} className={`${item.th.length + item.lo.length > 8 ? "text-5xl sm:text-6xl" : "text-7xl"} leading-[1.35] text-white`} />
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
                2 · {multi ? "Tone of each syllable (keys 1–5)" : kind === "tone" ? "Which tone? (keys 1–5)" : "Which consonant class?"}
              </div>
              {multi && (
                <div className="mb-3 flex flex-wrap justify-center gap-2">
                  {sylLabels.map((label, i) => {
                    const picked = tonePicks[i];
                    const current = phase === "second" && i === tonePicks.length;
                    const shown = phase === "result" ? sylTones[i] : picked;
                    const wrong = phase === "result" && picked !== sylTones[i];
                    return (
                      <div key={i} className={`flex min-w-[64px] flex-col items-center rounded-xl border px-3 py-1.5 text-sm ${current ? "border-amber-400 bg-amber-500/15 text-white" : wrong ? "border-rose-400/60 bg-rose-500/10 text-rose-100" : "border-white/10 bg-white/[0.04] text-slate-200"}`}>
                        <span className="font-semibold">{label}</span>
                        <span className="text-[11px]" style={{ color: shown ? TONES[shown].ink : "#94A3B8" }}>{shown ? TONES[shown].name : current ? "?" : "…"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {multi && phase === "result" ? null : kind === "tone"
                ? <ToneChoice key={tonePicks.length} onPick={onPick} picked={multi ? null : pick} correct={phase === "result" ? secondRight : null} disabled={phase !== "second"} options={item.toneSet === "lo" ? LAO_TONE_ORDER : TONE_ORDER} />
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
                <span className="text-slate-400">Reading:</span> {mode === "lo" ? <span className="text-purple-200">{item.loRoman}</span> : <>{R(item.thRoman)}{mode !== "th" && <> · <span className="text-purple-200">{item.loRoman}</span></>}</>}
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
            SRS stage: <StageIcon stage={st} size={13} className="mb-0.5 inline" /> <span className="font-bold text-white">{SRS_STAGES[st].name}</span> ({SRS_STAGES[st].alias})
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
// Two-syllable words: one tone question per syllable, so the ear learns tones in running speech.
const EAR_WORD_SETS = [
  { id: "w-food", label: "Food", words: [
    { th: "ข้าวผัด", r: "khâaw-phàt", m: "fried rice", tones: ["falling", "low"] },
    { th: "ไก่ย่าง", r: "kài-yâang", m: "grilled chicken", tones: ["low", "falling"] },
    { th: "มะม่วง", r: "má-mûang", m: "mango", tones: ["high", "falling"] },
    { th: "มะนาว", r: "má-naaw", m: "lime", tones: ["high", "mid"] },
    { th: "ทุเรียน", r: "thú-rian", m: "durian", tones: ["high", "mid"] },
    { th: "กาแฟ", r: "kaa-fɛɛ", m: "coffee", tones: ["mid", "mid"] },
    { th: "อาหาร", r: "aa-hǎan", m: "food", tones: ["mid", "rising"] },
    { th: "น้ำแข็ง", r: "náam-khɛ̌ng", m: "ice", tones: ["high", "rising"] },
    { th: "อร่อย", r: "à-rɔ̀i", m: "delicious", tones: ["low", "low"] },
  ] },
  { id: "w-people", label: "People and places", words: [
    { th: "ผู้หญิง", r: "phûu-yǐng", m: "woman", tones: ["falling", "rising"] },
    { th: "ผู้ชาย", r: "phûu-chaai", m: "man", tones: ["falling", "mid"] },
    { th: "พี่น้อง", r: "phîi-nɔ́ɔng", m: "siblings", tones: ["falling", "high"] },
    { th: "แม่น้ำ", r: "mɛ̂ɛ-náam", m: "river", tones: ["falling", "high"] },
    { th: "ห้องน้ำ", r: "hɔ̂ng-náam", m: "bathroom", tones: ["falling", "high"] },
    { th: "ตลาด", r: "tà-làat", m: "market", tones: ["low", "low"] },
    { th: "ประเทศ", r: "prà-thêet", m: "country", tones: ["low", "falling"] },
    { th: "โรงเรียน", r: "roong-rian", m: "school", tones: ["mid", "mid"] },
    { th: "เชียงใหม่", r: "chiang-mài", m: "Chiang Mai", tones: ["mid", "low"] },
  ] },
  { id: "w-talk", label: "Everyday talk", words: [
    { th: "ขอบคุณ", r: "khɔ̀ɔp-khun", m: "thank you", tones: ["low", "mid"] },
    { th: "ขอโทษ", r: "khɔ̌ɔ-thôot", m: "sorry", tones: ["rising", "falling"] },
    { th: "สบาย", r: "sà-baai", m: "comfortable, well", tones: ["low", "mid"] },
    { th: "สนุก", r: "sà-nùk", m: "fun", tones: ["low", "low"] },
    { th: "ภาษา", r: "phaa-sǎa", m: "language", tones: ["mid", "rising"] },
    { th: "หนังสือ", r: "nǎng-sʉ̌ʉ", m: "book", tones: ["rising", "rising"] },
    { th: "เท่าไร", r: "thâo-rai", m: "how much", tones: ["falling", "mid"] },
    { th: "ไม่ใช่", r: "mâi-châi", m: "it isn't", tones: ["falling", "falling"] },
    { th: "ร้อนมาก", r: "rɔ́ɔn-mâak", m: "very hot", tones: ["high", "falling"] },
  ] },
];

// Lao sets ask which word you heard, by spelling. They play only with a real Lao voice:
// a Thai voice reading Lao would teach Bangkok tones, and Vientiane tones differ.
const EAR_LAO_SETS = [
  { id: "l-maa", label: "ມາ · ມ້າ · ໝາ", words: [
    { lo: "ມາ", r: "maa", m: "come" },
    { lo: "ມ້າ", r: "maa", m: "horse" },
    { lo: "ໝາ", r: "maa", m: "dog" },
  ] },
  { id: "l-khaa", label: "ຂາ · ຂ່າ · ຂ້າ", words: [
    { lo: "ຂາ", r: "khaa", m: "leg" },
    { lo: "ຂ່າ", r: "khaa", m: "galangal" },
    { lo: "ຂ້າ", r: "khaa", m: "kill" },
  ] },
  { id: "l-naa", label: "ນາ · ນ້າ · ໜ້າ · ໜາ", words: [
    { lo: "ນາ", r: "naa", m: "rice field" },
    { lo: "ນ້າ", r: "naa", m: "aunt / uncle (parent's younger sibling)" },
    { lo: "ໜ້າ", r: "naa", m: "face" },
    { lo: "ໜາ", r: "naa", m: "thick" },
  ] },
  { id: "l-paa", label: "ປາ · ປ່າ · ປ້າ", words: [
    { lo: "ປາ", r: "paa", m: "fish" },
    { lo: "ປ່າ", r: "paa", m: "forest" },
    { lo: "ປ້າ", r: "paa", m: "aunt (parent's older sister)" },
  ] },
  { id: "l-suea", label: "ເສືອ · ເສື່ອ · ເສື້ອ", words: [
    { lo: "ເສືອ", r: "sʉa", m: "tiger" },
    { lo: "ເສື່ອ", r: "sʉa", m: "mat" },
    { lo: "ເສື້ອ", r: "sʉa", m: "shirt" },
  ] },
  { id: "l-mai", label: "ໄມ້ · ໃໝ່ · ໄໝ", words: [
    { lo: "ໄມ້", r: "mai", m: "wood" },
    { lo: "ໃໝ່", r: "mai", m: "new" },
    { lo: "ໄໝ", r: "mai", m: "silk" },
  ] },
];

const EAR_DECKS = [
  { id: "single", label: "Single syllables", sub: "Minimal sets like มา · ม้า · หมา" },
  { id: "words", label: "Two-syllable words", sub: "Name the tone of each syllable" },
  { id: "phrases", label: "Tones in phrases", sub: "One syllable's tone inside running speech" },
  { id: "sounds", label: "Sound Dojo", sub: "Puffed or plain, short or long, hidden finals, ง" },
  { id: "lao", label: "Lao sets", sub: "Which Lao word did you hear?" },
];

/* Sound Dojo (N8): the other contrasts that change meaning, in same-tone sets. */
const SOUND_KINDS = { aspiration: "Puffed or plain (k/kh, t/th/d, p/ph/b, j/ch)", length: "Short or long vowel", finals: "Hidden final stops (-k, -t, -p)", ng: "Initial ง" };
const SOUND_SETS = [
  { id: "a-kaang", kind: "aspiration", words: [{ th: "กาง", r: "kaang", m: "spread out" }, { th: "คาง", r: "khaang", m: "chin" }] },
  { id: "a-kor", kind: "aspiration", words: [{ th: "กอ", r: "kɔɔ", m: "clump" }, { th: "คอ", r: "khɔɔ", m: "neck" }] },
  { id: "a-tii", kind: "aspiration", words: [{ th: "ตี", r: "tii", m: "hit" }, { th: "ที", r: "thii", m: "a turn / time" }, { th: "ดี", r: "dii", m: "good" }] },
  { id: "a-taa", kind: "aspiration", words: [{ th: "ตา", r: "taa", m: "eye" }, { th: "ทา", r: "thaa", m: "paint on" }] },
  { id: "a-paan", kind: "aspiration", words: [{ th: "ปาน", r: "paan", m: "birthmark" }, { th: "พาน", r: "phaan", m: "offering tray" }, { th: "บาน", r: "baan", m: "bloom" }] },
  { id: "a-jaan", kind: "aspiration", words: [{ th: "จาน", r: "jaan", m: "plate" }, { th: "ชาน", r: "chaan", m: "porch" }] },
  { id: "l-khao", kind: "length", words: [{ th: "เข้า", r: "khâo", m: "enter" }, { th: "ข้าว", r: "khâaw", m: "rice" }] },
  { id: "l-yang", kind: "length", words: [{ th: "ยัง", r: "yang", m: "still / yet" }, { th: "ยาง", r: "yaang", m: "rubber" }] },
  { id: "l-fan", kind: "length", words: [{ th: "ฝัน", r: "fǎn", m: "dream" }, { th: "ฝาน", r: "fǎan", m: "slice" }] },
  { id: "l-wang", kind: "length", words: [{ th: "วัง", r: "wang", m: "palace" }, { th: "วาง", r: "waang", m: "put down" }] },
  { id: "l-khon", kind: "length", words: [{ th: "ขน", r: "khǒn", m: "fur / body hair" }, { th: "ขาน", r: "khǎan", m: "answer a call" }] },
  { id: "f-kat", kind: "finals", words: [{ th: "กัด", r: "kàt", m: "bite" }, { th: "กับ", r: "kàp", m: "with" }, { th: "กัก", r: "kàk", m: "hold back" }] },
  { id: "f-rot", kind: "finals", words: [{ th: "รบ", r: "róp", m: "fight" }, { th: "รด", r: "rót", m: "water (plants)" }, { th: "รก", r: "rók", m: "messy" }] },
  { id: "f-paak", kind: "finals", words: [{ th: "ปาก", r: "pàak", m: "mouth" }, { th: "ปาด", r: "pàat", m: "swipe" }] },
  { id: "n-ngaan", kind: "ng", words: [{ th: "งาน", r: "ngaan", m: "work" }, { th: "อาน", r: "aan", m: "saddle" }, { th: "นาน", r: "naan", m: "a long time" }] },
  { id: "n-ngor", kind: "ng", words: [{ th: "งอ", r: "ngɔɔ", m: "bend" }, { th: "นอ", r: "nɔɔ", m: "horn (rhino)" }] },
];

/* Speed ladder (D12): the Ear plays faster as you get better. */
const EAR_LADDER = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2];
const ladderRate = (ear) => EAR_LADDER[Math.max(0, Math.min(EAR_LADDER.length - 1, ear?.ladder ?? 1))];
/** Pass 85% and the next session is one step faster; drop below 60% and it slows down. */
function climbLadder(ear, right, total) {
  const cur = ear.ladder ?? 1;
  if (!total) return cur;
  const acc = right / total;
  return Math.max(0, Math.min(EAR_LADDER.length - 1, cur + (acc >= 0.85 ? 1 : acc < 0.6 ? -1 : 0)));
}
function earVoice(audio, ear) {
  const vs = audio.thaiVoices();
  if (!vs.length || ear?.varyVoices === false) return vs[0];
  return vs[Math.floor(Math.random() * vs.length)];
}

/* Tones in phrases (D14): three to five words from a slicer line, one target syllable. */
function phraseTrials() {
  const out = [];
  SENTENCES.filter((s) => s.script === "th").forEach((s) => s.words.forEach((w, i) => {
    if (w.tone?.length !== 1 || [...w.w].length < 2) return;
    const a = Math.max(0, i - 2);
    const win = s.words.slice(a, Math.min(s.words.length, a + 5));
    if (win.length < 3) return;
    out.push({ key: `${s.id}:${i}`, words: win, target: i - a, tone: w.tone[0], gloss: s.gloss });
  }));
  return out;
}
const stripTone = (r) => (r || "").normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");

function EarDeckPicker({ deck, setDeck }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {EAR_DECKS.map((d) => (
        <button key={d.id} data-ear-deck={d.id} onClick={() => setDeck(d.id)} className={`rounded-2xl border px-3 py-2 text-left transition ${deck === d.id ? "border-amber-400 bg-amber-400/10" : "border-white/10 hover:bg-white/5"}`}>
          <div className="text-sm font-bold text-white">{d.label}</div>
          <div className="text-[11px] text-slate-400">{d.sub}</div>
        </button>
      ))}
    </div>
  );
}

function SpeedNote({ ear, setEar }) {
  const audio = getAudio();
  const n = audio.thaiVoices().length;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
      <span className="rounded-full bg-white/[0.06] px-2.5 py-1">Speed {ladderRate(ear)}× · climbs at 85%</span>
      {n > 1 && (
        <button onClick={() => setEar((e) => ({ ...e, varyVoices: e.varyVoices === false }))} className="rounded-full bg-white/[0.06] px-2.5 py-1">
          {ear.varyVoices === false ? "One voice" : `Rotating ${n} voices`}
        </button>
      )}
      {n <= 1 && <span>One Thai voice on this phone. Recordings in the Voice Bank add real ones.</span>}
    </div>
  );
}

/** Shared runner for the Sound Dojo and tones-in-phrases decks. */
function EarExtraDeck({ deck, ear, setEar, logActivity }) {
  const audio = getAudio();
  const [run, setRun] = useState(null); // { n, right, trial, pick, voice, rate }
  const make = () => {
    if (deck === "sounds") {
      const weights = SOUND_SETS.map((s) => { const [r, n] = ear.sounds?.[s.id] || [0, 0]; return 1 + (n ? (1 - r / n) * 3 : 1); });
      let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
      const set = SOUND_SETS.find((_, k) => (roll -= weights[k]) <= 0) || SOUND_SETS[0];
      return { set, word: set.words[Math.floor(Math.random() * set.words.length)] };
    }
    const all = phraseTrials();
    const weights = all.map((p) => { const a = earAccuracy(ear, p.tone); return 1 + (a == null ? 1 : (1 - a) * 3); });
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    return all.find((_, k) => (roll -= weights[k]) <= 0) || all[0];
  };
  const play = (tr, voice, rate) => {
    if (deck === "sounds") audio.speakHumanVoice(tr.word.th, undefined, { voice, rate });
    else audio.speakHumanVoice(tr.words.map((w) => w.tts || w.w).join(""), undefined, { voice, rate });
  };
  const next = (prev) => {
    const trial = make();
    const voice = earVoice(audio, ear);
    const rate = Math.round((ladderRate(ear) + (Math.random() - 0.5) * 0.1) * 100) / 100;
    play(trial, voice, rate);
    setRun({ n: prev ? prev.n + 1 : 0, right: prev ? prev.right : 0, trial, pick: null, voice, rate });
  };
  const answer = (choice) => {
    if (!run || run.pick) return;
    const tr = run.trial;
    const ok = deck === "sounds" ? choice === tr.word.th : choice === tr.tone;
    haptic(ok ? "ok" : "miss");
    setRun({ ...run, pick: choice, right: run.right + (ok ? 1 : 0) });
    logActivity?.({ ear: 1 });
    if (deck === "sounds") {
      logReview(tr.set.id, "sound", ok ? 3 : 1);
      setEar((e) => { const cur = e.sounds?.[tr.set.id] || [0, 0]; const conf = { ...(e.soundConf || {}) }; if (!ok) conf[`${tr.word.th}>${choice}`] = (conf[`${tr.word.th}>${choice}`] || 0) + 1; return { ...e, sounds: { ...(e.sounds || {}), [tr.set.id]: [cur[0] + (ok ? 1 : 0), cur[1] + 1] }, soundConf: conf }; });
      if (!ok) audio.speakSequence([{ th: choice, voice: run.voice, rate: run.rate }, { th: tr.word.th, voice: run.voice, rate: run.rate }], 600);
    } else {
      logReview(`${tr.tone}>${choice}`, "ear", ok ? 3 : 1);
      setEar((e) => {
        const tones = { ...e.tones, [tr.tone]: [e.tones[tr.tone][0] + (ok ? 1 : 0), e.tones[tr.tone][1] + 1] };
        const confusions = { ...e.confusions };
        if (!ok) confusions[`${tr.tone}>${choice}`] = (confusions[`${tr.tone}>${choice}`] || 0) + 1;
        const ph = e.phrase || [0, 0];
        return { ...e, tones, confusions, phrase: [ph[0] + (ok ? 1 : 0), ph[1] + 1] };
      });
      if (ok) audio.playRanatToneChime([tr.tone]);
    }
  };
  const advance = () => {
    if (run.n + 1 >= EAR_TRIALS) {
      setEar((e) => ({ ...e, ladder: climbLadder(e, run.right, EAR_TRIALS), sessions: (e.sessions || 0) + 1 }));
      setRun({ ...run, done: true });
      return;
    }
    next(run);
  };
  if (!run || run.done) {
    const kinds = Object.entries(SOUND_KINDS).map(([k, label]) => {
      const sets = SOUND_SETS.filter((s) => s.kind === k).map((s) => ear.sounds?.[s.id] || [0, 0]);
      const r = sets.reduce((a, x) => a + x[0], 0);
      const n = sets.reduce((a, x) => a + x[1], 0);
      return { k, label, acc: n ? r / n : null, n };
    });
    return (
      <Card className="p-5" glow={TONES.rising.color}>
        <h3 className="text-lg font-bold text-white">{run?.done ? `Session done: ${run.right} / ${EAR_TRIALS}` : deck === "sounds" ? "Hear the sounds that change meaning" : "Hear tones in running speech"}</h3>
        <p className="mt-1 max-w-prose text-sm text-slate-300">
          {deck === "sounds" ? "Each set keeps the tone the same and changes one thing: a puff of air, the vowel's length, a hidden final, or ง at the start. Pick the word you heard." : "A few words from a real line play at speaking speed. Name the tone of the highlighted syllable. Tones are shorter and flatter here than said alone."}
        </p>
        {deck === "sounds" && (
          <div className="mt-3 space-y-1.5 text-sm">
            {kinds.map((x) => <div key={x.k} className="flex justify-between text-slate-300"><span>{x.label}</span><span className="tabular-nums text-slate-400">{x.acc == null ? "–" : `${Math.round(x.acc * 100)}% /${x.n}`}</span></div>)}
          </div>
        )}
        {deck === "phrases" && ear.phrase && <p className="mt-2 text-sm text-slate-400">In phrases so far: {Math.round((ear.phrase[0] / Math.max(1, ear.phrase[1])) * 100)}% of {ear.phrase[1]}.</p>}
        <SpeedNote ear={ear} setEar={setEar} />
        <button onClick={() => next(null)} className="mt-4 w-full rounded-2xl bg-amber-500 py-3 font-bold text-black">Start 20 trials</button>
      </Card>
    );
  }
  const tr = run.trial;
  return (
    <Card className="mx-auto max-w-xl p-5" glow={TONES.rising.color}>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{deck === "sounds" ? SOUND_KINDS[tr.set.kind] : "Tones in phrases"}</span>
        <span className="tabular-nums">{run.n + 1} / {EAR_TRIALS}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400" style={{ width: `${(run.n / EAR_TRIALS) * 100}%` }} /></div>
      <div className="my-5 flex flex-col items-center gap-3">
        <button onClick={() => play(tr, run.voice, run.rate)} className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500 text-black shadow-[0_0_40px_#F59E0B66] active:scale-95" aria-label="Play again"><Volume2 size={34} /></button>
        <div className="text-xs text-slate-400">{run.rate}×{run.voice ? ` · ${run.voice.name}` : ""}</div>
      </div>
      {deck === "phrases" && (
        <div className="mb-4 text-center text-lg text-slate-200">
          {tr.words.map((w, k) => <span key={k} className={k === tr.target ? "mx-1 rounded-md bg-amber-400/25 px-1.5 font-bold text-amber-100" : "mx-1"}>{k === tr.target && !run.pick ? stripTone(w.r) : run.pick ? R(w.r) : stripTone(w.r)}</span>)}
          {run.pick && <div className="mt-1 text-2xl text-white" style={{ fontFamily: FONT_STACKS.loop.th }}>{tr.words.map((w) => w.w).join("")}</div>}
          {run.pick && <div className="text-xs text-slate-400">{tr.gloss}</div>}
        </div>
      )}
      {deck === "sounds" ? (
        <div className={`grid gap-2 ${tr.set.words.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {tr.set.words.map((w) => {
            const state = !run.pick ? "idle" : w.th === tr.word.th ? "right" : w.th === run.pick ? "wrong" : "idle";
            return (
              <button key={w.th} data-sound={w.th} disabled={!!run.pick} onClick={() => answer(w.th)} className={`rounded-2xl border p-2 text-center ${state === "right" ? "border-emerald-400 bg-emerald-500/15" : state === "wrong" ? "border-rose-400 bg-rose-500/15" : "border-white/10 bg-white/[0.03]"}`}>
                <div className="text-3xl leading-[1.5] text-white" style={{ fontFamily: FONT_STACKS.loop.th }}>{w.th}</div>
                <div className="text-xs text-slate-300">{R(w.r)}</div>
                <div className="text-[11px] text-slate-400">{w.m}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <ToneChoice key={tr.key + run.n} onPick={answer} picked={run.pick} correct={run.pick ? tr.tone : null} disabled={!!run.pick} options={TONE_ORDER} />
      )}
      {run.pick && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.04] p-3 text-sm">
          <span className={(deck === "sounds" ? run.pick === tr.word.th : run.pick === tr.tone) ? "font-semibold text-emerald-300" : "text-rose-200"}>
            {deck === "sounds" ? (run.pick === tr.word.th ? "Correct." : `It was ${tr.word.th} (${tr.word.r}). You heard your pick, then the right one.`) : run.pick === tr.tone ? "Correct." : `That syllable is ${TONES[tr.tone].name}.`}
          </span>
          <button onClick={advance} className="ml-auto rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black">Next</button>
        </div>
      )}
    </Card>
  );
}

const EAR_TRIALS = 20;

const emptyEar = () => ({ tones: Object.fromEntries(TONE_ORDER.map((t) => [t, [0, 0]])), confusions: {}, sessions: 0, lao: {} });

function earAccuracy(ear, tone) {
  const [r, n] = ear.tones[tone] || [0, 0];
  return n ? r / n : null;
}

/** Pick the next trial, favouring tones and confusions the learner gets wrong. */
function pickEarTrial(ear, prevKey, deck = "single") {
  const options = [];
  if (deck === "words") {
    EAR_WORD_SETS.forEach((set) => set.words.forEach((w) => {
      const accs = w.tones.map((t) => earAccuracy(ear, t));
      const weight = 1 + accs.reduce((n, a) => n + (a == null ? 0.5 : (1 - a) * 1.5), 0);
      const key = `${set.id}:${w.th}`;
      if (key !== prevKey) options.push({ set, word: w, key, weight });
    }));
  } else if (deck === "lao") {
    EAR_LAO_SETS.forEach((set) => set.words.forEach((w) => {
      const [r, n] = ear.lao?.[set.id] || [0, 0];
      const weight = 1 + (n ? (1 - r / n) * 3 : 1);
      const key = `${set.id}:${w.lo}`;
      if (key !== prevKey) options.push({ set, word: w, key, weight });
    }));
  }
  if (deck === "single") EAR_SETS.forEach((set) => set.words.forEach((w) => {
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
  const [deck, setDeck] = useState("single");
  const [sylPicks, setSylPicks] = useState([]);
  const voices = audio.thaiVoices();
  const laoVoice = audio.laoVoice();
  const isLao = deck === "lao";
  const isWords = deck === "words";

  const say = (w, voice, rate) => (w.lo ? audio.speakHumanVoice(w.lo, w.lo, { rate }) : audio.speakHumanVoice(w.th, undefined, { voice, rate }));
  const playTrial = (t) => {
    const voice = earVoice(audio, ear);
    const rate = Math.round((ladderRate(ear) + (Math.random() - 0.5) * 0.1) * 100) / 100;
    say(t.word, voice, rate);
    return { voice, rate };
  };

  const nextTrial = (prevKey) => {
    setSylPicks([]);
    const t = pickEarTrial(ear, prevKey, deck);
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

  // Two-syllable words: collect one tone per syllable, then score the word as a whole.
  const answerSyllable = (tone) => {
    if (pick || !trial) return;
    const picks = [...sylPicks, tone];
    setSylPicks(picks);
    if (picks.length < trial.word.tones.length) return;
    const ok = picks.every((p, i) => p === trial.word.tones[i]);
    setPick(ok ? "right" : "wrong");
    setSession((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    logActivity({ ear: 1 });
    setEar((prev) => {
      const tones = { ...prev.tones };
      const confusions = { ...prev.confusions };
      trial.word.tones.forEach((t, i) => {
        const hit = picks[i] === t;
        tones[t] = [tones[t][0] + (hit ? 1 : 0), tones[t][1] + 1];
        if (!hit) confusions[`${t}>${picks[i]}`] = (confusions[`${t}>${picks[i]}`] || 0) + 1;
        logReview(`${t}>${picks[i]}`, "ear", hit ? 3 : 1);
      });
      return { ...prev, tones, confusions };
    });
    if (ok) audio.playRanatToneChime(trial.word.tones);
    else say(trial.word, trial.voice, trial.rate);
  };

  const answerLao = (w) => {
    if (pick || !trial) return;
    const ok = w.lo === trial.word.lo;
    setPick(w.lo);
    setSession((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    logActivity({ ear: 1 });
    setEar((prev) => {
      const cur = prev.lao?.[trial.set.id] || [0, 0];
      return { ...prev, lao: { ...(prev.lao || {}), [trial.set.id]: [cur[0] + (ok ? 1 : 0), cur[1] + 1] } };
    });
    if (!ok) audio.speakSequence([{ th: w.lo, lo: w.lo, rate: trial.rate }, { th: trial.word.lo, lo: trial.word.lo, rate: trial.rate }], 600);
    else haptic("ok");
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
      logReview(`${trial.word.tone}>${tone}`, "ear", ok ? 3 : 1);
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
      setEar((prev) => ({ ...prev, sessions: (prev.sessions || 0) + 1, ladder: climbLadder(prev, session.right, session.total) }));
      return;
    }
    nextTrial(trial.key);
  };

  const topConfusions = Object.entries(ear.confusions).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const setTones = trial && !isWords && !isLao ? TONE_ORDER.filter((t) => trial.set.words.some((w) => w.tone === t)) : TONE_ORDER;
  const chosenWord = trial && pick && !isWords && !isLao ? trial.set.words.find((w) => w.tone === pick) : null;
  const laoBlocked = isLao && !laoVoice;
  const laoSetStats = EAR_LAO_SETS.map((set) => ({ set, stat: ear.lao?.[set.id] || [0, 0] }));

  if (deck === "sounds" || deck === "phrases") {
    return (
      <div className="space-y-4">
        <SectionTitle icon={Ear} title="Tone Ear Dojo" sub="Hear a syllable, pick its contour. Many speeds and voices, minimal sets, instant feedback." color={TONES.rising.ink} />
        <EarDeckPicker deck={deck} setDeck={(d) => { setDeck(d); setSession({ right: 0, total: 0 }); }} />
        <EarExtraDeck key={deck} deck={deck} ear={ear} setEar={setEar} logActivity={logActivity} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <SectionTitle icon={Ear} title="Tone Ear Dojo" sub="Hear a syllable, pick its contour. Many speeds and voices, minimal sets, instant feedback." color={TONES.rising.ink} />
      {!running ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card className="p-5" glow={TONES.rising.color}>
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {EAR_DECKS.map((d) => (
                <button key={d.id} data-ear-deck={d.id} onClick={() => { setDeck(d.id); setSession({ right: 0, total: 0 }); }} className={`rounded-2xl border px-3 py-2 text-left transition ${deck === d.id ? "border-amber-400 bg-amber-400/10" : "border-white/10 hover:bg-white/5"}`}>
                  <div className="text-sm font-bold text-white">{d.label}</div>
                  <div className="text-[11px] text-slate-400">{d.sub}</div>
                </button>
              ))}
            </div>
            <h3 className="text-lg font-bold text-white">{session.total ? `Session done: ${session.right} / ${session.total}` : isWords ? "Hear tones in running words" : isLao ? "Hear Vientiane tones" : "Train your ear on minimal sets"}</h3>
            {!isLao && <SpeedNote ear={ear} setEar={setEar} />}
            {isWords && (
              <p className="mt-1 max-w-prose text-sm text-slate-300">
                Each trial plays a two-syllable word such as <span style={{ fontFamily: FONT_STACKS.loop.th }}>ข้าวผัด</span>. Pick the tone of the first syllable, then the second. The word stays hidden until you finish, and both answers feed your per-tone scores below.
              </p>
            )}
            {isLao && (
              <p className="mt-1 max-w-prose text-sm text-slate-300">
                Each trial plays one Lao word from a set like <span style={{ fontFamily: FONT_STACKS.loop.lo }}>ມາ · ມ້າ · ໝາ</span>. Pick the spelling you heard. Vientiane tones are not the Bangkok ones, so this deck needs a Lao voice; it never falls back to Thai.
                <span className="mt-2 block text-xs text-slate-400">{laoVoice ? `Lao voice: ${laoVoice.name}.` : "No Lao voice on this device. Lao voices are rare on phones; Microsoft Edge on a computer usually offers one. Until then this deck stays locked."}</span>
              </p>
            )}
            <p className={`mt-1 max-w-prose text-sm text-slate-300 ${isWords || isLao ? "hidden" : ""}`}>
              Each trial plays one word from a set like <span style={{ fontFamily: FONT_STACKS.loop.th }}>มา · ม้า · หมา</span> with a random speed{voices.length > 1 ? " and voice" : ""}. The word stays hidden until you answer, so you train your ear, not your reading. If you miss, you hear your choice and then the right answer, back to back.
            </p>
            <p className={`mt-3 text-xs text-slate-400 ${isLao ? "hidden" : ""}`}>
              {voices.length ? `${voices.length} Thai voice${voices.length > 1 ? "s" : ""} on this device.` : (IS_ANDROID ? `No Thai voice found. ${ANDROID_VOICE_HINT}` : "No Thai voice found on this device. Install one in your text-to-speech settings first.")}{" "}
              Device voices sometimes blur tones; recorded native audio is planned.
            </p>
            <button data-ear-start onClick={start} disabled={laoBlocked} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 font-bold text-black active:scale-[0.98] disabled:opacity-40">
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
            {laoSetStats.some(({ stat }) => stat[1]) && (
              <div className="mt-4 text-xs text-slate-300">
                <div className="mb-1 font-bold uppercase tracking-wider text-slate-400">Lao sets</div>
                {laoSetStats.filter(({ stat }) => stat[1]).map(({ set, stat }) => (
                  <div key={set.id} className="flex justify-between"><span style={{ fontFamily: FONT_STACKS.loop.lo }}>{set.label}</span><span className="tabular-nums">{Math.round((stat[0] / stat[1]) * 100)}% /{stat[1]}</span></div>
                ))}
              </div>
            )}
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
            <span>{trial?.set.label && <span style={isWords ? undefined : { fontFamily: FONT_STACKS.loop[isLao ? "lo" : "th"] }}>{trial.set.label}</span>}</span>
            <span className="tabular-nums">{count + 1} / {EAR_TRIALS}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / EAR_TRIALS) * 100}%` }} /></div>
          <div className="my-6 flex flex-col items-center gap-3">
            <button onClick={() => trial && say(trial.word, trial.voice, trial.rate)} className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-500 text-black shadow-[0_0_40px_#F59E0B66] active:scale-95" aria-label="Play the syllable again">
              <Volume2 size={40} />
            </button>
            <div className="text-xs text-slate-400">{pick ? "" : isLao ? "Tap to hear it again. Which word?" : isWords ? `Tap to hear it again. Syllable ${Math.min(sylPicks.length + 1, trial?.word.tones?.length || 2)} of ${trial?.word.tones?.length || 2}: which contour?` : "Tap to hear it again. Which contour?"}{trial ? ` · ${trial.rate}×` : ""}</div>
          </div>
          {isWords && trial && (
            <div className="mb-3 flex justify-center gap-2">
              {trial.word.tones.map((t, i) => {
                const p = sylPicks[i];
                const state = !pick ? (i === sylPicks.length ? "now" : p ? "set" : "wait") : p === t ? "right" : "wrong";
                return (
                  <span key={i} data-ear-syl={state} className={`flex min-w-[88px] items-center justify-center gap-1 rounded-xl border px-2 py-1 text-xs ${state === "now" ? "border-amber-400 text-amber-200" : state === "right" ? "border-emerald-400 text-emerald-200" : state === "wrong" ? "border-rose-400 text-rose-200" : "border-white/10 text-slate-400"}`}>
                    {i + 1}. {p ? TONES[p].name : "?"}
                  </span>
                );
              })}
            </div>
          )}
          {isWords && trial && <ToneChoice key={`${trial.key}-${sylPicks.length}`} onPick={answerSyllable} picked={null} correct={null} disabled={!!pick} options={TONE_ORDER} />}
          {isLao && trial && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {trial.set.words.map((w, i) => {
                const state = !pick ? "idle" : w.lo === trial.word.lo ? "right" : w.lo === pick ? "wrong" : "idle";
                return (
                  <button key={w.lo} data-ear-lao={i} disabled={!!pick} onClick={() => answerLao(w)} className={`rounded-2xl border p-2 text-center transition active:scale-95 ${state === "right" ? "border-emerald-400 bg-emerald-500/15" : state === "wrong" ? "border-rose-400 bg-rose-500/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"}`}>
                    <div className="text-3xl leading-[1.5] text-white" style={{ fontFamily: FONT_STACKS.loop.lo }}>{w.lo}</div>
                    <div className="text-[11px] text-slate-400">{w.m}</div>
                    {pick && laoSyllable(w.lo) && <div className="mt-1"><ToneBadge tone={laoSyllable(w.lo).tone} small /></div>}
                  </button>
                );
              })}
            </div>
          )}
          {!isWords && !isLao && <ToneChoice onPick={answer} picked={pick} correct={pick ? trial.word.tone : null} disabled={!!pick} options={setTones} />}
          {pick && isWords && (
            <div className="mt-4 space-y-2 rounded-2xl bg-white/[0.04] p-3 text-sm">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-4xl leading-[1.5] text-white" style={{ fontFamily: FONT_STACKS.loop.th }}>{trial.word.th}</span>
                <span className="text-slate-200">{trial.word.r} · {trial.word.m}</span>
                <span className="flex gap-1">{trial.word.tones.map((t, i) => <ToneBadge key={i} tone={t} small />)}</span>
              </div>
              <p className={pick === "right" ? "font-semibold text-emerald-300" : "text-rose-200"}>
                {pick === "right" ? "Both syllables right." : `Missed: ${trial.word.tones.map((t, i) => (sylPicks[i] === t ? null : `syllable ${i + 1} is ${TONES[t].name}, not ${TONES[sylPicks[i]].name}`)).filter(Boolean).join("; ")}. You just heard it again.`}
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => audio.playRanatToneChime(trial.word.tones)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5"><Music size={13} className="mr-1 inline" />Hear the contours</button>
                <button onClick={() => say(trial.word, trial.voice, trial.rate)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5"><Volume2 size={13} className="mr-1 inline" />Hear the word</button>
                <button onClick={advance} className="ml-auto rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black">Next</button>
              </div>
            </div>
          )}
          {pick && isLao && (
            <div className="mt-4 space-y-2 rounded-2xl bg-white/[0.04] p-3 text-sm">
              <p className={pick === trial.word.lo ? "font-semibold text-emerald-300" : "text-rose-200"}>
                {pick === trial.word.lo ? "Correct." : <>You heard <span style={{ fontFamily: FONT_STACKS.loop.lo }}>{trial.word.lo}</span> ({trial.word.m}). You just heard your pick, then the right one.</>}
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => audio.speakSequence(trial.set.words.map((w) => ({ th: w.lo, lo: w.lo, rate: trial.rate })), 500)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5"><Volume2 size={13} className="mr-1 inline" />Hear the whole set</button>
                <button onClick={advance} className="ml-auto rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black">Next</button>
              </div>
            </div>
          )}
          {pick && !isWords && !isLao && (
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
const TRACE_FONTS = { th: FONT_STACKS.loop.th, lo: FONT_STACKS.loop.lo };
const TRACE_FONT = TRACE_FONTS.th;
const TRACE_FONT_FACE = { th: "Noto Serif Thai", lo: "Noto Serif Lao" };

// Hand-written stroke notes, with start points measured by hand for Noto Serif Thai.
const TRACE_NOTES = {
  ก: { start: [150, 148], path: "Loopless. Begin at the beak on the upper left, arch over the roof, drop the right leg." },
  ข: { start: [126, 140], path: "Head loop top-left. Drop the left wall, round the floor, climb the right wall." },
  ด: { start: [156, 180], path: "Loop inside the bowl. Run down-left to the foot, climb the left wall, arch over, come down the right." },
  ต: { start: [159, 172], path: "Same as ด, but dip into a notch in the middle of the roof." },
  ค: { start: [150, 168], path: "Loop hangs inside the straight left wall. Start at the loop and follow the body round to the right foot." },
  ผ: { start: [131, 126], path: "Head loop top-left. Down, up to a LOW inner peak, down, then up the right wall." },
  พ: { start: [111, 126], path: "Head loop top-left. Down, up to a FULL-HEIGHT inner peak, down, then up the right wall." },
  น: { start: [114, 126], path: "Head loop top-left. Down the left wall, up the diagonal, finish in a curled tail at the bottom-right." },
};

/** Every single-letter glyph item becomes a trace target, in the script the learner studies. */
function traceTargets(mode) {
  const script = mode === "lo" ? "lo" : "th";
  const seen = new Set();
  const out = [];
  courseItems(mode).forEach((it) => {
    const g = it[script];
    if (it.tier !== "glyph" || [...g].length !== 1 || seen.has(g)) return;
    seen.add(g);
    const roman = script === "lo" ? it.loRoman : it.thRoman;
    out.push({ id: it.id, g, script, level: it.level, cls: it.cls, name: roman.split("·").pop().trim(), meaning: it.meaning, note: script === "th" ? TRACE_NOTES[g] : null, tts: script === "lo" ? [it.ttsLo || it.ttsTh, it.lo] : [it.ttsTh] });
  });
  return out;
}

const fmtDue = (t) => {
  const d = Math.round((t - Date.now()) / DAY);
  return d <= 0 ? "now" : d === 1 ? "tomorrow" : `in ${d} days`;
};
const writeDueAt = (w) => (w ? w.last + fsrsInterval(w.S) * DAY : 0);
/** Started glyphs whose write track is due, or that have never been traced cleanly. */
function writeDue(srs, mode, now = Date.now()) {
  return traceTargets(mode).filter((t) => srs[t.id] && writeDueAt(srs[t.id].write) <= now);
}

function renderGlyphMask(g, script, extraStroke = 0, px = TRACE_FONT_PX, base = TRACE_BASELINE) {
  const S = TRACE_SIZE;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.font = `${px}px ${TRACE_FONTS[script]}`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#000";
  if (extraStroke) {
    ctx.lineWidth = extraStroke;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.strokeText(g, S / 2, base);
  }
  ctx.fillText(g, S / 2, base);
  return ctx;
}

const headStartCache = new Map();
/**
 * Find the head loop: the small closed counters of the rendered glyph. Flood the background
 * in from the edges; whatever blank area stays unreached is enclosed by ink. The topmost-left
 * small counter is the head (big counters like ๐ or the bowl of บ are not heads).
 */
function detectHeadStart(g, script) {
  const key = `${script}:${g}`;
  if (headStartCache.has(key)) return headStartCache.get(key);
  const S = TRACE_SIZE;
  const A = renderGlyphMask(g, script).getImageData(0, 0, S, S).data;
  const ink = new Uint8Array(S * S);
  for (let i = 0; i < S * S; i += 1) ink[i] = A[i * 4 + 3] > 90 ? 1 : 0;
  const label = new Int32Array(S * S);
  const flood = (seed, id) => {
    const stack = [seed];
    label[seed] = id;
    let n = 0; let sx = 0; let sy = 0;
    while (stack.length) {
      const p = stack.pop();
      n += 1; sx += p % S; sy += (p / S) | 0;
      const x = p % S;
      const nb = [p - S, p + S, x > 0 ? p - 1 : -1, x < S - 1 ? p + 1 : -1];
      nb.forEach((q) => {
        if (q >= 0 && q < S * S && !ink[q] && !label[q]) { label[q] = id; stack.push(q); }
      });
    }
    return { n, cx: sx / n, cy: sy / n };
  };
  for (let i = 0; i < S; i += 1) {
    [i, (S - 1) * S + i, i * S, i * S + S - 1].forEach((p) => { if (!ink[p] && !label[p]) flood(p, 1); });
  }
  const holes = [];
  let id = 2;
  for (let p = 0; p < S * S; p += 1) {
    if (!ink[p] && !label[p]) {
      const h = flood(p, id);
      id += 1;
      // Curls up on an ascender (ฬ) are not where the pen starts.
      if (h.n >= 30 && h.n <= 1800 && h.cy > 105) holes.push(h);
    }
  }
  holes.sort((a, b) => (a.cy + a.cx * 0.35) - (b.cy + b.cx * 0.35));
  const start = holes.length ? [Math.round(holes[0].cx), Math.round(holes[0].cy)] : null;
  headStartCache.set(key, start);
  return start;
}

/**
 * Ink distance field: how far along the ink each pixel is from the pen's start,
 * walking only through ink (8-neighbour steps). Parts the walk can't reach, like
 * a separate tail, continue from their top-left pixel after a short lift. It
 * drives the ghost hand (D17) and the head-loop colouring in glyph anatomy (V4).
 */
const fieldCache = new Map();
function glyphField(g, script, start, size = TRACE_FONT_PX, base = TRACE_BASELINE) {
  const key = `${script}:${g}:${size}:${base}:${start ? start.join(",") : "-"}`;
  if (fieldCache.has(key)) return fieldCache.get(key);
  const S = TRACE_SIZE;
  const A = renderGlyphMask(g, script, 0, size, base).getImageData(0, 0, S, S).data;
  const ink = new Uint8Array(S * S);
  let count = 0;
  for (let i = 0; i < S * S; i += 1) if (A[i * 4 + 3] > 90) { ink[i] = 1; count += 1; }
  const dist = new Float32Array(S * S).fill(-1);
  if (!count) return null;
  // Nearest ink pixel to the start (the start sits inside the head loop's counter).
  let seed = -1;
  if (start) {
    let best = Infinity;
    for (let p = 0; p < S * S; p += 1) if (ink[p]) { const d = (p % S - start[0]) ** 2 + (((p / S) | 0) - start[1]) ** 2; if (d < best) { best = d; seed = p; } }
  }
  const topLeft = () => { let b = -1; let bv = Infinity; for (let p = 0; p < S * S; p += 1) if (ink[p] && dist[p] < 0) { const v = ((p / S) | 0) + (p % S) * 0.6; if (v < bv) { bv = v; b = p; } } return b; };
  if (seed < 0) seed = topLeft();
  let offset = 0;
  let max = 0;
  const steps = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (seed >= 0) {
    // Dial's buckets on rounded distances keep this a fast Dijkstra.
    const buckets = [[seed]];
    dist[seed] = offset;
    for (let b = 0; b < buckets.length; b += 1) {
      const list = buckets[b];
      if (!list) continue;
      for (let k = 0; k < list.length; k += 1) {
        const p = list[k];
        const d = dist[p];
        const x = p % S; const y = (p / S) | 0;
        for (const [dx, dy, w] of steps) {
          const nx = x + dx; const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
          const q = ny * S + nx;
          if (!ink[q]) continue;
          const nd = d + w;
          if (dist[q] >= 0 && dist[q] <= nd) continue;
          dist[q] = nd;
          const bi = Math.round(nd - offset);
          (buckets[bi] || (buckets[bi] = [])).push(q);
          if (nd > max) max = nd;
        }
      }
    }
    offset = max + 24;
    seed = topLeft();
  }
  // Head size: the blank counter around the start, as a radius.
  let headR = 0;
  if (start) {
    const sp = start[1] * S + start[0];
    if (!ink[sp]) {
      const seen = new Uint8Array(S * S); const st = [sp]; seen[sp] = 1; let n = 0;
      while (st.length && n < 2500) { const p = st.pop(); n += 1; const x = p % S; [p - S, p + S, x > 0 ? p - 1 : -1, x < S - 1 ? p + 1 : -1].forEach((q) => { if (q >= 0 && q < S * S && !ink[q] && !seen[q]) { seen[q] = 1; st.push(q); } }); }
      if (n < 2500) headR = Math.sqrt(n / Math.PI);
    }
  }
  const order = [];
  for (let p = 0; p < S * S; p += 1) if (dist[p] >= 0) order.push(p);
  order.sort((a, b) => dist[a] - dist[b]);
  const field = { dist, order, max, headR, S };
  fieldCache.set(key, field);
  return field;
}

/** Hand-marked features that tell trap pairs apart (V4), for the Tracer's Noto Serif Thai at 220 px. */
const ANATOMY = {
  ด: { vs: "ต", marks: [[158, 112, 20, "smooth, unbroken roof"]] },
  ต: { vs: "ด", marks: [[160, 116, 20, "notch in the roof"]] },
  ค: { vs: "ด", marks: [[116, 195, 24, "straight left wall; the loop hangs off it"]] },
  ผ: { vs: "พ", marks: [[138, 158, 22, "inner peak stops low"]] },
  พ: { vs: "ผ", marks: [[160, 118, 22, "inner peak climbs to full height"]] },
  ฝ: { vs: "ผ", marks: [[207, 72, 22, "right wall rises above the line"]] },
  ฟ: { vs: "พ", marks: [[212, 70, 22, "right wall rises above the line"]] },
  บ: { vs: "ป", marks: [[205, 114, 18, "right wall stops at the top line"]] },
  ป: { vs: "บ", marks: [[206, 72, 22, "right wall climbs above the line"]] },
  ข: { vs: "ช", marks: [[205, 112, 16, "plain right wall, no flag"]] },
  ช: { vs: "ข", marks: [[205, 106, 18, "flag on the right wall"]] },
  ซ: { vs: "ช", marks: [[124, 106, 18, "extra zigzag on the head"], [205, 106, 16, "flag on the right wall"]] },
  ถ: { vs: "ภ", marks: [[113, 212, 22, "loop sits at the foot"]] },
  ฎ: { vs: "ด", marks: [[150, 262, 26, "smooth tail under the line"]] },
  ฏ: { vs: "ต", marks: [[160, 116, 18, "notch in the roof"], [165, 262, 24, "zigzag tail under the line"]] },
};
const ANATOMY_COLORS = { head: "#F59E0B", body: "#94A3B8", mark: "#E0457B" };

/** The letter with its head loop in gold, its body, and the features that set it apart (V4). */
function GlyphAnatomy({ g, script, size = 220 }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const info = script === "th" ? ANATOMY[g] : null;
  useEffect(() => {
    let live = true;
    (async () => {
      try { await document.fonts?.load(`${TRACE_FONT_PX}px "${TRACE_FONT_FACE[script]}"`, g); } catch { /* fallback font */ }
      if (!live || !ref.current) return;
      const start = (script === "th" && TRACE_NOTES[g]?.start) || detectHeadStart(g, script);
      const f = glyphField(g, script, start);
      const c = ref.current;
      const ctx = c.getContext("2d");
      const img = ctx.createImageData(f.S, f.S);
      const headLen = start ? Math.PI * (f.headR || 12) + 14 : 0;
      const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      const [hc, bc, mc] = [ANATOMY_COLORS.head, ANATOMY_COLORS.body, ANATOMY_COLORS.mark].map(hex);
      f.order.forEach((p) => {
        const x = p % f.S; const y = (p / f.S) | 0;
        const inMark = info?.marks.some(([mx, my, r]) => (x - mx) ** 2 + (y - my) ** 2 <= r * r);
        const col = inMark ? mc : f.dist[p] <= headLen ? hc : bc;
        img.data.set([...col, 255], p * 4);
      });
      ctx.putImageData(img, 0, 0);
      setReady(true);
    })();
    return () => { live = false; };
  }, [g, script]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div data-anatomy className="text-left">
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <canvas ref={ref} width={TRACE_SIZE} height={TRACE_SIZE} className="absolute inset-0 h-full w-full" />
        <svg viewBox={`0 0 ${TRACE_SIZE} ${TRACE_SIZE}`} className="absolute inset-0 h-full w-full">
          <line x1="0" x2={TRACE_SIZE} y1={TRACE_BASELINE} y2={TRACE_BASELINE} stroke="currentColor" strokeOpacity=".15" strokeDasharray="5 5" />
          {ready && info?.marks.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r + 6} fill="none" stroke={ANATOMY_COLORS.mark} strokeWidth="2" strokeDasharray="4 3" />)}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-300">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: ANATOMY_COLORS.head }} />head loop</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: ANATOMY_COLORS.body }} />body</span>
        {info && <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: ANATOMY_COLORS.mark }} />tells it from <span style={{ fontFamily: FONT_STACKS.loop.th }}>{info.vs}</span></span>}
      </div>
      {info && <ul className="mt-1 space-y-0.5 text-center text-xs text-slate-400">{info.marks.map((m, i) => <li key={i}>{m[3]}</li>)}</ul>}
    </div>
  );
}

/** An animated pen that draws the letter from its head loop, then fades for you to follow (D17). */
function GhostHand({ g, script, start, run, onDone }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!run) return undefined;
    let raf = 0; let stopped = false;
    (async () => {
      try { await document.fonts?.load(`${TRACE_FONT_PX}px "${TRACE_FONT_FACE[script]}"`, g); } catch { /* fallback font */ }
      if (stopped || !ref.current) return;
      const f = glyphField(g, script, start);
      const c = ref.current;
      const ctx = c.getContext("2d");
      const img = ctx.createImageData(f.S, f.S);
      const ink = activePalette === "light" ? [217, 119, 6] : [253, 230, 138];
      const total = f.max;
      const dur = reducedMotion() ? 0 : Math.min(3400, Math.max(1600, total * 6));
      const t0 = performance.now();
      let painted = 0;
      let lead = f.order[0];
      const frame = (now) => {
        if (stopped) return;
        const reach = dur ? Math.min(1, (now - t0) / dur) * total : total;
        while (painted < f.order.length && f.dist[f.order[painted]] <= reach) { img.data.set([...ink, 235], f.order[painted] * 4); painted += 1; }
        ctx.putImageData(img, 0, 0);
        // The pen follows one branch of the frontier, the one nearest where it was.
        let best = Infinity;
        const lx = lead % f.S; const ly = (lead / f.S) | 0;
        for (let k = painted - 1; k >= 0 && f.dist[f.order[k]] > reach - 6; k -= 1) {
          const p = f.order[k]; const d = (p % f.S - lx) ** 2 + (((p / f.S) | 0) - ly) ** 2;
          if (d < best) { best = d; lead = p; }
        }
        const px = lead % f.S; const py = (lead / f.S) | 0;
        ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fillStyle = "#F59E0B"; ctx.shadowColor = "#F59E0B"; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
        if (reach < total) raf = requestAnimationFrame(frame);
        else setTimeout(() => { if (!stopped) { ctx.clearRect(0, 0, f.S, f.S); onDone?.(); } }, 900);
      };
      raf = requestAnimationFrame(frame);
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); if (ref.current) ref.current.getContext("2d").clearRect(0, 0, TRACE_SIZE, TRACE_SIZE); };
  }, [run, g, script]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} data-ghost={run ? "on" : "off"} width={TRACE_SIZE} height={TRACE_SIZE} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

const WRITE_MODES = [
  { id: "trace", label: "Trace", icon: PenTool },
  { id: "memory", label: "From memory", icon: EyeOff },
  { id: "syllable", label: "Syllables", icon: Layers },
  { id: "keys", label: "Keyboard", icon: Keyboard },
];
// Four-line guide for syllables (N9): tone line, upper-vowel line, letter top, baseline, lower-vowel line.
const SYL_PX = 150;
const SYL_BASE = 212;
const SYL_LINES = { tone: 48, upper: 92, top: 130, base: SYL_BASE, lower: 250 };
const SYL_ZONES = [["above", 0, 122], ["letters", 122, 220], ["below", 220, TRACE_SIZE]];

/** Single-syllable course words to write whole on the four-line guide, marks included. */
function syllableTargets(mode) {
  const script = mode === "lo" ? "lo" : "th";
  const seen = new Set();
  return courseItems(mode).filter((it) => {
    const g = it[script];
    if (!g || it.tier === "glyph" || it.tone.length !== 1 || /\s/.test(g) || [...g].length > 5 || seen.has(g)) return false;
    seen.add(g);
    return true;
  }).map((it) => ({ id: it.id, g: it[script], script, level: it.level, name: script === "lo" ? it.loRoman : R(it.thRoman), meaning: it.meaning, px: SYL_PX, base: SYL_BASE, tts: script === "lo" ? [it.ttsLo || it.ttsTh, it.lo] : [it.ttsTh] }));
}

function Tracer({ mode = "dual", srs = {}, setSrs, logActivity, kb, setKb }) {
  useWakeLock(true);
  const [practice, setPractice] = useState("trace");
  const letters = useMemo(() => traceTargets(mode), [mode]);
  const syllables = useMemo(() => syllableTargets(mode), [mode]);
  const targets = practice === "syllable" ? syllables : letters;
  const memory = practice === "memory" || practice === "syllable";
  const [peek, setPeek] = useState(false);
  const [ghost, setGhost] = useState(false);
  // Open on the first letter due to write, so the Today Path lands on real work.
  const [sel, setSel] = useState(() => Math.max(0, targets.findIndex((t) => srs[t.id] && writeDueAt(srs[t.id].write) <= Date.now())));
  const [result, setResult] = useState(null);
  const [auto, setAuto] = useState({});
  const canvasRef = useRef(null);
  const strokes = useRef([]);
  const drawing = useRef(false);
  const activePointer = useRef(null);
  const penSeen = useRef(false);
  const glyph = targets[Math.min(sel, targets.length - 1)] || letters[0];
  const px = glyph.px || TRACE_FONT_PX;
  const base = glyph.base || TRACE_BASELINE;
  const font = TRACE_FONTS[glyph.script];
  const key = `${glyph.script}:${glyph.g}`;
  const start = glyph.px ? null : glyph.note?.start || auto[key] || null;
  const showTemplate = !memory || peek || !!result;
  const now = Date.now();
  const due = targets.filter((t) => srs[t.id] && writeDueAt(srs[t.id].write) <= now);

  useEffect(() => {
    if (glyph.px || glyph.note || key in auto) return undefined;
    let live = true;
    (async () => {
      try { await document.fonts?.load(`${TRACE_FONT_PX}px "${TRACE_FONT_FACE[glyph.script]}"`, glyph.g); } catch { /* fallback font */ }
      const s = detectHeadStart(glyph.g, glyph.script);
      if (live) setAuto((a) => ({ ...a, [key]: s }));
    })();
    return () => { live = false; };
  }, [glyph, key, auto]);

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
    setPeek(false);
    setGhost(false);
  }, []);

  useEffect(() => { clear(); }, [sel, mode, practice, clear]);
  // From memory: hear the letter's name instead of seeing it.
  const sayTarget = useCallback(() => {
    const audio = getAudio();
    const [tts, raw] = glyph.tts || [];
    if (tts) audio.speakHumanVoice(tts, raw);
  }, [glyph]);
  useEffect(() => { if (memory && glyph) { const id = setTimeout(sayTarget, 250); return () => clearTimeout(id); } return undefined; }, [glyph, memory]); // eslint-disable-line react-hooks/exhaustive-deps
  const doPeek = () => { setPeek(true); setTimeout(() => setPeek(false), 1500); peekedRef.current = true; };
  const peekedRef = useRef(false);
  useEffect(() => { peekedRef.current = false; }, [sel, practice]);

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

  // A trace is a write review for a glyph you have started: it moves only its own
  // write track, so a shaky hand never drags the reading schedule back.
  const recordWrite = (score) => {
    const cur = srs[glyph.id];
    if (!cur || !setSrs) return null;
    const g = score >= 70 ? 3 : score >= 50 ? 2 : 1;
    if (!cur.write && g < 3) return null;
    const write = fsrsUpdate(cur.write, g);
    logReview(glyph.id, "write", g);
    setSrs((s) => ({ ...s, [glyph.id]: { ...s[glyph.id], write } }));
    return write;
  };

  const check = async () => {
    if (!strokes.current.length) return;
    try { await document.fonts?.load(`${TRACE_FONT_PX}px "${TRACE_FONT_FACE[glyph.script]}"`, glyph.g); } catch { /* fallback font */ }
    const S = TRACE_SIZE;
    const gctx = renderGlyphMask(glyph.g, glyph.script, 0, px, base);
    const tctx = renderGlyphMask(glyph.g, glyph.script, glyph.px ? 22 : 26, px, base);
    const uc = document.createElement("canvas");
    uc.width = S;
    uc.height = S;
    const uctx = uc.getContext("2d", { willReadFrequently: true });
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
    const zones = SYL_ZONES.map(([name]) => ({ name, tot: 0, hit: 0 }));
    for (let i = 3; i < G.length; i += 4) {
      const g = G[i] > 100; const u = U[i] > 100;
      if (g) {
        gTot += 1; if (u) gHit += 1;
        const y = ((i - 3) / 4 / S) | 0;
        const z = zones[SYL_ZONES.findIndex(([, y0, y1]) => y >= y0 && y < y1)];
        z.tot += 1; if (u) z.hit += 1;
      }
      if (u) { uTot += 1; if (T[i] > 100) uIn += 1; }
    }
    const coverage = gTot ? gHit / gTot : 0;
    const accuracy = uTot ? uIn / uTot : 0;
    const first = strokes.current[0][0];
    const startOk = start ? Math.hypot(first[0] - start[0], first[1] - start[1]) < 34 : null;
    // Starting away from the head loop costs points: the habit is the point of the drill.
    // Writing from memory is the harder rung: a peek makes it practice only.
    const score = Math.round(100 * (0.55 * coverage + 0.45 * accuracy) - (startOk === false ? 10 : 0));
    const write = memory && peekedRef.current ? null : recordWrite(score);
    logActivity?.({ traces: 1 });
    setResult({ coverage, accuracy, score, startOk, write, zones: glyph.px ? zones.filter((z) => z.tot > 40).map((z) => ({ name: z.name, pct: z.hit / z.tot })) : null, peeked: memory && peekedRef.current });
    haptic(score >= 70 ? "ok" : "bad");
    const audio = getAudio();
    audio.playRanatToneChime(score >= 70 ? ["high"] : ["low"]);
  };

  const nextDue = () => {
    const t = due.find((d) => d.id !== glyph.id) || due[0];
    if (t) setSel(targets.indexOf(t));
  };
  // From memory and syllables: the next prompt, due writes first, then anything you have started.
  const nextPrompt = () => {
    const pool = targets.filter((x) => x.id !== glyph.id);
    const dueNow = pool.filter((x) => srs[x.id]?.write && writeDueAt(srs[x.id].write) <= Date.now());
    const started = pool.filter((x) => srs[x.id]);
    const from = dueNow.length ? dueNow : started.length ? started : pool;
    const pick = from[Math.floor(Math.random() * from.length)];
    if (pick) setSel(targets.indexOf(pick));
  };

  const dotFor = (t) => {
    const s = srs[t.id];
    if (!s) return null;
    if (writeDueAt(s.write) <= now) return "#F59E0B";
    return "#34D399";
  };

  const levels = [...new Set(targets.map((t) => t.level))];

  const modeBar = (
    <div className="flex gap-1.5 overflow-x-auto pb-1" data-write-modes>
      {WRITE_MODES.map((m) => (
        <button key={m.id} data-write-mode={m.id} onClick={() => { setPractice(m.id); setSel(0); }} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ${practice === m.id ? "bg-cyan-400/20 text-cyan-200" : "text-slate-400 hover:bg-white/5"}`}>
          <m.icon size={15} />{m.label}
        </button>
      ))}
    </div>
  );
  if (practice === "keys") {
    return (
      <div className="space-y-4">
        {modeBar}
        <KeyboardDojo mode={mode} srs={srs} setSrs={setSrs} kb={kb} setKb={setKb} logActivity={logActivity} />
      </div>
    );
  }
  const titles = {
    trace: ["Head-Loop Tracing Dojo", "Start every letter at its golden head (1), then follow the body. Tap Show me to watch the pen first."],
    memory: ["Memory Writer", "Hear a letter's name and write it with no template. Then the letter appears over your strokes."],
    syllable: ["Syllables on four lines", "Write the whole syllable from memory. Vowels and tone marks must sit in their own zone above or below."],
  }[practice];

  return (
    <div className="space-y-4">
      {modeBar}
      <SectionTitle icon={practice === "trace" ? PenTool : practice === "memory" ? EyeOff : Layers} title={titles[0]} sub={titles[1]} color={COLORS.cyan} />
      {!memory && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#F59E0B" }} /> due to write</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#34D399" }} /> written, not due</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full border border-white/20" /> not started in the Shrine</span>
            {due.length > 0 && (
              <button data-trace-next onClick={nextDue} className="ml-auto rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-semibold text-amber-200">
                Next due ({due.length})
              </button>
            )}
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1 sm:max-h-none">
            {levels.map((lv) => (
              <div key={lv}>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Level {lv}</div>
                <div className="grid grid-cols-7 gap-1.5 sm:flex sm:flex-wrap">
                {targets.filter((t) => t.level === lv).map((t) => {
                  const i = targets.indexOf(t);
                  const dot = dotFor(t);
                  return (
                    <button key={t.id} data-trace-glyph={t.id} onClick={() => setSel(i)} aria-label={t.name} className={`relative h-11 rounded-xl border text-2xl transition sm:w-11 ${t === glyph ? "border-cyan-400 bg-cyan-400/20 text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`} style={{ fontFamily: TRACE_FONTS[t.script] }}>
                      {t.g}
                      {dot && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
                    </button>
                  );
                })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {memory && (
        <Card className="flex items-center gap-3 p-4" data-memory-prompt>
          <button onClick={sayTarget} aria-label="Hear it again" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-black active:scale-95"><Volume2 size={22} /></button>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-white">{glyph.name}</div>
            <div className="text-xs text-slate-400">{glyph.meaning}{practice === "memory" && glyph.cls ? ` · ${CLASSES[glyph.cls]?.name || glyph.cls} class` : ""}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">{srs[glyph.id]?.write ? `Write track: next due ${fmtDue(writeDueAt(srs[glyph.id].write))}.` : srs[glyph.id] ? "A clean write (70+) starts its write schedule." : "Practice only: not started in the Shrine yet."}</div>
          </div>
          <button data-memory-next onClick={nextPrompt} className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200">Next <ChevronRight size={14} className="inline" /></button>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="mx-auto w-full max-w-[360px] p-3" glow={COLORS.cyan}>
          <div className="relative aspect-square w-full touch-none select-none">
            <svg viewBox={`0 0 ${TRACE_SIZE} ${TRACE_SIZE}`} className="absolute inset-0 h-full w-full">
              {!glyph.px && [...Array(9)].map((_, i) => (
                <g key={i} stroke="currentColor" strokeOpacity="0.06">
                  <line x1={i * 40} y1={0} x2={i * 40} y2={TRACE_SIZE} />
                  <line x1={0} y1={i * 40} x2={TRACE_SIZE} y2={i * 40} />
                </g>
              ))}
              {glyph.px ? (
                <g data-four-lines>
                  {[["tone", "4 4"], ["upper", "6 6"], ["top", ""], ["base", ""], ["lower", "6 6"]].map(([k, dash]) => (
                    <line key={k} x1={0} x2={TRACE_SIZE} y1={SYL_LINES[k]} y2={SYL_LINES[k]} stroke="#22D3EE" strokeOpacity={k === "base" || k === "top" ? 0.5 : 0.25} strokeDasharray={dash || undefined} />
                  ))}
                  <text x="6" y={SYL_LINES.tone + 14} fontSize="10" fill="#22D3EE" fillOpacity=".6">tone marks</text>
                  <text x="6" y={SYL_LINES.upper + 14} fontSize="10" fill="#22D3EE" fillOpacity=".6">upper vowels</text>
                  <text x="6" y={SYL_LINES.lower + 14} fontSize="10" fill="#22D3EE" fillOpacity=".6">lower vowels</text>
                </g>
              ) : (
                <line x1={0} x2={TRACE_SIZE} y1={TRACE_BASELINE} y2={TRACE_BASELINE} stroke="#22D3EE33" strokeDasharray="6 6" />
              )}
              {showTemplate && (
                <text data-trace-template x={TRACE_SIZE / 2} y={base} textAnchor="middle" fontSize={px} fill={result && memory ? "#22D3EE18" : "#22D3EE26"} stroke={result && memory ? "#22D3EEcc" : "#22D3EE88"} strokeWidth="1.5" style={{ fontFamily: font }}>{glyph.g}</text>
              )}
              {start && showTemplate && !ghost && (
                <g data-trace-start>
                  <circle cx={start[0]} cy={start[1]} r="16" fill="#F59E0B33" stroke="#F59E0B" strokeWidth="2">
                    <animate attributeName="r" values="13;18;13" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                  <text x={start[0]} y={start[1] + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill="#FDE68A">1</text>
                </g>
              )}
            </svg>
            {practice === "trace" && <GhostHand g={glyph.g} script={glyph.script} start={start} run={ghost} onDone={() => setGhost(false)} />}
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-crosshair touch-none select-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={clear} className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-300 hover:bg-white/5"><Eraser size={15} className="mr-1 inline" />Clear</button>
            {practice === "trace" && <button data-ghost-hand onClick={() => { clear(); setGhost(true); }} disabled={ghost} className="flex-1 rounded-xl border border-amber-400/40 bg-amber-400/10 py-2 text-sm font-semibold text-amber-200 disabled:opacity-50"><Hand size={15} className="mr-1 inline" />Show me</button>}
            {memory && !result && <button data-peek onClick={doPeek} className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-300"><Eye size={15} className="mr-1 inline" />Peek</button>}
            <button data-trace-check onClick={check} className="flex-1 rounded-xl bg-cyan-500 py-2 text-sm font-bold text-black"><Check size={15} className="mr-1 inline" />Check</button>
          </div>
        </Card>
        <div className="space-y-3">
          {!memory && (
            <Card className="p-4">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl text-white" style={{ fontFamily: font }}>{glyph.g}</span>
                <div>
                  <div className="font-semibold text-white">{glyph.name}</div>
                  <div className="text-xs text-slate-400">{glyph.meaning}</div>
                  {glyph.cls && <div className="mt-1"><ClassBadge cls={glyph.cls} small /></div>}
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-300">
                {glyph.note?.path || (start ? "Start inside the head loop at (1), close the loop, then run the body in one stroke." : "No head loop on this one. Start at the top-left of the first stroke and keep the pen down.")}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {srs[glyph.id] ? (srs[glyph.id].write ? `Write track: next due ${fmtDue(writeDueAt(srs[glyph.id].write))}.` : "Score 70 or more once to start this letter's write schedule.") : "Practice only. Start this letter in the Shrine to schedule writing reviews."}
              </p>
            </Card>
          )}
          {result && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div data-trace-score className="text-4xl font-black" style={{ color: result.score >= 70 ? "#34D399" : result.score >= 45 ? COLORS.gold : "#F43F5E" }}>{result.score}</div>
                <div className="text-sm text-slate-300">
                  {memory && <div className="text-2xl text-white" style={{ fontFamily: font }}>{glyph.g}</div>}
                  {result.score >= 70 ? (memory ? "From memory, and clean." : "Clean trace.") : result.score >= 45 ? (memory ? "Close. Compare your strokes with the outline." : "Close. Follow the outline more tightly.") : memory ? "Not yet. Trace it a few times, then try again." : "Try again, slower, on the outline."}
                  {result.peeked && <div className="text-xs text-slate-400">You peeked, so this one is practice only.</div>}
                  {result.write && <div className="text-xs text-cyan-300">Write review saved. Next due {fmtDue(writeDueAt(result.write))}.</div>}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white/5 p-2"><div className="font-bold text-white">{Math.round(result.coverage * 100)}%</div>coverage</div>
                <div className="rounded-xl bg-white/5 p-2"><div className="font-bold text-white">{Math.round(result.accuracy * 100)}%</div>on the line</div>
                {result.zones ? null : <div className="rounded-xl bg-white/5 p-2"><div className={`font-bold ${result.startOk == null ? "text-slate-300" : result.startOk ? "text-emerald-300" : "text-rose-300"}`}>{result.startOk == null ? "n/a" : result.startOk ? "Yes" : "No"}</div>started at 1</div>}
              </div>
              {result.zones && (
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs" data-zones>
                  {result.zones.map((z) => <div key={z.name} className="rounded-xl bg-white/5 p-2"><div className={`font-bold ${z.pct >= 0.6 ? "text-emerald-300" : "text-rose-300"}`}>{Math.round(z.pct * 100)}%</div>{z.name}</div>)}
                </div>
              )}
              {memory && <button onClick={nextPrompt} className="mt-3 w-full rounded-xl bg-cyan-500 py-2 text-sm font-bold text-black">Next {practice === "syllable" ? "syllable" : "letter"}</button>}
            </Card>
          )}
          {practice === "trace" && glyph.script === "th" ? (
            <Card className="p-4 text-sm text-slate-300">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-cyan-300">Feel the difference</div>
              <ul className="list-disc space-y-1 pl-5">
                <li><b>ด vs ค</b>: ด's loop sits inside the bowl with a diagonal run to the foot. ค's loop hangs off a straight left wall.</li>
                <li><b>ผ vs พ</b>: same start, but พ's inner peak climbs to full height.</li>
                <li><b>บ vs ป</b>: ป is บ with a tall right wall. Lift the pen only after the wall.</li>
                <li><b>ก</b> has no loop at all. Start at the beak.</li>
              </ul>
            </Card>
          ) : practice === "trace" ? (
            <Card className="p-4 text-sm text-slate-300">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-cyan-300">Lao hand</div>
              <p>Lao letters keep the loop-first habit but are rounder and lower. Draw the loop small and tight, then let the body swing.</p>
            </Card>
          ) : (
            <Card className="p-4 text-sm text-slate-300">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-cyan-300">{practice === "memory" ? "How it counts" : "Where marks go"}</div>
              {practice === "memory" ? (
                <p>Writing from memory moves the same write schedule as tracing. A peek turns that try into practice, so the schedule only grows for letters you can really produce.</p>
              ) : (
                <p>Upper vowels (◌ิ ◌ี ◌ึ ◌ื ◌ั) sit between the letter top and the upper line, tone marks above them, and ◌ุ ◌ู hang below the baseline. The score shows each zone separately.</p>
              )}
            </Card>
          )}
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
  {
    id: "toilet", script: "th", gloss: "Where is the toilet?",
    words: [
      { w: "ห้องน้ำ", r: "hɔ̂ng-náam", m: "toilet", tts: "ห้องน้ำ", tone: ["falling", "high"] },
      { w: "อยู่", r: "yùu", m: "is at", tts: "อยู่", tone: ["low"] },
      { w: "ที่ไหน", r: "thîi-nǎi", m: "where", tts: "ที่ไหน", tone: ["falling", "rising"] },
    ],
  },
  {
    id: "toilet", script: "lo", gloss: "Where is the toilet?",
    words: [
      { w: "ຫ້ອງນ້ຳ", r: "hong nam", m: "toilet", tts: "ห้องน้ำ" },
      { w: "ຢູ່", r: "yu", m: "is at", tts: "อยู่" },
      { w: "ໃສ", r: "sai", m: "where", tts: "ใส" },
    ],
  },
  {
    id: "price", script: "th", gloss: "How much is this one?",
    words: [
      { w: "อันนี้", r: "an-níi", m: "this one", tts: "อันนี้", tone: ["mid", "high"] },
      { w: "ราคา", r: "raa-khaa", m: "price", tts: "ราคา", tone: ["mid", "mid"] },
      { w: "เท่าไร", r: "thâo-rai", m: "how much", tts: "เท่าไร", tone: ["falling", "mid"] },
    ],
  },
  {
    id: "price", script: "lo", gloss: "How much is this one?",
    words: [
      { w: "ອັນນີ້", r: "an nii", m: "this one", tts: "อันนี้" },
      { w: "ລາຄາ", r: "la kha", m: "price", tts: "ลาคา" },
      { w: "ເທົ່າໃດ", r: "thao dai", m: "how much", tts: "เท่าใด" },
    ],
  },
  {
    id: "coffee", script: "th", gloss: "One iced coffee, please.",
    words: [
      { w: "ขอ", r: "khɔ̌ɔ", m: "may I have", tts: "ขอ", tone: ["rising"] },
      { w: "กาแฟ", r: "kaa-fɛɛ", m: "coffee", tts: "กาแฟ", tone: ["mid", "mid"] },
      { w: "เย็น", r: "yen", m: "iced", tts: "เย็น", tone: ["mid"] },
      { w: "หนึ่ง", r: "nʉ̀ng", m: "one", tts: "หนึ่ง", tone: ["low"] },
      { w: "แก้ว", r: "kɛ̂ɛw", m: "glass (classifier)", tts: "แก้ว", tone: ["falling"] },
    ],
  },
  {
    id: "coffee", script: "lo", gloss: "One iced coffee, please.",
    words: [
      { w: "ຂໍ", r: "kho", m: "may I have", tts: "ขอ" },
      { w: "ກາເຟ", r: "ka fe", m: "coffee", tts: "กาเฟ" },
      { w: "ເຢັນ", r: "yen", m: "iced", tts: "เย็น" },
      { w: "ໜຶ່ງ", r: "neung", m: "one", tts: "หนึ่ง" },
      { w: "ຈອກ", r: "chok", m: "cup (classifier)", tts: "จอก" },
    ],
  },
  {
    id: "speak", script: "th", gloss: "I can speak a little Thai.",
    words: [
      { w: "ฉัน", r: "chǎn", m: "I", tts: "ฉัน", tone: ["rising"] },
      { w: "พูด", r: "phûut", m: "speak", tts: "พูด", tone: ["falling"] },
      { w: "ภาษา", r: "phaa-sǎa", m: "language", tts: "ภาษา", tone: ["mid", "rising"] },
      { w: "ไทย", r: "thai", m: "Thai", tts: "ไทย", tone: ["mid"] },
      { w: "ได้", r: "dâi", m: "can", tts: "ได้", tone: ["falling"] },
      { w: "นิดหน่อย", r: "nít-nɔ̀i", m: "a little", tts: "นิดหน่อย", tone: ["high", "low"] },
    ],
  },
  {
    id: "speak", script: "lo", gloss: "I can speak a little Lao.",
    words: [
      { w: "ຂ້ອຍ", r: "khoi", m: "I", tts: "ข้อย" },
      { w: "ເວົ້າ", r: "vao", m: "speak", tts: "เว้า" },
      { w: "ພາສາ", r: "pha sa", m: "language", tts: "พาสา" },
      { w: "ລາວ", r: "lao", m: "Lao", tts: "ลาว" },
      { w: "ໄດ້", r: "dai", m: "can", tts: "ได้" },
      { w: "ໜ້ອຍໜຶ່ງ", r: "noi neung", m: "a little", tts: "น้อยหนึ่ง" },
    ],
  },
  {
    id: "understand", script: "th", gloss: "I don't understand.",
    words: [
      { w: "ฉัน", r: "chǎn", m: "I", tts: "ฉัน", tone: ["rising"] },
      { w: "ไม่", r: "mâi", m: "not", tts: "ไม่", tone: ["falling"] },
      { w: "เข้าใจ", r: "khâo-jai", m: "understand", tts: "เข้าใจ", tone: ["falling", "mid"] },
    ],
  },
  {
    id: "understand", script: "lo", gloss: "I don't understand.",
    words: [
      { w: "ຂ້ອຍ", r: "khoi", m: "I", tts: "ข้อย" },
      { w: "ບໍ່", r: "bo", m: "not", tts: "บ่" },
      { w: "ເຂົ້າໃຈ", r: "khao chai", m: "understand", tts: "เข้าใจ" },
    ],
  },
  {
    id: "spicy", script: "th", gloss: "Can you make it not spicy?",
    words: [
      { w: "ไม่", r: "mâi", m: "not", tts: "ไม่", tone: ["falling"] },
      { w: "เผ็ด", r: "phèt", m: "spicy", tts: "เผ็ด", tone: ["low"] },
      { w: "ได้", r: "dâi", m: "can", tts: "ได้", tone: ["falling"] },
      { w: "ไหม", r: "mǎi", m: "(question)", tts: "ไหม", tone: ["rising"] },
    ],
  },
  {
    id: "spicy", script: "lo", gloss: "Can you make it not spicy?",
    words: [
      { w: "ບໍ່", r: "bo", m: "not", tts: "บ่" },
      { w: "ເຜັດ", r: "phet", m: "spicy", tts: "เผ็ด" },
      { w: "ໄດ້", r: "dai", m: "can", tts: "ได้" },
      { w: "ບໍ", r: "bo", m: "(question)", tts: "บอ" },
    ],
  },
  {
    id: "hungry", script: "th", gloss: "I'm hungry now.",
    words: [
      { w: "หิว", r: "hǐw", m: "hungry", tts: "หิว", tone: ["rising"] },
      { w: "ข้าว", r: "khâaw", m: "rice / food", tts: "ข้าว", tone: ["falling"] },
      { w: "แล้ว", r: "lɛ́ɛw", m: "already, now", tts: "แล้ว", tone: ["high"] },
    ],
  },
  {
    id: "hungry", script: "lo", gloss: "I'm hungry now.",
    words: [
      { w: "ຫິວ", r: "hiu", m: "hungry", tts: "หิว" },
      { w: "ເຂົ້າ", r: "khao", m: "rice / food", tts: "เข้า" },
      { w: "ແລ້ວ", r: "laeo", m: "already, now", tts: "แล้ว" },
    ],
  },
  {
    id: "name", script: "th", gloss: "What's your name?",
    words: [
      { w: "คุณ", r: "khun", m: "you", tts: "คุณ", tone: ["mid"] },
      { w: "ชื่อ", r: "chʉ̂ʉ", m: "be named", tts: "ชื่อ", tone: ["falling"] },
      { w: "อะไร", r: "à-rai", m: "what", tts: "อะไร", tone: ["low", "mid"] },
    ],
  },
  {
    id: "name", script: "lo", gloss: "What's your name?",
    words: [
      { w: "ເຈົ້າ", r: "chao", m: "you", tts: "เจ้า" },
      { w: "ຊື່", r: "xue", m: "be named", tts: "ซื่อ" },
      { w: "ຫຍັງ", r: "nyang", m: "what", tts: "หยัง" },
    ],
  },
  {
    id: "market", script: "th", gloss: "What time does the market open?",
    words: [
      { w: "ตลาด", r: "tà-làat", m: "market", tts: "ตลาด", tone: ["low", "low"] },
      { w: "เปิด", r: "pə̀ət", m: "open", tts: "เปิด", tone: ["low"] },
      { w: "กี่โมง", r: "kìi-moong", m: "what time", tts: "กี่โมง", tone: ["low", "mid"] },
    ],
  },
  {
    id: "market", script: "lo", gloss: "What time does the market open?",
    words: [
      { w: "ຕະຫຼາດ", r: "ta lat", m: "market", tts: "ตะหลาด" },
      { w: "ເປີດ", r: "poet", m: "open", tts: "เปิด" },
      { w: "ຈັກ", r: "chak", m: "how many", tts: "จัก" },
      { w: "ໂມງ", r: "mong", m: "o'clock", tts: "โมง" },
    ],
  },
  {
    id: "weather", script: "th", gloss: "It's very hot today.",
    words: [
      { w: "วันนี้", r: "wan-níi", m: "today", tts: "วันนี้", tone: ["mid", "high"] },
      { w: "อากาศ", r: "aa-kàat", m: "weather", tts: "อากาศ", tone: ["mid", "low"] },
      { w: "ร้อน", r: "rɔ́ɔn", m: "hot", tts: "ร้อน", tone: ["high"] },
      { w: "มาก", r: "mâak", m: "very", tts: "มาก", tone: ["falling"] },
    ],
  },
  {
    id: "weather", script: "lo", gloss: "It's very hot today.",
    words: [
      { w: "ມື້ນີ້", r: "mue nii", m: "today", tts: "มื้อนี้" },
      { w: "ອາກາດ", r: "a kat", m: "weather", tts: "อากาด" },
      { w: "ຮ້ອນ", r: "hon", m: "hot", tts: "ฮ้อน" },
      { w: "ຫຼາຍ", r: "lai", m: "very", tts: "หลาย" },
    ],
  },
  {
    id: "taxi", script: "th", gloss: "How much to the airport?",
    words: [
      { w: "ไป", r: "pai", m: "go", tts: "ไป", tone: ["mid"] },
      { w: "สนามบิน", r: "sà-nǎam-bin", m: "airport", tts: "สนามบิน", tone: ["low", "rising", "mid"] },
      { w: "เท่าไร", r: "thâo-rai", m: "how much", tts: "เท่าไร", tone: ["falling", "mid"] },
    ],
  },
  {
    id: "taxi", script: "lo", gloss: "How much to the airport?",
    words: [
      { w: "ໄປ", r: "pai", m: "go", tts: "ไป" },
      { w: "ສະໜາມບິນ", r: "sanam bin", m: "airport", tts: "สะหนามบิน" },
      { w: "ເທົ່າໃດ", r: "thao dai", m: "how much", tts: "เท่าใด" },
    ],
  },
  {
    id: "trip", script: "th", gloss: "Tomorrow I'll go to Chiang Mai.",
    words: [
      { w: "พรุ่งนี้", r: "phrûng-níi", m: "tomorrow", tts: "พรุ่งนี้", tone: ["falling", "high"] },
      { w: "ฉัน", r: "chǎn", m: "I", tts: "ฉัน", tone: ["rising"] },
      { w: "จะ", r: "jà", m: "will", tts: "จะ", tone: ["low"] },
      { w: "ไป", r: "pai", m: "go", tts: "ไป", tone: ["mid"] },
      { w: "เชียงใหม่", r: "chiang-mài", m: "Chiang Mai", tts: "เชียงใหม่", tone: ["mid", "low"] },
    ],
  },
  {
    id: "trip", script: "lo", gloss: "Tomorrow I'll go to Luang Prabang.",
    words: [
      { w: "ມື້ອື່ນ", r: "mue uen", m: "tomorrow", tts: "มื้ออื่น" },
      { w: "ຂ້ອຍ", r: "khoi", m: "I", tts: "ข้อย" },
      { w: "ຈະ", r: "cha", m: "will", tts: "จะ" },
      { w: "ໄປ", r: "pai", m: "go", tts: "ไป" },
      { w: "ຫຼວງພະບາງ", r: "luang pha bang", m: "Luang Prabang", tts: "หลวงพะบาง" },
    ],
  },
  {
    id: "family", script: "th", gloss: "My mother is a teacher.",
    words: [
      { w: "แม่", r: "mɛ̂ɛ", m: "mother", tts: "แม่", tone: ["falling"] },
      { w: "ของ", r: "khɔ̌ɔng", m: "of", tts: "ของ", tone: ["rising"] },
      { w: "ฉัน", r: "chǎn", m: "me", tts: "ฉัน", tone: ["rising"] },
      { w: "เป็น", r: "pen", m: "is", tts: "เป็น", tone: ["mid"] },
      { w: "ครู", r: "khruu", m: "teacher", tts: "ครู", tone: ["mid"] },
    ],
  },
  {
    id: "family", script: "lo", gloss: "My mother is a teacher.",
    words: [
      { w: "ແມ່", r: "mae", m: "mother", tts: "แม่" },
      { w: "ຂອງ", r: "khong", m: "of", tts: "ของ" },
      { w: "ຂ້ອຍ", r: "khoi", m: "me", tts: "ข้อย" },
      { w: "ເປັນ", r: "pen", m: "is", tts: "เป็น" },
      { w: "ຄູ", r: "khu", m: "teacher", tts: "คู" },
    ],
  },
];

function SliceSentence({ sentence, font, mode }) {
  const prefsS = usePrefs();
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
              <span className="text-xl text-white" style={{ fontFamily: FONT_STACKS[font][sentence.script] }}><TintedWord text={w.w} tones={w.tone} enabled={prefsS.tint} /></span>
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
                <span className="text-5xl leading-[1.5] text-white" style={{ fontFamily: FONT_STACKS[font][sentence.script] }}><TintedWord text={w.w} tones={w.tone} enabled={prefsS.tint} /></span>
                <div className="space-y-1 text-sm">
                  <div className="text-white">{sentence.script === "th" ? R(w.r) : w.r} · {w.m}</div>
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

const SLICE_TOPICS = [
  ["eat", "Eating"], ["meet", "Greeting"], ["toilet", "Toilet"], ["price", "Price"], ["coffee", "Coffee"], ["name", "Names"], ["hungry", "Hungry"],
  ["understand", "Not understanding"], ["spicy", "Not spicy"], ["market", "Market hours"], ["weather", "Weather"], ["taxi", "Taxi"], ["family", "Family"], ["speak", "Speaking"], ["trip", "A trip"],
];
function Slicer({ mode, font }) {
  const [sid, setSid] = useState("eat");
  const list = SENTENCES.filter((s) => s.id === sid && (mode === "dual" || s.script === mode));
  const idx = SLICE_TOPICS.findIndex(([k]) => k === sid);
  return (
    <div className="space-y-4">
      <SectionTitle icon={Scissors} title="Zero-Space Script Slicer" sub="Thai and Lao write words with no spaces. Find the word boundaries with golden laser cuts. Lines get longer as you go." color={COLORS.gold} />
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {SLICE_TOPICS.map(([k, l], i) => <Chip key={k} active={sid === k} onClick={() => setSid(k)}>{i + 1} · {l}</Chip>)}
      </div>
      {list.map((s) => <SliceSentence key={`${s.id}-${s.script}`} sentence={s} font={font} mode={mode} />)}
      {idx < SLICE_TOPICS.length - 1 && <button onClick={() => setSid(SLICE_TOPICS[idx + 1][0])} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white">Next line <ChevronRight size={14} className="inline" /></button>}
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
// Each law gets an FSRS track once you first try it; due laws come back like any review.
const lawDueAt = (t) => t.last + fsrsInterval(t.S) * DAY;
const lawsDue = (sched, now = Date.now()) => BRIDGE_LAWS.filter((l) => sched[l.id] && lawDueAt(sched[l.id]) <= now).sort((a, b) => lawDueAt(sched[a.id]) - lawDueAt(sched[b.id]));
const nextNewLaw = (sched) => BRIDGE_LAWS.find((l) => !sched[l.id]) || null;

function MekongPredictor({ mode, font, bridge, setBridge, sched = {}, setSched, logActivity }) {
  const [dir, setDir] = useState(mode === "lo" ? "lo2th" : "th2lo");
  const [lawId, setLawId] = useState(() => (lawsDue(sched)[0] || nextNewLaw(sched) || BRIDGE_LAWS[0]).id);
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
    setSched?.((prev) => ({ ...prev, [law.id]: fsrsUpdate(prev[law.id], ok ? 3 : 1) }));
    logActivity?.({ bridge: 1 });
    audio.speakHumanVoice(word.tl, word.lo);
  };
  const next = () => {
    const nextIdx = wi + 1;
    if (nextIdx >= law.words.length) {
      const li = BRIDGE_LAWS.findIndex((l) => l.id === law.id);
      const due = lawsDue(sched).find((l) => l.id !== law.id);
      setLawId((due || BRIDGE_LAWS[(li + 1) % BRIDGE_LAWS.length]).id);
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
          <p className="mb-2 text-[11px] text-slate-400">Each law you try comes back on its own schedule. Due laws open first and show up on the Today Path.</p>
          <div className="space-y-1.5">
            {BRIDGE_LAWS.map((l, i) => {
              const [r, n] = bridge[l.id] || [0, 0];
              const acc = n ? r / n : 0;
              const t = sched[l.id];
              const isDue = t && lawDueAt(t) <= Date.now();
              return (
                <button key={l.id} onClick={() => { setLawId(l.id); setWi(0); }} className={`w-full rounded-xl px-2.5 py-1.5 text-left transition ${l.id === law.id ? "bg-purple-500/20" : "hover:bg-white/5"}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-100">{i + 1}. {l.name}</span>
                    <span className="flex items-center gap-1.5 tabular-nums text-slate-400">
                      {isDue && <span data-law-due className="rounded-full bg-amber-400/20 px-1.5 text-[10px] font-bold text-amber-300">due</span>}
                      {n ? `${Math.round(acc * 100)}%` : "–"}
                    </span>
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

/* ---------------------------------------------------------------------------
 * More signs (D24). Written compactly: words separated by spaces; a word the
 * course or the garden knows needs nothing else, others are word=reading=meaning.
 * $50 is a price in Thai or Lao digits, #50 a plain number, and "::" starts the
 * line's English gloss (used by Ride the line).
 * ------------------------------------------------------------------------- */
const SIGN_SRC = [
  { id: "cart", script: "th", title: "Street food cart", place: "Bangkok", style: "worn", src: `
ข้าวมันไก่=khâaw-man-kài=chicken rice $50 $บาท :: Chicken rice, 50 baht
ก๋วยเตี๋ยว หมู $60 $บาท :: Pork noodle soup, 60 baht
พิเศษ=phí-sèet=large (special) $70 $บาท :: Large size, 70 baht
น้ำเปล่า=náam-plàao=plain water $10 $บาท :: Plain water, 10 baht` },
  { id: "road", script: "th", title: "Road sign", place: "Bangkok", style: "road", src: `
ถนน สุขุมวิท=sù-khǔm-wít=Sukhumvit :: Sukhumvit Road
ซอย=sɔɔi=lane (soi) #11 :: Soi 11
ไป สนามบิน :: To the airport
เลี้ยว ซ้าย :: Turn left` },
  { id: "pharmacy", script: "th", title: "Pharmacy", place: "Chiang Mai", style: "green", src: `
ร้านขายยา :: Pharmacy
ยา แก้=kɛ̂ɛ=relieve ปวด :: Painkillers
ยา แก้ ไอ :: Cough medicine
เปิด #8 โมง=moong=o'clock เช้า=cháao=morning :: Opens at 8 in the morning` },
  { id: "hospital", script: "th", title: "Hospital", place: "Bangkok", style: "hospital", src: `
โรงพยาบาล :: Hospital
ฉุกเฉิน=chùk-chə̌n=emergency :: Emergency
ทางเข้า=thaang-khâo=entrance :: Entrance
แผนก=phà-nɛ̀ɛk=department ฟัน :: Dental department` },
  { id: "nightmarket", script: "th", title: "Night market", place: "Bangkok", style: "neon", src: `
ตลาด กลางคืน=klaang-khʉʉn=night :: Night market
เบียร์ เย็น $90 $บาท :: Cold beer, 90 baht
เปิด #6 โมง เย็น ถึง=thʉ̌ng=until เที่ยงคืน=thîang-khʉʉn=midnight :: Open 6 p.m. to midnight` },
  { id: "sale", script: "th", title: "Shop banner", place: "Pattaya", style: "banner", src: `
ลดราคา=lót-raa-khaa=sale (lower the price) #50% :: Sale, 50% off
ซื้อ #1 แถม=thɛ̌ɛm=get free #1 :: Buy one, get one free
วันนี้ เท่านั้น=thâo-nán=only :: Today only` },
  { id: "busstop", script: "th", title: "Bus stop", place: "Bangkok", style: "transit", src: `
ป้าย=pâai=sign / stop รถเมล์=rót-mee=bus :: Bus stop
สาย=sǎai=line / route #29 :: Route 29
ไป หมอชิต=mɔ̌ɔ-chít=Mo Chit :: To Mo Chit` },
  { id: "hotel", script: "th", title: "Hotel front desk", place: "Krabi", style: "cafe", src: `
โรงแรม :: Hotel
ห้อง ว่าง=wâang=free / vacant :: Rooms available
เช็คเอาท์=chék-ao=check-out เที่ยง :: Check-out at noon` },
  { id: "massage", script: "th", title: "Massage shop", place: "Chiang Mai", style: "neon", src: `
นวด=nûat=massage แผนไทย=phɛ̌ɛn-thai=Thai-style :: Thai massage
#1 ชั่วโมง=chûa-moong=hour $300 $บาท :: One hour, 300 baht
นวด เท้า $250 $บาท :: Foot massage, 250 baht` },
  { id: "pier", script: "th", title: "River pier", place: "Bangkok", style: "river", src: `
ท่าเรือ=thâa-rʉa=pier ช้าง :: Tha Chang pier
เรือ ด่วน=dùan=express ธง=thong=flag ส้ม=sôm=orange :: Orange-flag express boat
ค่า=khâa=fee โดยสาร=dooi-sǎan=passenger $16 $บาท :: Fare 16 baht` },
  { id: "parking", script: "th", title: "Parking notice", place: "Khon Kaen", style: "road", src: `
ห้าม จอด รถ :: No parking
จอด ได้=dâai=can #2 ชั่วโมง :: Parking for two hours
ที่=thîi=place จอด รถ ชั้น=chán=floor #3 :: Car park on floor 3` },
  { id: "lo-road", script: "lo", title: "Road sign", place: "Vientiane", style: "road", src: `
ຖະໜົນ ລ້ານຊ້າງ=laan xang=Lane Xang :: Lane Xang Avenue
ໄປ ສະໜາມບິນ :: To the airport
ລ້ຽວ ຂວາ :: Turn right` },
  { id: "lo-noodle", script: "lo", title: "Noodle shop", place: "Luang Prabang", style: "worn", src: `
ຮ້ານ ເຝີ :: Noodle shop
ເຝີ ຊີ້ນ $30000 $ກີບ :: Beef noodle soup, 30,000 kip
ເຂົ້າປຽກ=khao piak=rice noodle soup $25000 $ກີບ :: Khao piak, 25,000 kip
ນ້ຳ $5000 $ກີບ :: Water, 5,000 kip` },
  { id: "lo-pharmacy", script: "lo", title: "Pharmacy", place: "Vientiane", style: "green", src: `
ຮ້ານຂາຍຢາ :: Pharmacy
ຢາ ແກ້=kae=relieve ໄຂ້ :: Fever medicine
ເປີດ=poet=open #8 ໂມງ=mong=o'clock :: Opens at 8` },
  { id: "lo-bus", script: "lo", title: "Bus station", place: "Vientiane", style: "transit", src: `
ສະຖານີ ລົດເມ :: Bus station
ໄປ ຫຼວງພະບາງ=luang phabang=Luang Prabang :: To Luang Prabang
ອອກ #7 ໂມງ=mong=o'clock ເຊົ້າ=sao=morning :: Leaves at 7 in the morning` },
];

let itemIndexCache = null;
function itemIndex() {
  if (itemIndexCache) return itemIndexCache;
  const byId = new Map();
  const byLo = new Map();
  [...CURRICULUM, ...LAO_ONLY_ITEMS, ...GARDEN_ITEMS].forEach((i) => { byId.set(i.id, i); if (i.tier !== "glyph" && !byLo.has(i.lo)) byLo.set(i.lo, i); });
  itemIndexCache = { byId, byLo };
  return itemIndexCache;
}

/** One sign word: known words from the course or the garden, or word=reading=meaning. */
const signGlossary = new Map();
function signToken(raw, script) {
  if (/^[#$]/.test(raw)) {
    const price = raw[0] === "$";
    const body = raw.slice(1);
    if (!/^\d/.test(body)) return { ...signToken(body, script), price };
    const n = Number(body.replace(/\D/g, ""));
    const pct = body.endsWith("%");
    const words = numberWords(n, script) + (pct ? (script === "lo" ? "ເປີເຊັນ" : "เปอร์เซ็นต์") : "");
    return { t: price ? toScriptDigits(n, script) + (pct ? "%" : "") : body, r: numberRoman(n, script) + (pct ? " per-sen" : ""), m: body.replace(/\B(?=(\d{3})+(?!\d))/g, ","), tts: script === "lo" ? laoToThai(words) : words, price, num: true };
  }
  const [w, r, m] = raw.split("=");
  if (r) signGlossary.set(w, [r, m]);
  const g = signGlossary.get(w);
  if (g && (r || !(script === "lo" ? itemIndex().byLo.get(w) : thaiLexicon().get(w)))) {
    const [rr, mm] = g;
    return { t: w, r: rr, m: mm, tone: script === "th" ? rr.split("-").map(toneOfRoman) : undefined, tts: script === "lo" ? laoToThai(w) : w };
  }
  if (script === "lo") {
    const it = itemIndex().byLo.get(w);
    return it ? { t: w, id: it.id } : { t: w, tts: laoToThai(w) };
  }
  const lx = thaiLexicon().get(w);
  if (lx?.id) return { t: w, id: lx.id };
  return lx ? { t: w, r: lx.roman, m: lx.meaning, tone: lx.tone } : { t: w };
}
/** Space-separated words; a meaning may hold spaces, so words without Thai or Lao letters join the word before them. */
function tokenizeLine(body, script) {
  const parts = [];
  body.trim().split(/\s+/).forEach((x) => { if (parts.length && parts[parts.length - 1].includes("=") && !/[ก-๛຀-໿]/.test(x) && !/^[#$]/.test(x)) parts[parts.length - 1] += ` ${x}`; else parts.push(x); });
  return parts.map((raw) => signToken(raw, script));
}
function parseSign(pack) {
  const lines = [];
  const glosses = [];
  pack.src.trim().split("\n").forEach((line) => {
    const [body, gloss] = line.split("::");
    lines.push(tokenizeLine(body, pack.script));
    glosses.push((gloss || "").trim());
  });
  return { ...pack, lines, glosses };
}

/* A menu that changes every day (and on demand), built from food words you have met. */
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
const MENU_PARTS = { meat: ["หมู", "ไก่", "กุ้ง", "เนื้อ"], how: ["ทอด", "ย่าง", "ผัด=phàt=stir-fried", "ต้ม"], drink: ["ชา เย็น", "กาแฟ", "น้ำ มะพร้าว", "ชา นม"], extra: ["ข้าว", "ข้าวเหนียว", "ไข่"] };
function dailyMenu(seed) {
  const rnd = mulberry(seed);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const used = new Set();
  const lines = [];
  while (lines.length < 4) {
    const dish = `${pick(MENU_PARTS.meat)} ${pick(MENU_PARTS.how)}`;
    if (used.has(dish)) continue;
    used.add(dish);
    lines.push(`${dish} $${5 * Math.round((40 + rnd() * 80) / 5)} $บาท`);
  }
  lines.push(`${pick(MENU_PARTS.extra)} $${5 * Math.round((10 + rnd() * 15) / 5)} $บาท`);
  lines.push(`${pick(MENU_PARTS.drink)} $${5 * Math.round((20 + rnd() * 40) / 5)} $บาท`);
  return parseSign({ id: "menu-today", script: "th", title: "Today's menu", place: "Your street", style: "cafe", src: lines.join("\n") });
}
const SIGN_PACKS = () => SIGN_SRC.map(parseSign);

/** Thai chat packs: your lines use ค่ะ / คะ when you've set a female particle. */
function politePack(pack, particle) {
  if (!pack?.speakers || pack.script !== "th" || particle !== "female") return pack;
  const lines = pack.lines.map((line, li) => {
    if (pack.speakers[li] !== "You") return line;
    const question = line.some((t) => QUESTION_WORDS.includes(t.t) || t.id === "p-howmuch");
    return line.map((t) => (t.id === "p-khrap" ? (question ? { t: "คะ", id: "p-kha-q" } : { t: "ค่ะ", id: "p-kha" }) : t));
  });
  return { ...pack, lines };
}

const STREET_STYLES = {
  cafe: { card: "linear-gradient(170deg, #3a1f0e, #1d1009)", ink: "#FFE7C2", accent: "#FFB86B", border: "#ffb86b44" },
  transit: { card: "linear-gradient(170deg, #0e3b2a, #08241a)", ink: "#F2FFF8", accent: "#7CF0B0", border: "#7cf0b044" },
  shop: { card: "linear-gradient(170deg, #f5f5f0, #e7e5df)", ink: "#1a1a1a", accent: "#E4002B", border: "#00000022" },
  temple: { card: "linear-gradient(170deg, #5a1414, #2e0909)", ink: "#FFE08A", accent: "#F5C542", border: "#f5c54244" },
  market: { card: "linear-gradient(170deg, #12324a, #0a1c2b)", ink: "#EAF6FF", accent: "#7FD1FF", border: "#7fd1ff44" },
  chat: { card: "linear-gradient(170deg, #3a1630, #1f0b1a)", ink: "#FFE4F1", accent: "#F472B6", border: "#f472b644" },
  worn: { card: "repeating-linear-gradient(95deg, #e9dcc0 0 9px, #e2d3b4 9px 14px)", ink: "#7a1d12", accent: "#1f5aa6", border: "#7a1d1233", font: '"Sriracha", "Itim", cursive' },
  road: { card: "linear-gradient(170deg, #0b4ea2, #083a7a)", ink: "#FFFFFF", accent: "#FFE27A", border: "#ffffff55" },
  green: { card: "linear-gradient(170deg, #0f7a3e, #0a5a2d)", ink: "#FFFFFF", accent: "#C8FFD8", border: "#ffffff44" },
  hospital: { card: "linear-gradient(170deg, #ffffff, #eef4fb)", ink: "#0b3b75", accent: "#D7263D", border: "#0b3b7522" },
  neon: { card: "radial-gradient(ellipse at 30% 20%, #2b0a3d, #0b0414)", ink: "#FF7AE6", accent: "#5CF2FF", border: "#ff7ae655", glow: "0 0 6px #ff7ae6, 0 0 14px #ff2fd0" },
  banner: { card: "linear-gradient(170deg, #ffd400, #ffb800)", ink: "#c3001c", accent: "#111111", border: "#c3001c44", font: '"Mitr", "Kanit", sans-serif' },
  river: { card: "linear-gradient(170deg, #f2efe6, #ddd6c4)", ink: "#183153", accent: "#E8590C", border: "#18315333" },
};

function resolveToken(tok, script) {
  if (!tok.id) return tok;
  const item = itemIndex().byId.get(tok.id);
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

function StreetReader({ mode, srs, setSrs, best, setBest, logActivity }) {
  const [menuSeed, setMenuSeed] = useState(() => Math.floor(Date.now() / DAY));
  const signPacks = useMemo(() => SIGN_PACKS(), []);
  const menu = useMemo(() => dailyMenu(menuSeed), [menuSeed]);
  const packs = [...STREET_PACKS, menu, ...signPacks].filter((p) => mode === "dual" || p.script === mode);
  const [pid, setPid] = useState(packs[0]?.id);
  const prefs = usePrefs();
  const { particle } = prefs;
  const pack = politePack(packs.find((p) => p.id === pid) || packs[0], particle);
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
  const font = pack.script === "lo" ? '"Noto Sans Lao", "Phetsarath OT", sans-serif' : style.font || '"Kanit", "Noto Sans Thai", sans-serif';
  const selTok = sel != null ? tokens[sel] : null;
  const audio = getAudio();

  const toggleTimer = () => {
    if (!timer.start) return setTimer({ start: Date.now(), last: null });
    const secs = (Date.now() - timer.start) / 1000;
    setTimer({ start: null, last: secs });
    logActivity?.({ signs: 1 });
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
      {/* One scrolling row on the phone: 23 signs would otherwise fill the screen. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [&>*]:shrink-0">
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
                          textShadow: style.glow,
                          borderBottom: t.price ? "none" : `3px solid ${isKnown ? "#34D399" : "#22D3EE"}`,
                          background: sel === i ? `${style.accent}33` : "transparent",
                        }}
                      >
                        <TintedWord text={raw.t} tones={pack.script === "th" ? t.tone : null} level={t.item ? tintLevel(srs[t.item.id]) : 0} enabled={prefs.tint && !t.price} />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {pack.id === "menu-today" && <button onClick={() => setMenuSeed((s) => s + 1000 + Math.floor(Math.random() * 1000))} className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-slate-200"><RefreshCw size={12} className="mr-1 inline" />New menu</button>}
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
              <div className="text-slate-200">{pack.script === "th" ? R(selTok.r) : selTok.r} · {selTok.m}</div>
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

const emptyShadow = () => ({ base: null, tones: Object.fromEntries(TONE_ORDER.map((t) => [t, { best: 0, tries: 0 }])), lines: {} });

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
    // The take itself is kept too, so you can play it back against the model (D15).
    let rec = null;
    const chunks = [];
    try { rec = typeof MediaRecorder !== "undefined" ? new MediaRecorder(stream) : null; rec?.addEventListener("dataavailable", (e) => e.data.size && chunks.push(e.data)); rec?.start(); } catch { rec = null; }
    const t0 = performance.now();
    return new Promise((resolve) => {
      let raf = 0;
      let lastT = -1;
      const finish = () => {
        cancelAnimationFrame(raf);
        stopRef.current = null;
        const close = () => {
          stream.getTracks().forEach((t) => t.stop());
          ctx.close();
          frames.audio = chunks.length ? new Blob(chunks, { type: rec?.mimeType || "audio/webm" }) : null;
          resolve(frames);
        };
        if (rec && rec.state !== "inactive") { rec.addEventListener("stop", close, { once: true }); rec.stop(); } else close();
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


/* ============================================================================
 * Talk Paths (N12): conversations where you choose your line, then say it.
 * Your lines follow your particle setting and are scored like dialogue
 * shadowing; a politeness meter reacts to register.
 * ========================================================================== */
const TALK_PATHS = [
  { id: "food", script: "th", title: "Ordering food", who: "Vendor", start: "n0", nodes: {
    n0: { say: ["รับอะไรดีคะ", "ráp à-rai dii khá", "What would you like?"], opts: [
      ["ขอข้าวผัดกุ้งหนึ่งจานครับ", "khɔ̌ɔ khâaw phàt kûng nʉ̀ng jaan khráp", "One shrimp fried rice, please.", 1, "", "n1"],
      ["เอาข้าวผัดกุ้ง", "ao khâaw phàt kûng", "Shrimp fried rice.", 0, "Fine at a stall, but ขอ … ครับ sounds warmer.", "n1"]] },
    n1: { say: ["เผ็ดไหมคะ", "phèt mǎi khá", "Spicy?"], opts: [
      ["ไม่เผ็ดครับ", "mâi phèt khráp", "Not spicy, please.", 0, "", "n2"],
      ["เผ็ดนิดหน่อยครับ", "phèt nít nɔ̀i khráp", "A little spicy.", 0, "", "n2"]] },
    n2: { say: ["ทานที่นี่หรือกลับบ้านคะ", "thaan thîi nîi rʉ̌ʉ klàp bâan khá", "Eat here or take away?"], opts: [
      ["ทานที่นี่ครับ", "thaan thîi nîi khráp", "Eat here.", 0, "", "n3"],
      ["กลับบ้านครับ", "klàp bâan khráp", "Take away.", 0, "", "n3"]] },
    n3: { say: ["หกสิบบาทค่ะ", "hòk sìp bàat khâ", "Sixty baht."], opts: [
      ["ขอบคุณครับ", "khɔ̀ɔp khun khráp", "Thank you.", 1, "", null],
      ["ขอบใจนะ", "khɔ̀ɔp jai ná", "Thanks.", -1, "ขอบใจ is for someone younger or close to you. To a vendor, say ขอบคุณครับ.", null]] },
  } },
  { id: "grab", script: "th", title: "A Grab ride", who: "Driver", start: "n0", nodes: {
    n0: { say: ["ไปไหนครับ", "pai nǎi khráp", "Where to?"], opts: [
      ["ไปสนามบินครับ", "pai sà nǎam bin khráp", "To the airport, please.", 0, "", "n1"],
      ["ไปสยามครับ", "pai sà yǎam khráp", "To Siam, please.", 0, "", "n1"]] },
    n1: { say: ["ขึ้นทางด่วนไหมครับ", "khʉ̂n thaang dùan mǎi khráp", "Shall I take the expressway?"], opts: [
      ["ขึ้นครับ", "khʉ̂n khráp", "Yes, take it.", 0, "", "n2"],
      ["ไม่ขึ้นครับ", "mâi khʉ̂n khráp", "No, thanks.", 0, "", "n2"]] },
    n2: { say: ["ถึงแล้วครับ", "thʉ̌ng lɛ́ɛw khráp", "We're here."], opts: [
      ["จอดตรงนี้ได้ไหมครับ", "jɔ̀ɔt trong níi dâai mǎi khráp", "Can you stop right here?", 1, "", "n3"],
      ["จอดเลย", "jɔ̀ɔt ləəi", "Stop.", -1, "A bare command sounds sharp. Add ได้ไหมครับ, or at least ครับ.", "n3"]] },
    n3: { say: ["ได้ครับ", "dâai khráp", "Sure."], opts: [
      ["ขอบคุณมากครับ", "khɔ̀ɔp khun mâak khráp", "Thank you very much.", 1, "", null]] },
  } },
  { id: "bargain", script: "th", title: "Bargaining at the market", who: "Seller", start: "n0", nodes: {
    n0: { say: ["เสื้อตัวละสามร้อยค่ะ", "sʉ̂a tua lá sǎam rɔ́ɔi khâ", "The shirts are 300 each."], opts: [
      ["ลดได้ไหมครับ", "lót dâai mǎi khráp", "Can you go lower?", 1, "", "n1"],
      ["แพงจัง", "phɛɛng jang", "So expensive!", 0, "Fine with a smile, but ลดได้ไหมครับ opens the haggle politely.", "n1"]] },
    n1: { say: ["สองร้อยห้าสิบค่ะ", "sɔ̌ɔng rɔ́ɔi hâa sìp khâ", "250, then."], opts: [
      ["สองตัวสี่ร้อยได้ไหมครับ", "sɔ̌ɔng tua sìi rɔ́ɔi dâai mǎi khráp", "Two for 400?", 1, "", "n2"],
      ["สองร้อยได้ไหมครับ", "sɔ̌ɔng rɔ́ɔi dâai mǎi khráp", "200?", 0, "", "n2"]] },
    n2: { say: ["ได้ค่ะ", "dâai khâ", "Okay."], opts: [
      ["เอาครับ ขอบคุณครับ", "ao khráp khɔ̀ɔp khun khráp", "I'll take it, thanks.", 1, "", null]] },
  } },
  { id: "way", script: "th", title: "Asking the way", who: "Guard", start: "n0", nodes: {
    n0: { say: null, opts: [
      ["ขอโทษครับ ห้องน้ำอยู่ที่ไหนครับ", "khɔ̌ɔ thôot khráp hɔ̂ng náam yùu thîi nǎi khráp", "Excuse me, where's the toilet?", 1, "", "n1"],
      ["ห้องน้ำอยู่ไหน", "hɔ̂ng náam yùu nǎi", "Where's the toilet?", -1, "To a stranger, start with ขอโทษครับ.", "n1"]] },
    n1: { say: ["เดินตรงไปแล้วเลี้ยวซ้ายครับ", "dəən trong pai lɛ́ɛw líaw sáai khráp", "Go straight, then turn left."], opts: [
      ["ไกลไหมครับ", "klai mǎi khráp", "Is it far?", 0, "", "n2"],
      ["ขอบคุณครับ", "khɔ̀ɔp khun khráp", "Thank you.", 1, "", null]] },
    n2: { say: ["ไม่ไกลครับ ประมาณห้านาที", "mâi klai khráp prà maan hâa naa thii", "Not far, about five minutes."], opts: [
      ["ขอบคุณมากครับ", "khɔ̀ɔp khun mâak khráp", "Thank you very much.", 1, "", null]] },
  } },
  { id: "guesthouse", script: "lo", title: "A Vientiane guesthouse", who: "Owner", start: "n0", nodes: {
    n0: { say: ["ສະບາຍດີ ມີຫຍັງໃຫ້ຊ່ວຍບໍ", "sabaidee, mii nyang hai suay bo", "Hello, how can I help?"], opts: [
      ["ມີຫ້ອງຫວ່າງບໍ", "mii hong wang bo", "Do you have a free room?", 1, "", "n1"],
      ["ຂ້ອຍຢາກໄດ້ຫ້ອງ", "khoi yak dai hong", "I want a room.", 0, "", "n1"]] },
    n1: { say: ["ມີ ຈັກຄືນ", "mii, chak khuen", "Yes. How many nights?"], opts: [
      ["ສອງຄືນ", "song khuen", "Two nights.", 0, "", "n2"],
      ["ຄືນດຽວ", "khuen diao", "Just one night.", 0, "", "n2"]] },
    n2: { say: ["ຄືນລະສອງແສນກີບ", "khuen la song saen kip", "200,000 kip a night."], opts: [
      ["ຫຼຸດໄດ້ບໍ", "lut dai bo", "Can you go lower?", 0, "", "n3"],
      ["ໄດ້ ຂອບໃຈ", "dai, khop chai", "Fine, thank you.", 1, "In Lao, ຂອບໃຈ is the everyday thank-you, unlike Thai ขอบใจ.", null]] },
    n3: { say: ["ໜຶ່ງແສນແປດໝື່ນ", "neung saen paet muen", "180,000, then."], opts: [
      ["ໄດ້ ຂອບໃຈຫຼາຍໆ", "dai, khop chai lai lai", "Fine, thank you very much.", 1, "", null]] },
  } },
];
/** A choice as a shadowing line: syllables and tones come from the reading. */
function talkLine([th, r, m]) {
  const syl = r.split(/[\s,-]+/).filter(Boolean);
  return { th, r, m, syl, tones: syl.map(toneOfRoman) };
}

function TalkPaths({ mode, shadow, logActivity }) {
  const audio = getAudio();
  const mic = useMicPitch();
  const { particle } = usePrefs();
  const paths = TALK_PATHS.filter((p) => mode === "dual" || p.script === (mode === "lo" ? "lo" : "th"));
  const [pid, setPid] = useState(paths[0]?.id);
  const path = paths.find((p) => p.id === pid) || paths[0];
  const [state, setState] = useState(null); // { node, chosen, meter, log: [], result }
  const [phase, setPhase] = useState("idle");
  const [err, setErr] = useState(null);
  const lao = path.script === "lo";
  const fontFam = FONT_STACKS.loop[path.script];
  const speak = (th) => (lao ? audio.speakHumanVoice(laoToThai(th), th) : audio.speakHumanVoice(th));
  const begin = () => {
    const node = path.nodes[path.start];
    setState({ node: path.start, chosen: null, meter: 60, log: [], result: null });
    setErr(null);
    if (node.say) setTimeout(() => speak(node.say[0]), 200);
  };
  useEffect(() => { setState(null); }, [pid]);
  const mine = (o) => { const l = talkLine(o); return lao ? l : politeLine(l, particle === "unset" ? "male" : particle); };
  const shownMine = (o) => (lao || particle !== "unset" ? mine(o) : politeLine(talkLine(o), "unset"));
  const choose = (o) => {
    const meter = Math.max(0, Math.min(100, state.meter + (o[3] > 0 ? 12 : o[3] < 0 ? -18 : 0)));
    setState({ ...state, chosen: o, meter, result: null });
    speak(mine(o).th);
  };
  const say = async () => {
    const line = mine(state.chosen);
    audio.cancelSpeech();
    setErr(null);
    setPhase("recording");
    try {
      const frames = await mic.capture(1200 + line.tones.length * 450);
      const run = voicedRun(frames);
      if (!run) setErr("I couldn't hear the line. Say it a little louder.");
      else { const r = scorePhrase(line, run, shadow?.base); setState((s) => ({ ...s, result: r })); logActivity?.({ shadow: 1 }); haptic(r.score >= SHADOW_PASS ? "ok" : "bad"); }
    } catch (e) {
      setErr(micErrorText(e));
    }
    setPhase("idle");
  };
  const cont = () => {
    const o = state.chosen;
    const entry = { node: state.node, line: shownMine(o), note: o[4], pol: o[3], score: state.result?.score };
    const nextId = o[5];
    if (!nextId) { setState({ ...state, log: [...state.log, entry], done: true }); logActivity?.({ drills: 1 }); return; }
    const node = path.nodes[nextId];
    setState({ ...state, node: nextId, chosen: null, result: null, log: [...state.log, entry] });
    if (node.say) setTimeout(() => speak(node.say[0]), 200);
  };
  const meterLabel = (m) => (m >= 75 ? "Warm and polite" : m >= 45 ? "Fine" : "A bit blunt");
  const node = state ? path.nodes[state.node] : null;
  return (
    <div className="space-y-4">
      <SectionTitle icon={MessageCircle} title="Talk Paths" sub="Pick your reply, hear it, then say it. Your lines use your polite particle from Settings." color="#F472B6" />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [&>*]:shrink-0">
        {paths.map((p) => <Chip key={p.id} active={p.id === path.id} color="#F472B6" onClick={() => setPid(p.id)}>{p.title}</Chip>)}
      </div>
      {!state ? (
        <Card className="p-5">
          <div className="text-lg font-bold text-white">{path.title}</div>
          <p className="mt-1 text-sm text-slate-300">{Object.keys(path.nodes).length} turns with a {path.who.toLowerCase()}. Choices change where it goes and how polite you come across.</p>
          {lao && <p className="mt-2 text-xs text-slate-400">Lao paths are listen-and-choose: the shadow scoring follows Bangkok tones. The Lao lines need a native check.</p>}
          <button onClick={begin} className="mt-4 w-full rounded-2xl bg-pink-500 py-3 font-bold text-black">Start</button>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Politeness</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all" style={{ width: `${state.meter}%`, background: state.meter >= 75 ? "#34D399" : state.meter >= 45 ? "#F5A524" : "#FB7185" }} /></div>
            <span className="text-xs text-slate-300">{meterLabel(state.meter)}</span>
          </div>
          <div className="mt-4 space-y-2">
            {state.log.map((e, k) => (
              <div key={k} className="space-y-1">
                {path.nodes[e.node].say && <div className="mr-10 rounded-2xl rounded-tl-sm bg-white/[0.06] px-3 py-2"><div className="text-lg text-white" style={{ fontFamily: fontFam }}>{path.nodes[e.node].say[0]}</div></div>}
                <div className="ml-10 rounded-2xl rounded-tr-sm bg-pink-500/15 px-3 py-2 text-right"><div className="text-lg text-white" style={{ fontFamily: fontFam }}>{e.line.th}</div>{e.score != null && <div className="text-[11px] text-slate-300">said · {e.score}</div>}{e.note && <div className="text-left text-xs text-amber-200">{e.note}</div>}</div>
              </div>
            ))}
            {!state.done && node.say && (
              <button onClick={() => speak(node.say[0])} className="mr-10 block w-[calc(100%-2.5rem)] rounded-2xl rounded-tl-sm bg-white/[0.06] px-3 py-2 text-left">
                <div className="text-[11px] font-bold uppercase text-slate-400">{path.who}</div>
                <div className="text-2xl text-white" style={{ fontFamily: fontFam }}>{node.say[0]}</div>
                <div className="text-sm text-slate-300">{lao ? node.say[1] : R(node.say[1])}</div>
                <div className="text-xs text-slate-400">{node.say[2]}</div>
              </button>
            )}
          </div>
          {!state.done && !state.chosen && (
            <div className="mt-4 grid gap-2">
              {node.opts.map((o, k) => {
                const l = shownMine(o);
                return (
                  <button key={k} data-talk-opt={k} onClick={() => choose(o)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left">
                    <div className="text-xl text-white" style={{ fontFamily: fontFam }}>{l.th}</div>
                    <div className="text-xs text-slate-300">{lao ? l.r : R(l.r)} · {o[2]}</div>
                  </button>
                );
              })}
            </div>
          )}
          {!state.done && state.chosen && (
            <div className="mt-4 rounded-2xl bg-pink-500/10 p-3">
              <div className="text-2xl text-white" style={{ fontFamily: fontFam }}>{shownMine(state.chosen).th}</div>
              <div className="text-sm text-slate-200">{lao ? state.chosen[1] : R(shownMine(state.chosen).r)}</div>
              {state.chosen[4] && <p className="mt-1 text-xs text-amber-200">{state.chosen[4]}</p>}
              {!lao && <PhrasePlot line={mine(state.chosen)} result={state.result} live={null} height={150} />}
              {state.result && <p className="mt-1 text-sm text-slate-200"><b className={state.result.score >= SHADOW_PASS ? "text-emerald-300" : "text-amber-300"}>{state.result.score}</b> · {state.result.tip}</p>}
              {err && <p className="mt-2 text-xs text-rose-200">{err}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => speak(mine(state.chosen).th)} className="rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-100"><Volume2 size={14} className="mr-1 inline" />Hear it</button>
                {!lao && (phase === "recording" ? <button onClick={mic.stop} className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-bold text-white"><Mic size={14} className="mr-1 inline animate-pulse" />Listening…</button> : <button data-talk-say onClick={say} className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-black"><Mic size={14} className="mr-1 inline" />Say it</button>)}
                <button onClick={cont} className="ml-auto rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white">Continue <ChevronRight size={14} className="inline" /></button>
              </div>
            </div>
          )}
          {state.done && (
            <div className="mt-4 rounded-2xl bg-white/[0.04] p-3 text-sm">
              <div className="font-semibold text-white">Conversation done · {meterLabel(state.meter).toLowerCase()}</div>
              <button onClick={begin} className="mt-3 w-full rounded-2xl bg-pink-500 py-2.5 font-bold text-black">Try other choices</button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* ============================================================================
 * Voice Bank (N11): a tutor or friend reads each item; recordings replace
 * text-to-speech everywhere that text is spoken, and go into backups.
 * ========================================================================== */
function voiceBankLists(mode) {
  const lists = [];
  const th = courseItems("th");
  lists.push({ id: "th-course", label: "Thai course", items: th.filter((i) => !i.garden).map((i) => ({ key: voiceKey("th", i.ttsTh), text: i.ttsTh, sub: `${(i.thRoman || "").split(" ·")[0]} · ${i.meaning}`, script: "th" })) });
  lists.push({ id: "lo-course", label: "Lao course", items: courseItems("lo").filter((i) => !i.garden && i.tier !== "glyph").map((i) => ({ key: voiceKey("lo", i.lo), text: i.lo, sub: `${i.loRoman} · ${i.meaning}`, script: "lo" })) });
  lists.push({ id: "ear", label: "Ear words", items: [...EAR_SETS.flatMap((s) => s.words), ...SOUND_SETS.flatMap((s) => s.words), ...EAR_WORD_SETS.flatMap((s) => s.words)].map((w) => ({ key: voiceKey("th", w.th), text: w.th, sub: `${w.r} · ${w.m}`, script: "th" })) });
  lists.push({ id: "garden", label: "Word Garden", items: GARDEN_ITEMS.map((i) => ({ key: voiceKey(mode === "lo" ? "lo" : "th", mode === "lo" ? i.lo : i.th), text: mode === "lo" ? i.lo : i.th, sub: `${mode === "lo" ? i.loRoman : i.thRoman} · ${i.meaning}`, script: mode === "lo" ? "lo" : "th" })) });
  lists.forEach((l) => { const seen = new Set(); l.items = l.items.filter((x) => x.text && !seen.has(x.key) && seen.add(x.key)); });
  return lists;
}

function VoiceBank({ mode }) {
  const bank = useVoiceBank();
  const lists = useMemo(() => voiceBankLists(mode), [mode]);
  const [lid, setLid] = useState(mode === "lo" ? "lo-course" : "th-course");
  const list = lists.find((l) => l.id === lid) || lists[0];
  const [idx, setIdx] = useState(() => Math.max(0, list.items.findIndex((x) => !bank.has(x.key))));
  const [rec, setRec] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { setIdx(Math.max(0, list.items.findIndex((x) => !bank.has(x.key)))); }, [lid]); // eslint-disable-line react-hooks/exhaustive-deps
  const item = list.items[idx];
  const done = list.items.filter((x) => bank.has(x.key)).length;
  const total = [...bank.keys()].filter((k) => !k.startsWith("take:")).length;
  const record = async () => {
    if (rec) { rec.stop(); return; }
    setErr(null);
    getAudio().cancelSpeech();
    const r = recordClip(2500);
    setRec(r);
    try {
      const blob = await r.done;
      await saveVoice(item.key, blob);
      await playUrl(voiceBank.get(item.key));
    } catch (e) {
      setErr(micErrorText(e));
    }
    setRec(null);
  };
  const nextUnrecorded = () => { const k = list.items.findIndex((x, i) => i > idx && !bank.has(x.key)); setIdx(k >= 0 ? k : Math.min(idx + 1, list.items.length - 1)); };
  return (
    <div className="space-y-4">
      <SectionTitle icon={Mic} title="Voice Bank" sub="Hand the phone to a tutor or friend. Each recording replaces the synthetic voice for that word everywhere in the app, and goes into your backups." color="#7FD1B0" />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [&>*]:shrink-0">
        {lists.map((l) => <Chip key={l.id} active={l.id === list.id} color="#7FD1B0" onClick={() => setLid(l.id)}>{l.label} <span className="text-xs opacity-70">{l.items.filter((x) => bank.has(x.key)).length}/{l.items.length}</span></Chip>)}
      </div>
      {item && (
        <Card className="p-5 text-center">
          <div className="text-xs text-slate-400">{idx + 1} of {list.items.length} · {done} recorded</div>
          <div className="my-3 text-6xl leading-[1.5] text-white" lang={item.script} style={{ fontFamily: FONT_STACKS.loop[item.script] }}>{item.text}</div>
          <div className="text-sm text-slate-300">{item.sub}</div>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button onClick={() => setIdx(Math.max(0, idx - 1))} className="rounded-xl border border-white/10 p-3 text-slate-300" aria-label="Previous"><ChevronLeft size={18} /></button>
            <button data-bank-record onClick={record} className={`flex h-20 w-20 items-center justify-center rounded-full ${rec ? "animate-pulse bg-rose-500 text-white" : "bg-emerald-400 text-black"}`} aria-label={rec ? "Stop" : "Record"}><Mic size={32} /></button>
            <button onClick={nextUnrecorded} className="rounded-xl border border-white/10 p-3 text-slate-300" aria-label="Next"><ChevronRight size={18} /></button>
          </div>
          <div className="mt-3 flex justify-center gap-2 text-xs">
            {bank.has(item.key) ? (
              <>
                <button onClick={() => playUrl(bank.get(item.key))} className="rounded-xl bg-white/10 px-3 py-1.5 text-white"><Play size={12} className="mr-1 inline" />Play recording</button>
                <button onClick={() => deleteVoice(item.key)} className="rounded-xl border border-white/10 px-3 py-1.5 text-slate-300">Delete</button>
              </>
            ) : <span className="text-slate-400">Not recorded yet. Tap the mic and read it once, clearly (about two seconds).</span>}
          </div>
          {err && <p className="mt-3 text-sm text-rose-200">{err}</p>}
        </Card>
      )}
      <p className="text-xs text-slate-400">{total} recording{total === 1 ? "" : "s"} on this phone. A Lao speaker reading the Lao course would also give its Vientiane tones the native check they still need.</p>
    </div>
  );
}

/* ============================================================================
 * Dialogue shadowing: say whole lines and see every syllable's contour.
 * ========================================================================== */
const SHADOW_DIALOGUES = [
  { id: "counter", title: "At the counter", lines: [
    { who: "Barista", th: "สวัสดีค่ะ รับอะไรคะ", r: "sà-wàt-dii khâ, ráp à-rai khá", m: "Hello, what would you like?", syl: ["sà", "wàt", "dii", "khâ", "ráp", "à", "rai", "khá"], tones: ["low", "low", "mid", "falling", "high", "low", "mid", "high"] },
    { who: "You", th: "กาแฟเย็นครับ", r: "kaa-fɛɛ yen khráp", m: "An iced coffee, please.", syl: ["kaa", "fɛɛ", "yen", "khráp"], tones: ["mid", "mid", "mid", "high"] },
    { who: "Barista", th: "อะไรอีกไหมคะ", r: "à-rai ìik mǎi khá", m: "Anything else?", syl: ["à", "rai", "ìik", "mǎi", "khá"], tones: ["low", "mid", "low", "rising", "high"] },
    { who: "You", th: "ไม่ครับ เท่าไรครับ", r: "mâi khráp, thâo-rai khráp", m: "No thanks. How much?", syl: ["mâi", "khráp", "thâo", "rai", "khráp"], tones: ["falling", "high", "falling", "mid", "high"] },
    { who: "Barista", th: "ห้าสิบห้าบาทค่ะ", r: "hâa-sìp-hâa bàat khâ", m: "Fifty-five baht.", syl: ["hâa", "sìp", "hâa", "bàat", "khâ"], tones: ["falling", "low", "falling", "low", "falling"] },
    { who: "You", th: "ขอบคุณครับ", r: "khɔ̀ɔp-khun khráp", m: "Thank you.", syl: ["khɔ̀ɔp", "khun", "khráp"], tones: ["low", "mid", "high"] },
  ] },
  { id: "way", title: "Asking the way", lines: [
    { who: "You", th: "ขอโทษครับ", r: "khɔ̌ɔ-thôot khráp", m: "Excuse me.", syl: ["khɔ̌ɔ", "thôot", "khráp"], tones: ["rising", "falling", "high"] },
    { who: "You", th: "ห้องน้ำอยู่ที่ไหน", r: "hɔ̂ng-náam yùu thîi-nǎi", m: "Where is the bathroom?", syl: ["hɔ̂ng", "náam", "yùu", "thîi", "nǎi"], tones: ["falling", "high", "low", "falling", "rising"] },
    { who: "Local", th: "ตรงไปค่ะ", r: "trong pai khâ", m: "Go straight.", syl: ["trong", "pai", "khâ"], tones: ["mid", "mid", "falling"] },
    { who: "You", th: "พูดช้าๆ หน่อยครับ", r: "phûut cháa-cháa nɔ̀i khráp", m: "Please speak slowly.", syl: ["phûut", "cháa", "cháa", "nɔ̀i", "khráp"], tones: ["falling", "high", "high", "low", "high"] },
    { who: "Local", th: "ตรงไป แล้วเลี้ยวซ้าย", r: "trong pai, lɛ́ɛo líao sáai", m: "Straight on, then turn left.", syl: ["trong", "pai", "lɛ́ɛo", "líao", "sáai"], tones: ["mid", "mid", "high", "high", "high"] },
    { who: "You", th: "ขอบคุณมากครับ", r: "khɔ̀ɔp-khun mâak khráp", m: "Thank you very much.", syl: ["khɔ̀ɔp", "khun", "mâak", "khráp"], tones: ["low", "mid", "falling", "high"] },
  ] },
];
const PHRASE_PTS = 12; // contour points per syllable

/** Every voiced frame from the first to the last, octave-fixed and smoothed, in semitones. */
function voicedRun(frames) {
  const v = frames.filter((f) => f.hz);
  if (v.length < 8) return null;
  const mid = median(v.map((f) => f.hz));
  const st = [];
  v.forEach((f, i) => {
    let x = toSt(f.hz, mid);
    if (i) {
      while (x - st[i - 1] > 7) x -= 12;
      while (st[i - 1] - x > 7) x += 12;
    }
    st.push(x);
  });
  const smooth = st.map((_, i) => median(st.slice(Math.max(0, i - 2), i + 3)));
  return { st: smooth, hz: smooth.map((x) => mid * 2 ** (x / 12)) };
}

/**
 * Score a spoken line against the chained Chao contours of its syllables. Dynamic time
 * warping lines the two up, since nobody gives every syllable the same length; each
 * syllable is then scored by how far your warped pitch sits from its own contour.
 */
function scorePhrase(line, run, base) {
  const T = line.tones.flatMap((t) => targetSt(t, PHRASE_PTS));
  const n = T.length;
  const raw = base ? run.hz.map((h) => toSt(h, base)) : run.st;
  const L = resample(raw, Math.max(n, Math.min(raw.length, n * 2)));
  const mean = (xs) => xs.reduce((a, x) => a + x, 0) / xs.length;
  const mT = mean(T);
  const mL = mean(L);
  const t0 = T.map((x) => x - mT);
  const l0 = L.map((x) => x - mL);
  const m = l0.length;
  const band = Math.max(PHRASE_PTS * 2, Math.abs(m - n) + PHRASE_PTS);
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(Infinity));
  D[0][0] = 0;
  for (let i = 1; i <= n; i += 1) {
    const centre = Math.round((i * m) / n);
    for (let j = Math.max(1, centre - band); j <= Math.min(m, centre + band); j += 1) {
      D[i][j] = Math.abs(t0[i - 1] - l0[j - 1]) + Math.min(D[i - 1][j - 1], D[i - 1][j], D[i][j - 1]);
    }
  }
  // Walk back to find which of your frames match each target point.
  const matched = Array.from({ length: n }, () => []);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    matched[i - 1].push(l0[j - 1]);
    const opts = [[D[i - 1][j - 1], i - 1, j - 1], [D[i - 1][j], i - 1, j], [D[i][j - 1], i, j - 1]];
    opts.sort((a, b) => a[0] - b[0]);
    [, i, j] = opts[0];
  }
  const warped = matched.map((xs, k) => (xs.length ? mean(xs) : t0[k]));
  const perSyl = line.tones.map((tone, k) => {
    const seg = warped.slice(k * PHRASE_PTS, (k + 1) * PHRASE_PTS);
    const tgt = t0.slice(k * PHRASE_PTS, (k + 1) * PHRASE_PTS);
    const err = mean(seg.map((x, q) => Math.abs(x - tgt[q])));
    const slope = (xs) => mean(xs.slice(-4)) - mean(xs.slice(0, 4));
    return { tone, score: Math.round(Math.max(0, Math.min(100, 100 - (err - 0.5) * 22))), dir: slope(seg) - slope(tgt), off: mean(seg) - mean(tgt) };
  });
  const score = Math.round(mean(perSyl.map((p) => p.score)));
  const worst = perSyl.reduce((w, p, k) => (p.score < perSyl[w].score ? k : w), 0);
  const w = perSyl[worst];
  const name = TONES[w.tone].name;
  let tip;
  if (score >= SHADOW_PASS) tip = "Every syllable follows its contour. Try it at full speed.";
  else if (Math.abs(w.dir) > 2) tip = `"${line.syl[worst]}" is ${name}: ${w.dir > 0 ? "yours rose where it should" : "yours fell where it should"} ${w.dir > 0 ? (TONES[w.tone].chao.endsWith("1") ? "fall" : "stay level") : "rise or stay level"}.`;
  else if (Math.abs(w.off) > 1.5) tip = `"${line.syl[worst]}" is ${name}: pitch it ${w.off > 0 ? "lower" : "higher"} than you did.`;
  else tip = `Closest to fix: "${line.syl[worst]}" (${name}). Listen to the line again and copy that syllable.`;
  return { score, perSyl, warped, target: t0, tip };
}

function PhrasePlot({ line, result, live, height = 190 }) {
  const width = 360;
  const pad = { l: 8, r: 8, t: 22, b: 10 };
  const range = 8;
  const y = (st) => pad.t + ((range - Math.max(-range, Math.min(range, st))) / (2 * range)) * (height - pad.t - pad.b);
  const k = line.tones.length;
  const segW = (width - pad.l - pad.r) / k;
  const T = line.tones.map((t) => targetSt(t, PHRASE_PTS));
  const meanT = T.flat().reduce((a, x) => a + x, 0) / (k * PHRASE_PTS);
  const segPath = (xs, s) => xs.map((v, i) => `${i ? "L" : "M"} ${(pad.l + s * segW + 6 + (i / (xs.length - 1)) * (segW - 12)).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const liveXs = (live || []).filter((v) => v != null);
  const livePath = liveXs.length > 1 ? liveXs.map((v, i) => `${i ? "L" : "M"} ${(pad.l + (i / (liveXs.length - 1)) * (width - pad.l - pad.r)).toFixed(1)} ${y(v).toFixed(1)}`).join(" ") : null;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto mt-3 w-full" role="img" aria-label="Target contour for each syllable, with your pitch">
      {line.tones.map((tone, s) => {
        const ps = result?.perSyl[s];
        return (
          <g key={s}>
            {s > 0 && <line x1={pad.l + s * segW} x2={pad.l + s * segW} y1={pad.t - 4} y2={height - pad.b} stroke="#ffffff1a" />}
            <text x={pad.l + s * segW + segW / 2} y={13} textAnchor="middle" fontSize="11" fill={ps ? (ps.score >= SHADOW_PASS ? "#6EE7B7" : "#FDA4AF") : "#CBD5E1"}>{line.syl[s]}</text>
            <path d={segPath(T[s].map((v) => v - meanT), s)} fill="none" stroke={TONES[tone].color} strokeOpacity="0.35" strokeWidth="16" strokeLinecap="round" />
            {result && <path data-phrase-trace d={segPath(result.warped.slice(s * PHRASE_PTS, (s + 1) * PHRASE_PTS), s)} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
          </g>
        );
      })}
      {!result && livePath && <path d={livePath} fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.5" />}
    </svg>
  );
}

/* Hear yourself (D15): your last take against the model, A then B, and your best take per line. */
function TakeAB({ take, takeKey, onModel, score, best }) {
  const bank = useVoiceBank();
  const bestUrl = bank.get(`take:${takeKey}`);
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!take) { setUrl(null); return undefined; }
    const u = URL.createObjectURL(take);
    setUrl(u);
    // A new best score keeps this take as the line's best.
    if (score != null && score >= (best || 0)) saveVoice(`take:${takeKey}`, take).catch(() => {});
    return () => URL.revokeObjectURL(u);
  }, [take]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!url && !bestUrl) return null;
  const ab = async () => { onModel(); await new Promise((r) => setTimeout(r, 1600)); if (url) await playUrl(url); };
  const btn = "rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-100";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" data-take-ab>
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Hear yourself</span>
      <button onClick={onModel} className={btn}>A · model</button>
      {url && <button onClick={() => playUrl(url)} className={btn}>B · you</button>}
      {url && <button onClick={ab} className={`${btn} border-amber-400/50 text-amber-200`}>A then B</button>}
      {bestUrl && <button onClick={() => playUrl(bestUrl)} className={btn}>Best take{best ? ` · ${best}` : ""}</button>}
    </div>
  );
}

function DialogueShadow({ shadow, setShadow, logActivity }) {
  const audio = getAudio();
  const mic = useMicPitch();
  const [did, setDid] = useState(SHADOW_DIALOGUES[0].id);
  const dlg = SHADOW_DIALOGUES.find((d) => d.id === did);
  const [li, setLi] = useState(0);
  const { particle } = usePrefs();
  // Audio and scoring need one particle; until you pick one, your lines are read with ครับ and shown with both.
  const lines = useMemo(() => dlg.lines.map((l) => (l.who === "You" ? politeLine(l, particle === "unset" ? "male" : particle) : l)), [dlg, particle]);
  const shown = (i) => (dlg.lines[i].who === "You" && particle === "unset" ? politeLine(dlg.lines[i], "unset") : lines[i]);
  const line = lines[li];
  const key = `${dlg.id}:${li}`;
  const [phase, setPhase] = useState("idle");
  const [live, setLive] = useState([]);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [take, setTake] = useState(null);
  useEffect(() => { setResult(null); setLive([]); setErr(null); setTake(null); }, [did, li]);

  const record = async () => {
    audio.cancelSpeech();
    audio.stopTones();
    setErr(null);
    setResult(null);
    setLive([]);
    setPhase("recording");
    try {
      const frames = await mic.capture(1200 + line.tones.length * 450, (fr) => {
        const v = fr.filter((f) => f.hz).map((f) => f.hz);
        const ref = shadow.base || median(v);
        setLive(v.map((h) => toSt(h, ref)));
      });
      const run = voicedRun(frames);
      if (!run) setErr("I couldn't hear the line. Say it a little louder, close to the microphone.");
      else {
        const r = scorePhrase(line, run, shadow.base);
        setResult({ ...r, prevBest: shadow.lines?.[key] || 0 });
        setTake(frames.audio || null);
        setShadow((s) => ({ ...s, lines: { ...(s.lines || {}), [key]: Math.max(s.lines?.[key] || 0, r.score) } }));
        logActivity?.({ shadow: 1 });
        haptic(r.score >= SHADOW_PASS ? "ok" : "bad");
      }
    } catch (e) {
      setErr(micErrorText(e));
    }
    setPhase("idle");
  };

  const playUpTo = () => audio.speakSequence(lines.slice(0, li + 1).map((l) => ({ th: l.th })), 500);
  const busy = phase !== "idle";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Card className="p-5" glow={TONES.high.color}>
        <div className="flex flex-wrap gap-2">
          {SHADOW_DIALOGUES.map((d) => <Chip key={d.id} active={d.id === did} color={TONES.high.color} onClick={() => { setDid(d.id); setLi(0); }}>{d.title}</Chip>)}
        </div>
        <ol className="mt-3 space-y-1.5">
          {lines.map((l, i) => {
            const best = shadow.lines?.[`${dlg.id}:${i}`];
            return (
              <li key={i}>
                <button data-dialogue-line={i} onClick={() => setLi(i)} className={`flex w-full items-baseline gap-2 rounded-xl px-3 py-1.5 text-left transition ${i === li ? "bg-white/10" : "hover:bg-white/5"} ${l.who === "You" ? "" : "pl-6"}`}>
                  <span className={`w-14 shrink-0 text-[11px] font-bold uppercase ${l.who === "You" ? "text-amber-300" : "text-slate-400"}`}>{l.who}</span>
                  <span className="flex-1 text-lg text-white" style={{ fontFamily: FONT_STACKS.loop.th }}>{shown(i).th}</span>
                  {best != null && <span className={`text-xs tabular-nums ${best >= SHADOW_PASS ? "text-emerald-300" : "text-slate-400"}`}>{best}</span>}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 rounded-2xl bg-white/[0.04] p-3">
          <div className="text-2xl leading-[1.6] text-white" style={{ fontFamily: FONT_STACKS.loop.th }}>{shown(li).th}</div>
          <div className="text-sm text-slate-200">{R(shown(li).r)}</div>
          <div className="text-xs text-slate-400">{line.m}</div>
          <PhrasePlot line={line} result={result} live={phase === "recording" ? live : null} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => audio.speakHumanVoice(line.th)} disabled={busy} className="flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-50"><Volume2 size={16} /> Hear line</button>
          <button onClick={playUpTo} disabled={busy} className="flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-200 disabled:opacity-50"><Play size={14} /> From the top</button>
          {phase === "recording" ? (
            <button onClick={mic.stop} className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white"><Mic size={16} className="animate-pulse" /> Listening… tap to stop</button>
          ) : (
            <button data-dialogue-say onClick={record} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"><Mic size={16} /> Say the line</button>
          )}
        </div>
        {result && (
          <div className="mt-4 rounded-2xl bg-white/[0.04] p-3 text-sm">
            <div className="flex items-baseline gap-3">
              <span data-dialogue-score className={`text-3xl font-black tabular-nums ${result.score >= SHADOW_PASS ? "text-emerald-300" : "text-amber-300"}`}>{result.score}</span>
              <span className="flex flex-wrap gap-1">{result.perSyl.map((p, k) => <span key={k} className={`rounded-md px-1.5 text-xs ${p.score >= SHADOW_PASS ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"}`}>{line.syl[k]} {p.score}</span>)}</span>
            </div>
            <p className="mt-1 text-slate-200">{result.tip}</p>
            <TakeAB take={take} takeKey={`dlg:${key}`} onModel={() => audio.speakHumanVoice(line.th)} score={result.score} best={result.prevBest} />
            {li < lines.length - 1 && <button onClick={() => setLi(li + 1)} className="mt-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">Next line <ChevronRight size={12} className="inline" /></button>}
          </div>
        )}
        {err && <p className="mt-3 flex gap-2 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{err}</p>}
      </Card>
      <Card className="p-4 text-xs leading-relaxed text-slate-400">
        Each box is one syllable's contour, coloured by tone. After you speak, your pitch is stretched to line up with the syllables (people never give every syllable the same length) and each one is scored on its own. Real speech flattens tones a little and pitch drifts down over a sentence, so aim for the direction of each syllable rather than a perfect copy. {shadow.base ? `Height is scored against your voice at ${shadow.base} Hz.` : "Set your voice under Syllables to score height too."}
      </Card>
    </div>
  );
}

function ShadowMirror({ ear, shadow, setShadow, sandbox, logActivity }) {
  useWakeLock(true);
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
  const [take, setTake] = useState(null);
  useEffect(() => { setResult(null); setLive([]); setWi(0); setTake(null); }, [tone]);
  useEffect(() => { setTake(null); }, [wi]);
  const [view, setView] = useState("syllables");

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
        setResult({ ...r, prevBest: shadow.takes?.[word.th] || 0 });
        setTake(frames.audio || null);
        setShadow((s) => ({ ...s, takes: { ...(s.takes || {}), [word.th]: Math.max(s.takes?.[word.th] || 0, r.score) } }));
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
      <div className="flex gap-2">
        <Chip active={view === "syllables"} color={TONES.falling.color} onClick={() => setView("syllables")}>Syllables</Chip>
        <Chip active={view === "dialogue"} color={TONES.falling.color} onClick={() => setView("dialogue")}><span data-shadow-dialogue>Dialogue</span></Chip>
      </div>
      {view === "dialogue" ? <DialogueShadow shadow={shadow} setShadow={setShadow} logActivity={logActivity} /> : (<>
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
                <TakeAB take={take} takeKey={`syl:${word.th}`} onModel={() => audio.speakHumanVoice(word.th)} score={result.score} best={result.prevBest} />
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
      </>)}
    </div>
  );
}

/* ============================================================================
 * Market Clock: prices, times and Buddhist-era years, by ear and by eye.
 * ========================================================================== */
const NUM_WORDS = {
  th: { digits: ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"], ten: "สิบ", twenty: "ยี่สิบ", one: "เอ็ด", places: ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"], million: "ล้าน" },
  lo: { digits: ["ສູນ", "ໜຶ່ງ", "ສອງ", "ສາມ", "ສີ່", "ຫ້າ", "ຫົກ", "ເຈັດ", "ແປດ", "ເກົ້າ"], ten: "ສິບ", twenty: "ຊາວ", one: "ເອັດ", places: ["", "ສິບ", "ຮ້ອຍ", "ພັນ", "ສິບພັນ", "ແສນ"], million: "ລ້ານ" },
};
const NUM_ROMAN = {
  ศูนย์: "sǔun", หนึ่ง: "nʉ̀ng", สอง: "sɔ̌ɔng", สาม: "sǎam", สี่: "sìi", ห้า: "hâa", หก: "hòk", เจ็ด: "jèt", แปด: "pɛ̀ɛt", เก้า: "kâao", สิบ: "sìp", ยี่สิบ: "yîi-sìp", เอ็ด: "èt", ร้อย: "rɔ́ɔi", พัน: "phan", หมื่น: "mʉ̀ʉn", แสน: "sɛ̌ɛn", ล้าน: "láan",
  ສູນ: "suun", ໜຶ່ງ: "neung", ສອງ: "song", ສາມ: "saam", ສີ່: "sii", ຫ້າ: "haa", ຫົກ: "hok", ເຈັດ: "chet", ແປດ: "paet", ເກົ້າ: "kao", ສິບ: "sip", ຊາວ: "xao", ເອັດ: "et", ຮ້ອຍ: "hoi", ພັນ: "phan", ສິບພັນ: "sip phan", ແສນ: "saen", ລ້ານ: "lan",
};
/** A number in words, as pieces: 21 = ยี่สิบ + เอ็ด, 1,500 = หนึ่ง พัน ห้า ร้อย. */
function numberPieces(n, script = "th") {
  const W = NUM_WORDS[script];
  if (n === 0) return [W.digits[0]];
  if (n >= 1e6) return [...numberPieces(Math.floor(n / 1e6), script), W.million, ...(n % 1e6 ? numberPieces(n % 1e6, script) : [])];
  // Lao counts thousands up to 99 (ສິບພັນ = 10,000, ຊາວພັນ = 20,000), then ແສນ.
  if (script === "lo" && n >= 1000) {
    const lakh = Math.floor(n / 1e5);
    const k = Math.floor((n % 1e5) / 1000);
    const rest = n % 1000;
    return [...(lakh ? [W.digits[lakh], "ແສນ"] : []), ...(k ? [...(k === 1 ? [W.digits[1]] : numberPieces(k, script)), "ພັນ"] : []), ...(rest ? numberPieces(rest, script).map((x, i, a) => (x === W.digits[1] && i === a.length - 1 && rest % 10 === 1 && rest > 1 ? W.one : x)) : [])];
  }
  const ds = String(n).split("").map(Number).reverse();
  const out = [];
  for (let p = ds.length - 1; p >= 0; p -= 1) {
    const d = ds[p];
    if (!d) continue;
    if (p === 1) { out.push(d === 1 ? W.ten : d === 2 ? W.twenty : W.digits[d], ...(d > 2 ? [W.ten] : [])); continue; }
    if (p === 0) { out.push(d === 1 && n > 10 ? W.one : W.digits[d]); continue; }
    out.push(W.digits[d], W.places[p]);
  }
  return out;
}
const numberWords = (n, script = "th") => numberPieces(n, script).join("");
const numberRoman = (n, script = "th") => numberPieces(n, script).map((x) => NUM_ROMAN[x] || x).join(" ");
const toScriptDigits = (n, script = "th") => String(n).replace(/\d/g, (d) => String.fromCharCode((script === "lo" ? 0x0ed0 : 0x0e50) + Number(d)));

/** Thai six-period clock: ตีสอง, เจ็ดโมงเช้า, บ่ายสองโมง, ห้าโมงเย็น, สองทุ่ม. Lao uses formal ໂມງ hours. */
function clockPhrase(h, m, script = "th") {
  const N = (x) => numberWords(x, script);
  let words;
  let en;
  if (script === "lo") {
    words = h === 0 ? "ທ່ຽງຄືນ" : h === 12 ? "ທ່ຽງ" : `${N(h)}ໂມງ`;
    en = "formal hours, as on Lao radio and timetables";
    if (m === 30) words += "ເຄິ່ງ"; else if (m) words += `${N(m)}ນາທີ`;
    return { text: words, note: en };
  }
  if (h === 0) words = "เที่ยงคืน";
  else if (h <= 5) words = `ตี${N(h)}`;
  else if (h <= 11) words = `${N(h)}โมงเช้า`;
  else if (h === 12) words = "เที่ยง";
  else if (h === 13) words = "บ่ายโมง";
  else if (h <= 15) words = `บ่าย${N(h - 12)}โมง`;
  else if (h <= 18) words = `${N(h - 12)}โมงเย็น`;
  else words = `${N(h - 18)}ทุ่ม`;
  en = h === 0 ? "midnight" : h <= 5 ? "ตี: the small hours (a gong was struck)" : h <= 11 ? "โมงเช้า: morning hours" : h === 12 ? "noon" : h <= 15 ? "บ่าย: afternoon" : h <= 18 ? "โมงเย็น: evening hours" : "ทุ่ม: night hours (a drum was beaten)";
  if (m === 30) words += "ครึ่ง"; else if (m) words += `${N(m)}นาที`;
  return { text: words, note: en };
}
const fmtClock = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
const BE_OFFSET = 543;

function randomPrice() {
  const r = Math.random();
  if (r < 0.35) return 5 * (1 + Math.floor(Math.random() * 20));
  if (r < 0.7) return 10 * (11 + Math.floor(Math.random() * 89));
  if (r < 0.9) return 50 * (20 + Math.floor(Math.random() * 180));
  return 100 * (100 + Math.floor(Math.random() * 900));
}

function ClockFace({ h, m, size = 120 }) {
  const ha = ((h % 12) + m / 60) * 30;
  const ma = m * 6;
  const hand = (a, len, w, c) => <line x1="50" y1="50" x2={50 + len * Math.sin((a * Math.PI) / 180)} y2={50 - len * Math.cos((a * Math.PI) / 180)} stroke={c} strokeWidth={w} strokeLinecap="round" />;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={`Clock showing ${fmtClock(h, m)}`}>
      <circle cx="50" cy="50" r="46" fill="rgb(var(--sk-panel))" stroke="#F59E0B66" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={50 + 38 * Math.sin((i * 30 * Math.PI) / 180)} cy={50 - 38 * Math.cos((i * 30 * Math.PI) / 180)} r={i % 3 ? 1.2 : 2.2} fill="#94A3B8" />)}
      {hand(ha, 22, 4, "#F59E0B")}
      {hand(ma, 34, 2.5, "#E2E8F0")}
      <circle cx="50" cy="50" r="3" fill="#F59E0B" />
      <text x="50" y="72" textAnchor="middle" fontSize="8" fill="#94A3B8">{h < 12 ? "am" : "pm"}</text>
    </svg>
  );
}

function MarketClock({ mode, drills = {}, setDrills, logActivity }) {
  const script = mode === "lo" ? "lo" : "th";
  const [kind, setKind] = useState("price");
  const [round, setRound] = useState(null);
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [show, setShow] = useState("ear"); // ear | eye
  const inputRef = useRef(null);
  const fontFam = script === "lo" ? FONT_STACKS.loop.lo : FONT_STACKS.loop.th;
  const say = (text) => { const a = getAudio(); if (script === "lo") a.speakHumanVoice(laoToThai(text), text); else a.speakHumanVoice(text); };
  const make = useCallback((k) => {
    if (k === "price") {
      const n = randomPrice();
      const unit = script === "lo" ? "ກີບ" : "บาท";
      const big = script === "lo" ? Math.max(1000, Math.round((n * 600) / 500) * 500) : n;
      return { k, answer: String(big), text: `${numberWords(big, script)}${unit}`, roman: `${numberRoman(big, script)} ${script === "lo" ? "kip" : "bàat"}`, sub: script === "lo" ? "Type the price in kip" : "Type the price in baht" };
    }
    if (k === "time") {
      const h = Math.floor(Math.random() * 24);
      const m = [0, 0, 0, 30, 30, 15, 45, 10][Math.floor(Math.random() * 8)];
      const ph = clockPhrase(h, m, script);
      const opts = new Set([fmtClock(h, m)]);
      const near = [[(h + 12) % 24, m], [(h + 1) % 24, m], [h, m === 30 ? 0 : 30], [(h + 23) % 24, m], [(h + 6) % 24, m]];
      shuffle(near).forEach(([a, b]) => { if (opts.size < 4) opts.add(fmtClock(a, b)); });
      return { k, h, m, answer: fmtClock(h, m), text: ph.text, note: ph.note, opts: shuffle([...opts]), sub: "Which time is it?" };
    }
    const ce = 1950 + Math.floor(Math.random() * 90);
    const toBE = Math.random() < 0.5;
    return { k, answer: String(toBE ? ce + BE_OFFSET : ce), text: toBE ? `ค.ศ. ${ce}` : `พ.ศ. ${toScriptDigits(ce + BE_OFFSET)}`, roman: toBE ? "AD year" : `phɔɔ-sɔ̌ɔ ${ce + BE_OFFSET}`, sub: toBE ? "Type it as a Buddhist-era year (พ.ศ.)" : "Type it as an AD year", year: true };
  }, [script]);
  const next = (k = kind) => {
    const r = make(k);
    setRound(r);
    setInput("");
    setResult(null);
    if (!r.year && show === "ear") setTimeout(() => say(r.text), 200);
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  useEffect(() => { next(kind); }, [kind, script]); // eslint-disable-line react-hooks/exhaustive-deps
  const grade = (val) => {
    if (result || !round) return;
    const ok = String(val).replace(/[^\d:]/g, "") === round.answer.replace(/[^\d:]/g, "");
    haptic(ok ? "ok" : "miss");
    setResult({ ok, val });
    if (show === "eye" && !round.year) say(round.text);
    setDrills?.((d) => { const c = d.clock || {}; const key = round.k; const cur = c[key] || [0, 0]; return { ...d, clock: { ...c, [key]: [cur[0] + (ok ? 1 : 0), cur[1] + 1] } }; });
    logActivity?.({ drills: 1 });
  };
  const stat = (k) => { const s = drills.clock?.[k]; return s ? `${s[0]}/${s[1]}` : "–"; };
  const hideText = show === "ear" && !round?.year && !result;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-xs font-bold uppercase tracking-widest text-amber-300">Market Clock</div>
        <p className="mt-1 text-sm text-slate-300">Prices, times and years are where numbers bite. Hear one, type or pick it.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[["price", "Prices"], ["time", "Times"], ["year", "Years (พ.ศ.)"]].map(([k, label]) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded-xl px-2 py-2 text-xs font-semibold ${kind === k ? "bg-amber-500 text-black" : "bg-white/[0.06] text-slate-200"}`}>{label}<div className={`text-[10px] ${kind === k ? "text-black/70" : "text-slate-400"}`}>{stat(k)}</div></button>
          ))}
        </div>
        {kind !== "year" && (
          <div className="mt-2 flex gap-2 text-xs">
            {[["ear", "By ear"], ["eye", "By eye"]].map(([k, label]) => <button key={k} onClick={() => setShow(k)} className={`rounded-lg px-2.5 py-1 ${show === k ? "bg-white/15 text-white" : "text-slate-400"}`}>{label}</button>)}
          </div>
        )}
      </Card>
      {round && (
        <Card className="p-5 text-center">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{round.sub}</div>
          <div className="mt-3 min-h-[3.5rem]">
            {hideText ? (
              <button onClick={() => say(round.text)} className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-amber-200" aria-label="Play again"><Volume2 size={28} /></button>
            ) : (
              <div className="text-3xl leading-[1.6] text-white" lang={script} style={{ fontFamily: fontFam }}>{round.text}</div>
            )}
            {result && round.roman && <div className="text-sm text-slate-300">{R(round.roman)}</div>}
            {result && round.note && <div className="mt-1 text-xs text-amber-200/90">{round.note}</div>}
          </div>
          {round.k === "time" ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {round.opts.map((o) => {
                const right = result && o === round.answer;
                const wrong = result?.val === o && !result.ok;
                return <button key={o} onClick={() => grade(o)} className={`rounded-2xl border py-3 text-xl font-bold tabular-nums ${right ? "border-emerald-400 bg-emerald-500/20 text-emerald-100" : wrong ? "border-rose-400 bg-rose-500/20 text-rose-100" : "border-white/10 bg-white/[0.04] text-white"}`}>{o}</button>;
              })}
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (result) next(); else if (input.trim()) grade(input); }} className="mt-4">
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} readOnly={!!result} inputMode="numeric" enterKeyHint="go" aria-label="Your answer"
                className={`w-full rounded-2xl border bg-black/30 px-4 py-3 text-center text-2xl tabular-nums text-white outline-none ${result ? (result.ok ? "border-emerald-400" : "border-rose-400") : "border-white/15 focus:border-amber-400"}`} />
            </form>
          )}
          {result && (
            <div className="mt-3 space-y-3">
              {round.k === "time" && <div className="flex justify-center"><ClockFace h={round.h} m={round.m} /></div>}
              {!result.ok && <div className="text-sm text-rose-200">It was {Number(round.answer) ? Number(round.answer).toLocaleString("en-US") : round.answer}{round.year ? "" : ""}.</div>}
              <div className="flex gap-2">
                {!round.year && <button onClick={() => say(round.text)} className="rounded-2xl border border-white/15 px-4 py-3 text-slate-200" aria-label="Play"><Volume2 size={16} /></button>}
                <button onClick={() => next()} className="flex-1 rounded-2xl bg-amber-500 py-3 font-bold text-black">Next</button>
              </div>
            </div>
          )}
          {round.year && !result && <p className="mt-3 text-xs text-slate-400">พ.ศ. = ค.ศ. + 543. Thai receipts, IDs and expiry dates use the Buddhist era.</p>}
        </Card>
      )}
    </div>
  );
}

/* ============================================================================
 * Classifier Corral: every counted noun needs its classifier (หมาสองตัว,
 * "dog two body"). Sort things into pens, then build the counting phrase.
 * ========================================================================== */
const CORRAL = {
  th: {
    pens: [["คน", "khon", "people"], ["ตัว", "tua", "animals, clothes, furniture"], ["อัน", "an", "small things, the catch-all"], ["ใบ", "bai", "flat or hollow things"], ["เล่ม", "lêm", "books and blades"], ["คัน", "khan", "vehicles and things with handles"], ["หลัง", "lǎng", "houses and buildings"], ["ลูก", "lûuk", "fruit and balls"]],
    items: [["👩‍🏫", "ครู", "teacher", "คน"], ["👨‍⚕️", "หมอ", "doctor", "คน"], ["👶", "เด็ก", "child", "คน"], ["🐶", "หมา", "dog", "ตัว"], ["🐱", "แมว", "cat", "ตัว"], ["🐘", "ช้าง", "elephant", "ตัว"], ["👕", "เสื้อ", "shirt", "ตัว"], ["🪑", "เก้าอี้", "chair", "ตัว"], ["🐟", "ปลา", "fish", "ตัว"],
      ["🍡", "ขนม", "snack", "อัน"], ["🪥", "แปรงสีฟัน", "toothbrush", "อัน"], ["🔧", "ประแจ", "spanner", "อัน"], ["🎫", "ตั๋ว", "ticket", "ใบ"], ["👜", "กระเป๋า", "bag", "ใบ"], ["🍃", "ใบไม้", "leaf", "ใบ"], ["🍽️", "จาน", "plate", "ใบ"],
      ["📕", "หนังสือ", "book", "เล่ม"], ["🔪", "มีด", "knife", "เล่ม"], ["📓", "สมุด", "notebook", "เล่ม"], ["🚗", "รถ", "car", "คัน"], ["☂️", "ร่ม", "umbrella", "คัน"], ["🚲", "จักรยาน", "bicycle", "คัน"], ["🥄", "ช้อน", "spoon", "คัน"],
      ["🏠", "บ้าน", "house", "หลัง"], ["🏫", "โรงเรียน", "school", "หลัง"], ["⛺", "เต็นท์", "tent", "หลัง"], ["🥭", "มะม่วง", "mango", "ลูก"], ["⚽", "บอล", "ball", "ลูก"], ["🍉", "แตงโม", "watermelon", "ลูก"]],
  },
  lo: {
    pens: [["ຄົນ", "khon", "people"], ["ໂຕ", "to", "animals and clothes"], ["ອັນ", "an", "small things, the catch-all"], ["ໜ່ວຍ", "nuay", "round things, fruit, eggs"], ["ຫົວ", "hua", "books"], ["ຄັນ", "khan", "vehicles and umbrellas"], ["ຫຼັງ", "lang", "houses"]],
    items: [["👩‍🏫", "ຄູ", "teacher", "ຄົນ"], ["👨‍⚕️", "ໝໍ", "doctor", "ຄົນ"], ["👶", "ເດັກນ້ອຍ", "child", "ຄົນ"], ["🐶", "ໝາ", "dog", "ໂຕ"], ["🐱", "ແມວ", "cat", "ໂຕ"], ["🐘", "ຊ້າງ", "elephant", "ໂຕ"], ["👕", "ເສື້ອ", "shirt", "ໂຕ"], ["🐟", "ປາ", "fish", "ໂຕ"],
      ["🍡", "ເຂົ້າໜົມ", "snack", "ອັນ"], ["🪥", "ແປງຖູແຂ້ວ", "toothbrush", "ອັນ"], ["🥭", "ໝາກມ່ວງ", "mango", "ໜ່ວຍ"], ["🍉", "ໝາກໂມ", "watermelon", "ໜ່ວຍ"], ["🥚", "ໄຂ່", "egg", "ໜ່ວຍ"], ["⚽", "ໝາກບານ", "ball", "ໜ່ວຍ"],
      ["📕", "ປຶ້ມ", "book", "ຫົວ"], ["📓", "ປຶ້ມຂຽນ", "notebook", "ຫົວ"], ["🚗", "ລົດ", "car", "ຄັນ"], ["☂️", "ຄັນຮົ່ມ", "umbrella", "ຄັນ"], ["🚲", "ລົດຖີບ", "bicycle", "ຄັນ"], ["🏠", "ເຮືອນ", "house", "ຫຼັງ"], ["🏫", "ໂຮງຮຽນ", "school", "ຫຼັງ"]],
  },
};

function ClassifierCorral({ mode, drills = {}, setDrills, logActivity }) {
  const script = mode === "lo" ? "lo" : "th";
  const data = CORRAL[script];
  const fontFam = script === "lo" ? FONT_STACKS.loop.lo : FONT_STACKS.loop.th;
  const [game, setGame] = useState("sort");
  const [round, setRound] = useState(null);
  const [pick, setPick] = useState(null);
  const say = (text) => { const a = getAudio(); if (script === "lo") a.speakHumanVoice(laoToThai(text), text); else a.speakHumanVoice(text); };
  const make = useCallback((g) => {
    const it = data.items[Math.floor(Math.random() * data.items.length)];
    const [emoji, noun, en, cls] = it;
    if (g === "sort") return { g, it, answer: cls, opts: data.pens.map((p) => p[0]) };
    const n = 2 + Math.floor(Math.random() * 4);
    const num = NUM_WORDS[script].digits[n];
    const sep = script === "lo" ? " " : "";
    const right = [noun, num, cls].join(sep);
    const wrongCls = shuffle(data.pens.map((p) => p[0]).filter((c) => c !== cls))[0];
    const opts = shuffle([right, [num, noun, cls].join(sep), [noun, cls, num].join(sep), [noun, num, wrongCls].join(sep)]);
    return { g, it, n, answer: right, opts, emoji, en };
  }, [data, script]);
  const next = (g = game) => { setRound(make(g)); setPick(null); };
  useEffect(() => { next(game); }, [game, script]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!round) return null;
  const [emoji, noun, en, cls] = round.it;
  const choose = (o) => {
    if (pick) return;
    setPick(o);
    const ok = o === round.answer;
    haptic(ok ? "ok" : "miss");
    say(round.g === "sort" ? [noun, NUM_WORDS[script].digits[1], cls].join(" ") : round.answer);
    setDrills?.((d) => { const c = d.corral || {}; const cur = c[cls] || [0, 0]; return { ...d, corral: { ...c, [cls]: [cur[0] + (ok ? 1 : 0), cur[1] + 1] } }; });
    logActivity?.({ drills: 1 });
  };
  const penInfo = data.pens.find((p) => p[0] === cls);
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-xs font-bold uppercase tracking-widest text-amber-300">Classifier Corral</div>
        <p className="mt-1 text-sm text-slate-300">{script === "lo" ? "Lao counts as noun + number + classifier: ໝາສອງໂຕ, two dogs." : "Thai counts as noun + number + classifier: หมาสองตัว, two dogs."}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[["sort", "Sort into pens"], ["count", "Count them"]].map(([k, label]) => <button key={k} onClick={() => setGame(k)} className={`rounded-xl px-2 py-2 text-xs font-semibold ${game === k ? "bg-amber-500 text-black" : "bg-white/[0.06] text-slate-200"}`}>{label}</button>)}
        </div>
        {script === "lo" && <p className="mt-2 text-[11px] text-slate-400">Lao classifiers are a first draft and still need a check by a native speaker.</p>}
      </Card>
      <Card className="p-5 text-center">
        <div className="text-5xl leading-tight" aria-hidden>{round.g === "count" ? Array(round.n).fill(emoji).join("") : emoji}</div>
        <div className="mt-2 text-3xl text-white" lang={script} style={{ fontFamily: fontFam }}>{noun}</div>
        <div className="text-sm text-slate-400">{round.g === "count" ? `${round.n} × ${en}` : en}</div>
        <div className={`mt-4 grid gap-2 ${round.g === "sort" ? "grid-cols-4" : "grid-cols-1"}`}>
          {round.opts.map((o) => {
            const right = pick && o === round.answer;
            const wrong = pick === o && o !== round.answer;
            return (
              <button key={o} onClick={() => choose(o)} className={`rounded-2xl border px-2 py-3 ${right ? "border-emerald-400 bg-emerald-500/20" : wrong ? "border-rose-400 bg-rose-500/20" : "border-white/10 bg-white/[0.04]"}`}>
                <span className="text-2xl text-white" lang={script} style={{ fontFamily: fontFam }}>{o}</span>
              </button>
            );
          })}
        </div>
        {pick && (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-white/[0.04] p-3 text-left text-sm">
              <div className="text-white"><span className="text-xl" lang={script} style={{ fontFamily: fontFam }}>{cls}</span> <span className="text-slate-300">{penInfo?.[1]}</span> · {penInfo?.[2]}</div>
              {round.g === "count" && <div className="mt-1 text-slate-300">Noun first, then the number, then the classifier.</div>}
            </div>
            <button onClick={() => next()} className="w-full rounded-2xl bg-amber-500 py-3 font-bold text-black">Next</button>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================================
 * Lantern Library (N4): twelve short stories, each in Thai and in Lao, written
 * from course and garden words. Unspaced like real text, tap any word for its
 * gloss. Format: @id|title|Thai title|Lao title, then th || lo || English.
 * ========================================================================== */
const LIBRARY_SRC = `@morning|A slow morning|เช้าวันอาทิตย์|ເຊົ້າວັນອາທິດ
ฉัน ตื่น ตอนเช้า || ຂ້ອຍ ຕື່ນ ຕອນເຊົ້າ || I wake up in the morning.
ฉัน อาบน้ำ แล้ว=lɛ́ɛw=then / already ล้าง หน้า || ຂ້ອຍ ອາບນ້ຳ ແລ້ວ=laeo=then / already ລ້າງ ໜ້າ || I shower, then wash my face.
ฉัน หิว มาก || ຂ້ອຍ ຫິວ ຫຼາຍ || I am very hungry.
อาหารเช้า มี ข้าว ไข่ และ กาแฟ || ອາຫານເຊົ້າ ມີ ເຂົ້າ ໄຂ່ ແລະ=lae=and ກາເຟ || Breakfast is rice, eggs and coffee.
กาแฟ ร้อน และ หวาน || ກາເຟ ຮ້ອນ ແລະ ຫວານ || The coffee is hot and sweet.
วันนี้ วันอาทิตย์ ฉัน ว่าง || ມື້ນີ້ ວັນອາທິດ ຂ້ອຍ ຫວ່າງ || Today is Sunday, and I am free.
ฉัน อ่าน หนังสือ=nǎng-sʉ̌ʉ=book และ ฟัง เพลง=phleeng=song || ຂ້ອຍ ອ່ານ ປຶ້ມ=puem=book ແລະ ຟັງ ເພງ=pheng=song || I read a book and listen to songs.
ฉัน มีความสุข || ຂ້ອຍ ມີຄວາມສຸກ || I am happy.
@market|At the market|ที่ตลาด|ທີ່ຕະຫຼາດ
แม่ ไป ตลาด กับ ฉัน || ແມ່ ໄປ ຕະຫຼາດ ກັບ ຂ້ອຍ || Mum goes to the market with me.
ตลาด ใกล้ บ้าน || ຕະຫຼາດ ໃກ້ ເຮືອນ=huean=house / home || The market is near our home.
แม่ อยาก ซื้อ ผลไม้ || ແມ່ ຢາກ ຊື້ ໝາກໄມ້ || Mum wants to buy fruit.
มะม่วง ราคา เท่าไร || ໝາກມ່ວງ ລາຄາ ເທົ່າໃດ || How much are the mangoes?
ห้าสิบ=hâa-sìp=fifty บาท ค่ะ || ຫ້າສິບພັນ=ha sip phan=fifty thousand ກີບ ເຈົ້າ || Fifty (baht, or thousand kip).
แพง ไป=pai=too (much) หน่อย=nɔ̀i=a bit || ແພງ ໂພດ=phot=too (much) || That's a bit too expensive.
แม่ ซื้อ กล้วย แทน=thɛɛn=instead || ແມ່ ຊື້ ໝາກກ້ວຍ ແທນ=thaen=instead || Mum buys bananas instead.
กล้วย หวาน และ ถูก || ໝາກກ້ວຍ ຫວານ ແລະ ຖືກ || The bananas are sweet and cheap.
@noodles|The noodle shop|ร้านก๋วยเตี๋ยว|ຮ້ານເຝີ
เรา หิว เรา ไป ร้านอาหาร || ພວກເຮົາ ຫິວ ພວກເຮົາ ໄປ ຮ້ານອາຫານ || We are hungry, so we go to a restaurant.
ขอ เมนู ครับ || ຂໍ ເມນູ ແດ່=dae=please (softener) || The menu, please.
ผม สั่ง ก๋วยเตี๋ยว หมู || ຂ້ອຍ ສັ່ງ ເຝີ ໝູ || I order pork noodle soup.
เพื่อน สั่ง ข้าว ผัด=phàt=stir-fried กุ้ง || ໝູ່ ສັ່ງ ເຂົ້າ ຜັດ=phat=stir-fried ກຸ້ງ || My friend orders shrimp fried rice.
ไม่=mâi=not เผ็ด นะ ครับ || ບໍ່=bo=not ເຜັດ ເດີ || Not spicy, okay?
อร่อย มาก || ແຊບ ຫຼາຍ || Very tasty.
เรา อิ่ม แล้ว || ພວກເຮົາ ອີ່ມ ແລ້ວ || We are full.
เช็คบิล ครับ || ໄລ່ເງິນ ແດ່ || The bill, please.
@temple|The way to the temple|ไปวัด|ໄປວັດ
ฉัน อยาก ไป วัด || ຂ້ອຍ ຢາກ ໄປ ວັດ || I want to go to the temple.
ฉัน ไม่ รู้ ทาง || ຂ້ອຍ ບໍ່ ຮູ້ ທາງ || I don't know the way.
ฉัน ถาม ลุง ที่=thîi=at ร้าน || ຂ້ອຍ ຖາມ ລຸງ ທີ່=thi=at ຮ້ານ || I ask an old man at a shop.
วัด อยู่ ที่ไหน=thîi-nǎi=where ครับ || ວັດ ຢູ່ ໃສ=sai=where || Where is the temple?
ตรงไป แล้ว เลี้ยว ขวา || ກົງໄປ ແລ້ວ ລ້ຽວ ຂວາ || Go straight, then turn right.
ไกล ไหม || ໄກ ບໍ || Is it far?
ไม่ ไกล เดิน สิบ นาที || ບໍ່ ໄກ ຍ່າງ ສິບ ນາທີ || Not far: ten minutes on foot.
ขอบคุณ มาก ครับ || ຂອບໃຈ ຫຼາຍໆ=lai lai=very much || Thank you very much.
@family|My family|ครอบครัวของฉัน|ຄອບຄົວຂອງຂ້ອຍ
นี่=nîi=this คือ ภาพ ครอบครัว=khrɔ̂ɔp-khrua=family ของ=khɔ̌ɔng=of ฉัน || ນີ້=nii=this ແມ່ນ=maen=is ພາບ ຄອບຄົວ=khop khua=family ຂອງ=khong=of ຂ້ອຍ || This is a picture of my family.
พ่อ เป็น ครู || ພໍ່ ເປັນ ຄູ || Dad is a teacher.
แม่ ทำงาน ที่ ธนาคาร || ແມ່ ເຮັດວຽກ ທີ່ ທະນາຄານ || Mum works at a bank.
ฉัน มี น้อง สอง คน || ຂ້ອຍ ມີ ນ້ອງ ສອງ ຄົນ || I have two younger siblings.
น้อง ชอบ เล่น กับ หมา || ນ້ອງ ມັກ ຫຼິ້ນ ກັບ ໝາ || They like playing with the dog.
ยาย อายุ แปดสิบ=pɛ̀ɛt-sìp=eighty ปี || ແມ່ຕູ້ ອາຍຸ ແປດສິບ=paet sip=eighty ປີ || Grandma is eighty years old.
ยาย ใจดี และ ทำอาหาร อร่อย || ແມ່ຕູ້ ໃຈດີ ແລະ ແຕ່ງກິນ ແຊບ || Grandma is kind and cooks well.
ฉัน คิดถึง ทุกคน || ຂ້ອຍ ຄິດຮອດ ທຸກຄົນ || I miss everyone.
@sick|A sick day|วันที่ไม่สบาย|ມື້ທີ່ບໍ່ສະບາຍ
วันนี้ ฉัน ไม่ สบาย || ມື້ນີ້ ຂ້ອຍ ບໍ່ສະບາຍ || I'm not well today.
ฉัน ปวด หัว และ มี ไข้ || ຂ້ອຍ ເຈັບ ຫົວ ແລະ ເປັນ ໄຂ້ || I have a headache and a fever.
ฉัน ไอ ด้วย=dûai=too || ຂ້ອຍ ໄອ ນຳ=nam=too || I'm coughing too.
เพื่อน ช่วย ไป ร้านขายยา || ໝູ່ ຊ່ວຍ ໄປ ຮ້ານຂາຍຢາ || A friend helps by going to the pharmacy.
หมอ บอก ว่า=wâa=that ต้อง=tɔ̂ng=must นอน และ ดื่ม น้ำ || ໝໍ ບອກ ວ່າ=wa=that ຕ້ອງ=tong=must ນອນ ແລະ ດື່ມ ນ້ຳ || The doctor says I must sleep and drink water.
ฉัน กิน ยา แล้ว นอน || ຂ້ອຍ ກິນ ຢາ ແລ້ວ ນອນ || I take the medicine and sleep.
พรุ่งนี้ ฉัน จะ=jà=will สบาย ดี || ມື້ອື່ນ ຂ້ອຍ ຈະ=cha=will ສະບາຍ ດີ || Tomorrow I will be well.
@train|The night train|รถไฟกลางคืน|ລົດໄຟກາງຄືນ
เรา จะ ไป เชียงใหม่=chiang-mài=Chiang Mai || ພວກເຮົາ ຈະ ໄປ ວັງວຽງ=wang wiang=Vang Vieng || We are going to Chiang Mai (Vang Vieng in Lao).
เรา ซื้อ ตั๋ว รถไฟ ที่ สถานี || ພວກເຮົາ ຊື້ ປີ້ ລົດໄຟ ທີ່ ສະຖານີ || We buy train tickets at the station.
ตั๋ว ราคา หก ร้อย บาท || ປີ້ ລາຄາ ສອງ ແສນ ກີບ || The tickets cost 600 baht (200,000 kip).
รถไฟ ออก หก โมง=moong=o'clock เย็น=yen=evening || ລົດໄຟ ອອກ ຕອນແລງ || The train leaves in the evening.
ข้างนอก=khâang-nɔ̂ɔk=outside มี ภูเขา และ แม่น้ำ || ຂ້າງນອກ=khang nok=outside ມີ ພູເຂົາ ແລະ ແມ່ນ້ຳ || Outside there are mountains and rivers.
กลางคืน เรา นอน บน=bon=on รถไฟ || ກາງຄືນ ພວກເຮົາ ນອນ ເທິງ=thoeng=on ລົດໄຟ || At night we sleep on the train.
ตอนเช้า เรา ถึง แล้ว || ຕອນເຊົ້າ ພວກເຮົາ ຮອດ=hot=arrive ແລ້ວ || In the morning we arrive.
เมือง นี้=níi=this สวย มาก || ເມືອງ ນີ້ ງາມ ຫຼາຍ || This town is very beautiful.
@river|A hot day by the river|ริมแม่น้ำ|ແຄມແມ່ນ້ຳ
วันนี้ ร้อน มาก || ມື້ນີ້ ຮ້ອນ ຫຼາຍ || It's very hot today.
เรา ไป นั่ง ริม=rim=edge / side แม่น้ำ || ພວກເຮົາ ໄປ ນັ່ງ ແຄມ=khaem=edge / side ແມ່ນ້ຳ || We go and sit by the river.
น้อง สั่ง น้ำ มะพร้าว เย็น || ນ້ອງ ສັ່ງ ນ້ຳ ໝາກພ້າວ ເຢັນ || My little sister orders a cold coconut water.
ฉัน ดื่ม ชา ใส่=sài=put in น้ำแข็ง || ຂ້ອຍ ດື່ມ ຊາ ໃສ່=sai=put in ນ້ຳກ້ອນ || I drink tea with ice.
เรา เห็น เรือ ใหญ่ || ພວກເຮົາ ເຫັນ ເຮືອ ໃຫຍ່ || We see a big boat.
เด็ก เล่น น้ำ และ หัวเราะ=hǔa-rɔ́=laugh || ເດັກ ຫຼິ້ນ ນ້ຳ ແລະ ຫົວ=hua=laugh || Children play in the water and laugh.
ตอนเย็น ลม=lom=wind เย็น สบาย || ຕອນແລງ ລົມ=lom=wind ເຢັນ ສະບາຍ || In the evening the wind is cool and pleasant.
@dog|My dog|หมาของฉัน|ໝາຂອງຂ້ອຍ
ฉัน มี หมา หนึ่ง ตัว=tua=(classifier for animals) || ຂ້ອຍ ມີ ໝາ ໜຶ່ງ ໂຕ=to=(classifier for animals) || I have one dog.
หมา ชื่อ โชค || ໝາ ຊື່ ໂຊກ || The dog is called Chok, "Luck".
โชค ตัว เล็ก แต่=tɛ̀ɛ=but ดุ || ໂຊກ ໂຕ=to=body ນ້ອຍ ແຕ່=tae=but ດຸ || Chok is small but fierce.
ทุก=thúk=every เช้า=cháao=morning เรา เดิน ไป สนาม || ທຸກ=thuk=every ເຊົ້າ=sao=morning ພວກເຮົາ ຍ່າງ ໄປ ສະໜາມ || Every morning we walk to the field.
โชค ชอบ วิ่ง และ เล่น ลูก || ໂຊກ ມັກ ແລ່ນ ແລະ ຫຼິ້ນ ໝາກບານ=mak ban=ball || Chok likes running and playing with a ball.
โชค กลัว เสือ ใน=nai=in ภาพ || ໂຊກ ຢ້ານ ເສືອ ໃນ=nai=in ພາບ || Chok is afraid of the tiger in the picture.
ฉัน รัก โชค มาก || ຂ້ອຍ ຮັກ ໂຊກ ຫຼາຍ || I love Chok very much.
@study|Learning the language|เรียนภาษาไทย|ຮຽນພາສາລາວ
ฉัน เรียน ภาษา=phaa-sǎa=language ไทย=thai=Thai ทุก วัน || ຂ້ອຍ ຮຽນ ພາສາ=pha sa=language ລາວ=lao=Lao ທຸກ ມື້ || I study Thai (Lao) every day.
ฉัน อ่าน ป้าย=pâai=sign บน ถนน || ຂ້ອຍ ອ່ານ ປ້າຍ=pai=sign ເທິງ ຖະໜົນ || I read the signs on the street.
บาง=baang=some คำ=kham=word ยาก บาง คำ ง่าย || ບາງ=bang=some ຄຳ=kham=word ຍາກ ບາງ ຄຳ ງ່າຍ || Some words are hard, some are easy.
ครู สอน เสียง=sǐang=sound / tone ห้า เสียง || ຄູ ສອນ ສຽງ=siang=sound / tone ຫົກ ສຽງ || The teacher teaches the five tones (six in Lao).
ฉัน ฟัง และ พูด ตาม=taam=after / following || ຂ້ອຍ ຟັງ ແລະ ເວົ້າ ຕາມ=tam=after / following || I listen and repeat.
บางที=baang-thii=sometimes ฉัน ลืม แต่ ไม่เป็นไร || ບາງເທື່ອ=bang thua=sometimes ຂ້ອຍ ລືມ ແຕ່ ບໍ່ເປັນຫຍັງ || Sometimes I forget, but never mind.
ตอนนี้ ฉัน เข้าใจ มาก ขึ้น=khʉ̂n=more (rising) || ດຽວນີ້ ຂ້ອຍ ເຂົ້າໃຈ ຫຼາຍ ຂຶ້ນ=khuen=more (rising) || Now I understand more.
@nightmarket|The night market|ตลาดกลางคืน|ຕະຫຼາດກາງຄືນ
ตอนเย็น เรา ไป ตลาด กลางคืน || ຕອນແລງ ພວກເຮົາ ໄປ ຕະຫຼາດ ກາງຄືນ || In the evening we go to the night market.
คน เยอะ=yə́=many มาก || ຄົນ ຫຼາຍ ແທ້ || There are lots of people.
เรา กิน หมู ย่าง และ ข้าวเหนียว || ພວກເຮົາ ກິນ ໝູ ປີ້ງ ແລະ ເຂົ້າໜຽວ || We eat grilled pork and sticky rice.
พี่ ซื้อ เสื้อ=sʉ̂a=shirt ใหม่ || ອ້າຍ ຊື້ ເສື້ອ=suea=shirt ໃໝ່ || My older brother buys a new shirt.
ราคา ถูก แต่ สวย || ລາຄາ ຖືກ ແຕ່ ງາມ || It's cheap but nice.
มี คน ร้องเพลง และ เต้น || ມີ ຄົນ ຮ້ອງເພງ ແລະ ເຕັ້ນ || Someone is singing and dancing.
เรา กลับ บ้าน ดึก=dʉ̀k=late at night || ພວກເຮົາ ກັບ=kap=go back ເຮືອນ ດຶກ=duek=late at night || We go home late at night.
@post|At the post office|ที่ไปรษณีย์|ທີ່ໄປສະນີ
ฉัน อยาก ส่ง ของ=khɔ̌ɔng=thing / parcel ไป ประเทศ อังกฤษ=ang-krìt=England || ຂ້ອຍ ຢາກ ສົ່ງ ເຄື່ອງ=khueang=thing / parcel ໄປ ປະເທດ ອັງກິດ=ang kit=England || I want to send a parcel to England.
ไปรษณีย์ เปิด เก้า โมง || ໄປສະນີ ເປີດ ເກົ້າ ໂມງ=mong=o'clock || The post office opens at nine.
ฉัน รอ ห้า นาที || ຂ້ອຍ ຖ້າ ຫ້າ ນາທີ || I wait five minutes.
พนักงาน=phá-nák-ngaan=clerk ถาม ว่า ข้างใน=khâang-nai=inside มี อะไร=à-rai=what || ພະນັກງານ=pha nak ngan=clerk ຖາມ ວ່າ ຂ້າງໃນ=khang nai=inside ມີ ຫຍັງ=nyang=what || The clerk asks what is inside.
ฉัน ตอบ ว่า ขนม และ ภาพ || ຂ້ອຍ ຕອບ ວ່າ ເຂົ້າໜົມ ແລະ ພາບ || I answer: snacks and pictures.
ค่า=khâa=fee ส่ง ห้า ร้อย บาท || ຄ່າ=kha=fee ສົ່ງ ໜຶ່ງ ແສນ ກີບ || Postage is 500 baht (100,000 kip).
ฉัน จ่าย เงิน แล้ว กลับ บ้าน || ຂ້ອຍ ຈ່າຍ ເງິນ ແລ້ວ ກັບ=kap=go back ເຮືອນ || I pay and go home.`;
const LIBRARY = (() => {
  const out = [];
  LIBRARY_SRC.split("\n").forEach((line) => {
    if (line.startsWith("@")) { const [id, title, th, lo] = line.slice(1).split("|"); out.push({ id, title, th, lo, raw: [] }); return; }
    const [th, lo, en] = line.split("||").map((x) => x.trim());
    if (en) out[out.length - 1].raw.push({ th, lo, en });
  });
  return out;
})();
const storyCache = {};
/** A story's sentences as tokens for one script (parsed on first use). */
function storyText(story, script) {
  const key = `${story.id}:${script}`;
  if (!storyCache[key]) storyCache[key] = story.raw.map((s) => ({ en: s.en, tokens: tokenizeLine(s[script], script).map((tk) => resolveToken(tk, script)) }));
  return storyCache[key];
}
function storyKnown(story, script, srs) {
  const toks = storyText(story, script).flatMap((s) => s.tokens).filter((tk) => tk.item);
  if (!toks.length) return 1;
  return toks.filter((tk) => (srs[tk.item.id]?.stage || 0) >= 1).length / toks.length;
}
const LIBRARY_OPEN_AT = 0.9;

function LanternLibrary({ mode, srs, sandbox, library = {}, setLibrary, logActivity }) {
  const script = mode === "lo" ? "lo" : "th";
  const prefs = usePrefs();
  const [openId, setOpenId] = useState(null);
  const story = LIBRARY.find((s) => s.id === openId);
  if (story) return <StoryReader story={story} script={script} srs={srs} prefs={prefs} library={library} setLibrary={setLibrary} logActivity={logActivity} onBack={() => setOpenId(null)} />;
  return (
    <div className="space-y-4">
      <SectionTitle icon={Library} title="Lantern Library" sub="Short stories written from words in the course and the Word Garden. A story opens when you know 90% of its words." color="#FFD166" />
      <div className="grid gap-3 sm:grid-cols-2">
        {LIBRARY.map((s, i) => {
          const pct = storyKnown(s, script, srs);
          const open = sandbox || pct >= LIBRARY_OPEN_AT;
          const reads = library.reads?.[`${s.id}:${script}`] || [];
          return (
            <button key={s.id} onClick={() => setOpenId(s.id)} className={`rounded-3xl border p-4 text-left transition ${open ? "border-amber-300/30 bg-amber-300/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-300/80">{open ? <BookOpen size={12} /> : <Lock size={12} />} Story {i + 1}</div>
              <div className="mt-1 text-2xl text-white" lang={script} style={{ fontFamily: FONT_STACKS.loop[script] }}>{script === "lo" ? s.lo : s.th}</div>
              <div className="text-sm text-slate-300">{s.title}</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct * 100}%` }} /></div>
                <span className="text-[11px] tabular-nums text-slate-400">{Math.round(pct * 100)}% known</span>
              </div>
              {reads.length > 0 && <div className="mt-1 text-[11px] text-slate-400">Read {reads.length}× · best {Math.max(...reads.map((r) => r.cpm))} letters/min</div>}
            </button>
          );
        })}
      </div>
      {script === "lo" && <p className="text-xs text-slate-400">The Lao versions are a first draft and still need a check by a native speaker.</p>}
    </div>
  );
}

function StoryReader({ story, script, srs, prefs, library, setLibrary, logActivity, onBack }) {
  const sentences = storyText(story, script);
  const fontFam = FONT_STACKS.loop[script];
  const [sel, setSel] = useState(null); // [si, ti]
  const [shownEn, setShownEn] = useState({});
  const [playing, setPlaying] = useState(-1);
  const [timer, setTimer] = useState(null);
  const [, tick] = useState(0);
  const [toast, setToast] = useState("");
  const playRef = useRef({ on: false });
  const key = `${story.id}:${script}`;
  const reads = library.reads?.[key] || [];
  const mined = library.mined || [];
  const letters = sentences.reduce((n, s) => n + s.tokens.reduce((m, tk) => m + [...tk.t].filter((c) => /[ก-๛຀-໿]/.test(c)).length, 0), 0);
  const known = Math.round(storyKnown(story, script, srs) * 100);
  useEffect(() => () => { playRef.current.on = false; getAudio().cancelSpeech(); }, []);
  useEffect(() => { if (!timer) return undefined; const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id); }, [timer]);
  const speakSentence = (s) => { const a = getAudio(); const tts = s.tokens.map((tk) => tk.tts || tk.t).join(" "); if (script === "lo") a.speakHumanVoice(tts, s.tokens.map((tk) => tk.t).join("")); else a.speakHumanVoice(tts); };
  // Read aloud, sentence by sentence, highlighting the one being read.
  const readAloud = async () => {
    if (playRef.current.on) { playRef.current.on = false; getAudio().cancelSpeech(); setPlaying(-1); return; }
    playRef.current.on = true;
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    for (let i = 0; i < sentences.length && playRef.current.on; i += 1) {
      setPlaying(i);
      speakSentence(sentences[i]);
      const t0 = Date.now();
      const minMs = 600 + sentences[i].tokens.length * 250;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => { const id = setInterval(() => { const el = Date.now() - t0; if (!playRef.current.on || (el > minMs && !(synth?.speaking || synth?.pending)) || el > 20000) { clearInterval(id); res(); } }, 150); });
    }
    playRef.current.on = false;
    setPlaying(-1);
  };
  const toggleTimer = () => {
    if (!timer) { setTimer(Date.now()); return; }
    const secs = (Date.now() - timer) / 1000;
    setTimer(null);
    const cpm = Math.round(letters / (secs / 60));
    setLibrary?.((l) => ({ ...l, reads: { ...(l.reads || {}), [key]: [...(l.reads?.[key] || []), { at: Date.now(), secs: Math.round(secs * 10) / 10, cpm }].slice(-20) } }));
    logActivity?.({ reads: 1 });
  };
  const mine = (i) => {
    const id = `${story.id}:${i}:${script}`;
    if (!mined.includes(id)) setLibrary?.((l) => ({ ...l, mined: [...(l.mined || []), id] }));
    haptic("ok");
    setToast("Added to the Sentence deck");
    setTimeout(() => setToast(""), 1600);
  };
  const press = useRef(null);
  const selTok = sel ? sentences[sel[0]].tokens[sel[1]] : null;
  return (
    <div className="space-y-4 pb-40">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-300"><ChevronLeft size={16} /> Library</button>
      <div>
        <div className="text-3xl text-white" lang={script} style={{ fontFamily: fontFam }}>{script === "lo" ? story.lo : story.th}</div>
        <div className="text-sm text-slate-400">{story.title} · you know {known}% of the words</div>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <button onClick={readAloud} className={`rounded-xl px-3 py-2 font-semibold ${playing >= 0 ? "bg-rose-500 text-white" : "bg-white/10 text-white"}`}><Volume2 size={14} className="mr-1 inline" />{playing >= 0 ? "Stop" : "Read aloud"}</button>
        <button onClick={toggleTimer} className={`rounded-xl px-3 py-2 font-bold ${timer ? "bg-rose-500 text-white" : "bg-amber-500 text-black"}`}>{timer ? `Done · ${((Date.now() - timer) / 1000).toFixed(0)} s` : "Time my reading"}</button>
      </div>
      <Card className="p-5">
        <div className="space-y-1 text-[1.9rem] leading-[1.9]" lang={script} style={{ fontFamily: fontFam }}>
          {sentences.map((s, si) => (
            <div key={si} className={`rounded-xl px-1 transition ${playing === si ? "bg-amber-400/15" : ""}`}
              onContextMenu={(e) => { e.preventDefault(); mine(si); }}
              onPointerDown={() => { clearTimeout(press.current); press.current = setTimeout(() => mine(si), 600); }}
              onPointerUp={() => clearTimeout(press.current)} onPointerLeave={() => clearTimeout(press.current)} onPointerMove={() => clearTimeout(press.current)}>
              <span className="select-none">
                {s.tokens.map((tk, ti) => (
                  <button key={ti} onClick={() => { setSel([si, ti]); getAudio().speakHumanVoice(tk.tts || tk.t, script === "lo" ? tk.t : undefined); }} className={`rounded ${sel && sel[0] === si && sel[1] === ti ? "bg-amber-400/30" : ""}`} style={{ color: "rgb(var(--sk-ink))" }}>
                    <TintedWord text={tk.t} tones={script === "th" ? tk.tone : null} level={tk.item ? tintLevel(srs[tk.item.id]) : 0} enabled={prefs.tint && !tk.num} />
                  </button>
                ))}
              </span>
              <button onClick={() => setShownEn((m) => ({ ...m, [si]: !m[si] }))} className="ml-2 align-middle text-[11px] font-semibold text-slate-500" style={{ fontFamily: UI_FONT }}>EN</button>
              {shownEn[si] && <div className="pb-1 text-sm leading-snug text-slate-400" style={{ fontFamily: UI_FONT }}>{s.en} <button onClick={() => mine(si)} className="ml-1 text-amber-300 underline">+ card</button></div>}
            </div>
          ))}
        </div>
      </Card>
      <p className="text-xs text-slate-400">Tap a word for its meaning. Press and hold a sentence, or tap EN then + card, to add it to the Sentence deck.</p>
      {reads.length > 0 && (
        <Card className="p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Your reading speed</div>
          <div className="mt-2 flex h-16 items-end gap-1">
            {reads.map((r, k) => <div key={k} className="flex-1 rounded-t bg-amber-400/70" style={{ height: `${(r.cpm / Math.max(...reads.map((x) => x.cpm))) * 100}%` }} title={`${r.cpm}/min`} />)}
          </div>
          <div className="mt-1 text-xs text-slate-300">First {reads[0].cpm} letters a minute{reads.length > 1 ? `, latest ${reads[reads.length - 1].cpm}` : ""}.</div>
        </Card>
      )}
      {toast && <div className="fixed inset-x-0 bottom-28 z-40 mx-auto w-max rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black">{toast}</div>}
      {selTok && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-xl px-3 sm:bottom-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-sk-panel/95 p-3 shadow-2xl backdrop-blur">
            <div className="text-3xl text-white" lang={script} style={{ fontFamily: fontFam }}>{selTok.t}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-white">{script === "th" ? R(selTok.r) : selTok.r}</div>
              <div className="truncate text-xs text-slate-300">{selTok.m}</div>
              {selTok.tone && <div className="mt-1 flex flex-wrap gap-1">{selTok.tone.map((tn, i) => <ToneBadge key={i} tone={tn} small />)}</div>}
            </div>
            <button onClick={() => getAudio().speakHumanVoice(selTok.tts || selTok.t, script === "lo" ? selTok.t : undefined)} className="rounded-xl border border-white/10 p-2 text-slate-200" aria-label="Speak"><Volume2 size={16} /></button>
            <button onClick={() => setSel(null)} className="p-1 text-slate-400" aria-label="Close"><X size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * Ride the line (D25): a timed run of signs in the order you meet them. Read
 * each one before the train moves on.
 * ========================================================================== */
const RIDE_ROUTES = {
  th: { name: "Bangkok, stop to stop", stops: ["busstop", "road", "pier", "hospital", "pharmacy", "parking", "massage", "sale", "nightmarket", "cart"] },
  lo: { name: "Vientiane to Luang Prabang", stops: ["lo-bus", "lo-road", "lo-pharmacy", "lo-noodle"] },
};
function rideRun(script) {
  const packs = SIGN_PACKS().filter((p) => p.script === script);
  const route = RIDE_ROUTES[script];
  const allGloss = packs.flatMap((p) => p.glosses.filter(Boolean));
  return route.stops.map((id) => {
    const pack = packs.find((p) => p.id === id);
    const k = Math.floor(Math.random() * pack.lines.length);
    const gloss = pack.glosses[k];
    return { pack, line: pack.lines[k].map((tk) => resolveToken(tk, script)), answer: gloss, opts: shuffle([gloss, ...shuffle(allGloss.filter((g) => g !== gloss)).slice(0, 3)]) };
  });
}

function RideTheLine({ mode, drills = {}, setDrills, logActivity }) {
  const script = mode === "lo" ? "lo" : "th";
  const route = RIDE_ROUTES[script];
  const [run, setRun] = useState(null); // { stops, i, picks: [], start, stopStart, done }
  const [, tick] = useState(0);
  const limit = (i) => Math.max(6, 14 - i) * 1000;
  useEffect(() => {
    if (!run || run.done || run.picks[run.i] !== undefined) return undefined;
    const id = setInterval(() => {
      tick((n) => n + 1);
      if (Date.now() - run.stopStart > limit(run.i)) setRun((r) => (r && r.picks[r.i] === undefined ? { ...r, picks: [...r.picks, null] } : r));
    }, 100);
    return () => clearInterval(id);
  }, [run]);
  const best = drills.ride?.[script];
  const start = () => setRun({ stops: rideRun(script), i: 0, picks: [], start: Date.now(), stopStart: Date.now(), done: false });
  const choose = (o) => {
    if (!run || run.picks[run.i] !== undefined) return;
    const ok = o === run.stops[run.i].answer;
    haptic(ok ? "ok" : "miss");
    setRun({ ...run, picks: [...run.picks, o] });
  };
  const next = () => {
    if (run.i + 1 >= run.stops.length) {
      const right = run.picks.filter((p, k) => p === run.stops[k].answer).length;
      const secs = (Date.now() - run.start) / 1000;
      setRun({ ...run, done: true, right, secs });
      logActivity?.({ signs: run.stops.length });
      setDrills?.((d) => { const cur = d.ride?.[script]; const better = !cur || right > cur.right || (right === cur.right && secs < cur.secs); return better ? { ...d, ride: { ...(d.ride || {}), [script]: { right, secs, of: run.stops.length } } } : d; });
      return;
    }
    setRun({ ...run, i: run.i + 1, stopStart: Date.now() });
  };
  const fontFor = (style) => (script === "lo" ? '"Noto Sans Lao", "Phetsarath OT", sans-serif' : style.font || '"Kanit", "Noto Sans Thai", sans-serif');
  if (!run) {
    return (
      <div className="space-y-4">
        <SectionTitle icon={Train} title="Ride the line" sub={`${route.name}: ${route.stops.length} signs in the order you meet them. Each stop gives you a few seconds less.`} color="#7CF0B0" />
        <Card className="p-5 text-center">
          <div className="flex items-center justify-center gap-1.5">{route.stops.map((s) => <span key={s} className="h-2.5 w-2.5 rounded-full bg-emerald-400/40" />)}</div>
          {best && <p className="mt-3 text-sm text-slate-300">Best: {best.right}/{best.of} in {best.secs.toFixed(1)} s</p>}
          <button onClick={start} className="mt-4 w-full rounded-2xl bg-emerald-500 py-3 font-bold text-black">Board the train</button>
        </Card>
      </div>
    );
  }
  if (run.done) {
    return (
      <div className="space-y-4">
        <SectionTitle icon={Train} title="End of the line" sub={route.name} color="#7CF0B0" />
        <Card className="p-5 text-center">
          <div className="text-4xl font-black text-white">{run.right}/{run.stops.length}</div>
          <div className="text-sm text-slate-300">signs read in {run.secs.toFixed(1)} s</div>
          <div className="mt-4 space-y-1.5 text-left text-sm">
            {run.stops.map((s, k) => (
              <div key={k} className="flex items-center gap-2"><span className={run.picks[k] === s.answer ? "text-emerald-300" : "text-rose-300"}>{run.picks[k] === s.answer ? <Check size={14} /> : <X size={14} />}</span><span className="text-slate-200">{s.answer}</span></div>
            ))}
          </div>
          <button onClick={start} className="mt-4 w-full rounded-2xl bg-emerald-500 py-3 font-bold text-black">Ride again</button>
        </Card>
      </div>
    );
  }
  const stop = run.stops[run.i];
  const style = STREET_STYLES[stop.pack.style];
  const picked = run.picks[run.i];
  const answered = picked !== undefined;
  const left = Math.max(0, limit(run.i) - (Date.now() - run.stopStart));
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        {run.stops.map((s, k) => <span key={k} className={`h-2 flex-1 rounded-full ${k < run.i ? (run.picks[k] === s.answer ? "bg-emerald-400" : "bg-rose-400") : k === run.i ? "bg-amber-400" : "bg-white/15"}`} />)}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400"><span>Stop {run.i + 1} · {stop.pack.title}</span><span className="tabular-nums">{answered ? "" : `${(left / 1000).toFixed(1)} s`}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400" style={{ width: `${answered ? 0 : (left / limit(run.i)) * 100}%` }} /></div>
      <div className="rounded-3xl p-5 text-center shadow-2xl" style={{ background: style.card, border: `1px solid ${style.border}` }}>
        <div className="flex flex-wrap items-baseline justify-center gap-x-2">
          {stop.line.map((tk, k) => <span key={k} className="text-4xl leading-[1.6]" lang={script} style={{ color: tk.price ? style.accent : style.ink, fontFamily: fontFor(style), textShadow: style.glow }}>{tk.t}</span>)}
        </div>
        {answered && <div className="mt-1 text-sm" style={{ color: style.accent }}>{stop.line.map((tk) => (script === "th" ? R(tk.r) : tk.r)).filter(Boolean).join(" · ")}</div>}
      </div>
      <div className="grid gap-2">
        {stop.opts.map((o) => {
          const right = answered && o === stop.answer;
          const wrong = answered && picked === o && o !== stop.answer;
          return <button key={o} onClick={() => choose(o)} className={`rounded-2xl border px-4 py-3 text-left text-sm ${right ? "border-emerald-400 bg-emerald-500/20 text-white" : wrong ? "border-rose-400 bg-rose-500/20 text-white" : "border-white/10 bg-white/[0.04] text-slate-100"}`}>{o}</button>;
        })}
      </div>
      {answered && (
        <div className="flex gap-2">
          <button onClick={() => getAudio().speakHumanVoice(stop.line.map((tk) => tk.tts || tk.t).join(" "), script === "lo" ? stop.line.map((tk) => tk.t).join(" ") : undefined)} className="rounded-2xl border border-white/15 px-4 py-3 text-slate-200" aria-label="Play"><Volume2 size={16} /></button>
          <button onClick={next} className="flex-1 rounded-2xl bg-amber-500 py-3 font-bold text-black">{picked === null ? "The train left · next stop" : run.i + 1 >= run.stops.length ? "Finish" : "Next stop"}</button>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * Keyboard and dictation (N10): hear a word, type it on the layout your phone
 * uses. Thai is Kedmanee, the layout in Gboard and Samsung Keyboard. The next
 * key glows at first and the glow fades as you learn where keys are.
 * ========================================================================== */
const KEYMAPS = {
  th: {
    name: "Kedmanee",
    rows: ["ๅ/-ภถุึคตจขช", "ๆไำพะัีรนยบลฃ", "ฟหกดเ้่าสวง", "ผปแอิืทมใฝ"],
    shift: ["+๑๒๓๔ู฿๕๖๗๘๙", "๐\"ฎฑธํ๊ณฯญฐ,ฅ", "ฤฆฏโฌ็๋ษศซ.", "()ฉฮฺ์?ฒฬฦ"],
  },
  lo: {
    name: "Lao",
    rows: ["ຢຟໂຖຸູຄຕຈຂຊໍ", "ົໄຳພະິີຮນຍບລ", "ັຫກດເ້່າສວງ", "ຜປແອຶືທມໃຝ"],
    // Rarer letters and marks. Phones place these differently, so they sit on one shifted page.
    shift: ["໑໒໓໔໕໖໗໘໙໐", "໊໋ຣໜໝຽໆຯ໌ຼ", "", ""],
  },
};
const KEY_GLOW_FADE = 600; // correct keystrokes until the glow only shows when you hesitate
/** Where a character sits: its row, column, and whether it needs Shift. */
function keyFor(ch, script) {
  const map = KEYMAPS[script];
  for (const [layer, rows] of [[false, map.rows], [true, map.shift]]) {
    for (let r = 0; r < rows.length; r += 1) {
      const c = [...rows[r]].indexOf(ch);
      if (c >= 0) return { row: r, col: c, shift: layer };
    }
  }
  return null;
}
const typeable = (word, script) => [...word].every((ch) => keyFor(ch, script));

/** Words to type: started course and garden words first, else the early levels. */
function dictationPool(mode, srs = {}) {
  const script = mode === "lo" ? "lo" : "th";
  const seen = new Set();
  const all = courseItems(mode).filter((it) => {
    const w = it[script];
    if (!w || it.tier === "glyph" || /\s/.test(w) || [...w].length > 9 || seen.has(w) || !typeable(w, script)) return false;
    seen.add(w);
    return true;
  });
  const started = all.filter((it) => srs[it.id]);
  return { script, words: started.length >= 4 ? started : all.filter((it) => it.level <= 3) };
}

function KeyboardDojo({ mode, srs = {}, setSrs, kb = {}, setKb, logActivity }) {
  const pool = useMemo(() => dictationPool(mode, srs), [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const { script } = pool;
  const map = KEYMAPS[script];
  const pick = useCallback(() => {
    const due = pool.words.filter((it) => srs[it.id]?.fsrs?.spell && srs[it.id].next <= Date.now());
    const from = due.length ? due : pool.words;
    return from[Math.floor(Math.random() * from.length)];
  }, [pool]); // eslint-disable-line react-hooks/exhaustive-deps
  const [item, setItem] = useState(() => pick());
  const [typed, setTyped] = useState("");
  const [shift, setShift] = useState(false);
  const [misses, setMisses] = useState(0);
  const [bad, setBad] = useState(null);
  const [done, setDone] = useState(null);
  const [idle, setIdle] = useState(false);
  const target = item ? [...item[script]] : [];
  const pos = [...typed].length;
  const nextCh = target[pos];
  const nextKey = nextCh ? keyFor(nextCh, script) : null;
  const learned = Math.min(1, (kb.typed || 0) / KEY_GLOW_FADE);
  const glow = idle || misses > 0 ? 1 : 1 - learned;
  const say = useCallback(() => {
    if (!item) return;
    const audio = getAudio();
    if (script === "lo") audio.speakHumanVoice(item.ttsLo || item.ttsTh, item.lo); else audio.speakHumanVoice(item.ttsTh);
  }, [item, script]);
  useEffect(() => { const id = setTimeout(say, 250); return () => clearTimeout(id); }, [item]); // eslint-disable-line react-hooks/exhaustive-deps
  // After 2.5 seconds without a key, the next key lights up again.
  useEffect(() => { setIdle(false); const id = setTimeout(() => setIdle(true), 2500); return () => clearTimeout(id); }, [typed, item]);
  useEffect(() => { if (nextKey) setShift(nextKey.shift && glow > 0.3 ? true : shift && nextKey.shift); }, [pos, item]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (miss) => {
    const g = miss === 0 ? 3 : miss <= 2 ? 2 : 1;
    const cur = srs[item.id];
    if (cur && setSrs) {
      setSrs((prev) => ({ ...prev, [item.id]: scheduleItem(prev[item.id], { spell: g }) }));
      logReview(item.id, "spell", g, { from: "keys" });
    }
    logActivity?.({ drills: 1 });
    setKb?.((k) => ({ ...k, words: (k.words || 0) + 1, clean: (k.clean || 0) + (miss === 0 ? 1 : 0) }));
    setDone({ g, scheduled: !!cur });
    haptic(g >= 2 ? "ok" : "bad");
  };
  const press = (ch) => {
    if (done || !nextCh) return;
    if (ch === nextCh) {
      const t = typed + ch;
      setTyped(t);
      setBad(null);
      setKb?.((k) => ({ ...k, typed: (k.typed || 0) + 1 }));
      if (!(keyFor(ch, script)?.shift)) setShift(false);
      if ([...t].length === target.length) finish(misses);
    } else {
      setMisses((m) => m + 1);
      setBad(ch);
      haptic("bad");
    }
  };
  const next = () => { setItem(pick()); setTyped(""); setMisses(0); setBad(null); setDone(null); setShift(false); };
  // A hardware keyboard set to Thai or Lao works too.
  useEffect(() => {
    const on = (e) => { if (e.key && [...e.key].length === 1 && keyFor(e.key, script)) { e.preventDefault(); press(e.key); } };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });
  if (!item) return <Card className="p-4 text-sm text-slate-300">No words to type yet. Start a few lessons in the Shrine.</Card>;
  const rows = shift ? map.shift : map.rows;
  const label = (ch) => (COMBINING.test(ch) ? `◌${ch}` : ch);
  const fontFamily = FONT_STACKS.street[script];
  return (
    <div className="space-y-3" data-keyboard-dojo>
      <SectionTitle icon={Keyboard} title="Keyboard and dictation" sub={`Hear a word and type it on the ${map.name} layout your phone uses. The next key glows less as you learn the layout.`} color={COLORS.cyan} />
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <button onClick={say} aria-label="Hear it again" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-black active:scale-95"><Volume2 size={22} /></button>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-slate-300">{item.meaning}</div>
            <div className="text-xs text-slate-500">{script === "lo" ? item.loRoman : R(item.thRoman)}</div>
          </div>
          <div className="text-right text-[11px] text-slate-500">{kb.words || 0} typed<br />{Math.round(learned * 100)}% of glow faded</div>
        </div>
        <div className="mt-3 flex min-h-[3.5rem] items-center justify-center rounded-2xl bg-black/30 px-3 text-4xl leading-[1.6]" lang={script} style={{ fontFamily }} data-typed>
          <span className="text-white">{typed}</span>
          {done ? null : <span className="ml-0.5 inline-block h-9 w-0.5 animate-pulse bg-cyan-400" />}
        </div>
        {done && (
          <div className="mt-3 flex items-center gap-3">
            <div className={`text-sm font-semibold ${done.g === 3 ? "text-emerald-300" : done.g === 2 ? "text-amber-300" : "text-rose-300"}`} data-kb-result>
              {done.g === 3 ? "Spelled clean." : `${misses} wrong key${misses === 1 ? "" : "s"}.`} {done.scheduled ? "Saved to the spelling track." : "Practice only: start this word in the Shrine to schedule it."}
            </div>
            <button data-kb-next onClick={next} className="ml-auto shrink-0 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-black">Next</button>
          </div>
        )}
      </Card>
      <div className="select-none space-y-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5" lang={script} style={{ fontFamily }}>
        {rows.map((row, r) => (
          <div key={r} className="flex gap-1" style={{ paddingLeft: `${r * 3}%` }}>
            {[...row].map((ch, c) => {
              const isNext = nextKey && nextKey.row === r && nextKey.col === c && nextKey.shift === shift;
              const wrong = bad === ch;
              return (
                <button key={c} data-key={ch} onClick={() => press(ch)} className={`h-11 min-w-0 flex-1 rounded-lg text-lg leading-none transition active:scale-95 ${wrong ? "bg-rose-500/40 text-white" : "bg-white/[0.07] text-slate-100"}`}
                  style={isNext && glow > 0 ? { boxShadow: `0 0 0 2px rgba(34,211,238,${glow}), 0 0 ${14 * glow}px rgba(34,211,238,${glow})`, background: `rgba(34,211,238,${0.25 * glow})` } : undefined}>
                  {label(ch)}
                </button>
              );
            })}
          </div>
        ))}
        <div className="flex gap-1">
          <button data-key-shift onClick={() => setShift(!shift)} className={`h-11 flex-[2] rounded-lg text-sm font-semibold ${shift ? "bg-cyan-400/30 text-white" : "bg-white/[0.07] text-slate-300"}`}
            style={nextKey && nextKey.shift !== shift && glow > 0 ? { boxShadow: `0 0 0 2px rgba(34,211,238,${glow})` } : undefined}>⇧ Shift</button>
          <button onClick={() => { setTyped([...typed].slice(0, -1).join("")); }} className="h-11 flex-1 rounded-lg bg-white/[0.07] text-sm text-slate-300" aria-label="Delete">⌫</button>
          <button onClick={next} className="h-11 flex-[2] rounded-lg bg-white/[0.07] text-sm text-slate-300">Skip</button>
        </div>
      </div>
      <p className="text-xs text-slate-500">{script === "th" ? "This is the standard Thai layout. Turn on Thai in Samsung Keyboard or Gboard and the keys sit in the same places." : "The main Lao rows follow the common Lao layout. Phones put the rarer marks in different places, so they share one shifted page here. A Lao speaker should check this layout."}</p>
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
 * Tone tint: colour each syllable by its tone, fading as you learn the word.
 * ========================================================================== */
/** 0 = full colour, 1 = underline only, 2 = plain, from the word's tone memory. */
function tintLevel(srsEntry) {
  const st = srsEntry?.stage || 0;
  return st >= 5 ? 2 : st >= 3 ? 1 : 0;
}
function TintedSyllables({ syllables, level = 0, enabled = true, className = "", style = {}, script = "th" }) {
  return (
    <span lang={script} className={className} style={style}>
      {syllables.map((sy, k) => {
        const t = TONES[sy.tone];
        if (!enabled || !t || sy.raw || level >= 2) return <span key={k}>{sy.text}</span>;
        if (level === 1) return <span key={k} style={{ textDecoration: "underline", textDecorationColor: t.color, textUnderlineOffset: "0.28em", textDecorationThickness: "2px" }}>{sy.text}</span>;
        return <span key={k} style={{ color: t.ink }}>{sy.text}</span>;
      })}
    </span>
  );
}
/** Tint a known string whose tones are listed (street tokens, slicer words). */
function TintedWord({ text, tones, level = 0, enabled = true, className = "", style = {} }) {
  const syl = useMemo(() => (/[ก-๎]/.test(text) ? readThai(text) : []), [text]);
  if (!enabled || !tones?.length || syl.length !== tones.length) return <span className={className} style={style}>{text}</span>;
  return <TintedSyllables syllables={syl.map((x, k) => ({ ...x, tone: tones[k] }))} level={level} className={className} style={style} />;
}

/* ============================================================================
 * Decoder: paste any Thai or Lao and see how every syllable is read.
 * ========================================================================== */
const DECODER_EXAMPLES = ["ข้าวผัดกุ้ง", "ห้องน้ำอยู่ที่ไหน", "ร้านกาแฟเปิดกี่โมง", "ขนมไทยอร่อยมาก", "ສະບາຍດີ", "ຕະຫຼາດເຊົ້າ"];

function decodeLao(text) {
  return text.split(/\s+/).filter(Boolean).map((w) => {
    const sylls = laoSyllables(w).map((sy) => {
      const p = laoSyllable(sy);
      return p ? { text: sy, ...p, roman: "", notes: [], parts: p, lao: true } : { text: sy, raw: true };
    });
    const known = courseItems("lo").find((it) => it.lo === w && it.tier !== "glyph");
    return { text: w, known: !!known, meaning: known?.meaning, id: known?.id, roman: known?.loRoman?.split(" ·")[0], syllables: sylls, lao: true };
  });
}

function SyllableCard({ sy, roman }) {
  if (sy.raw) return <div className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-slate-400"><span className="mr-2 text-2xl text-white" style={{ fontFamily: FONT_STACKS.loop.th }}>{sy.text}</span>not a syllable (digit, repeat mark or symbol)</div>;
  const t = TONES[sy.tone];
  const kind = sy.live ? "live" : `dead, ${sy.long ? "long" : "short"}`;
  const formula = sy.lao ? explainLaoTone(sy) : computeTone(sy.parts).formula;
  return (
    <div className="grid grid-cols-[64px_1fr] items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
      <div className="text-center text-3xl leading-[1.6]" lang={sy.lao ? "lo" : "th"} style={{ fontFamily: sy.lao ? FONT_STACKS.loop.lo : FONT_STACKS.loop.th, color: t?.ink }}>{sy.text}</div>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {t && <ToneBadge tone={sy.tone} small />}
          {roman && <span className="text-sm font-semibold text-white">{roman}</span>}
          {sy.guess && <span className="rounded-full border border-amber-400/40 px-2 py-0.5 text-[10px] font-semibold text-amber-200" title="The vowel isn't written, so this reading is inferred.">guess</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
          <ClassBadge cls={sy.cls} small /> <span>{kind}</span> <span className="text-slate-400">· {MARKS[sy.mark]?.plain || "no mark"}</span>
        </div>
        <div className="text-xs text-slate-400">{formula}</div>
        {sy.notes?.map((n) => <div key={n} className="text-xs text-amber-200/90">{n}</div>)}
      </div>
    </div>
  );
}

function Decoder({ srs, initialText, onInspect, saved = [], setSaved }) {
  const prefs = usePrefs();
  const audio = getAudio();
  const [text, setText] = useState(initialText || DECODER_EXAMPLES[0]);
  useEffect(() => { if (initialText) setText(initialText); }, [initialText]);
  const isLao = /[຀-໿]/.test(text) && !/[ก-๛]/.test(text);
  const words = useMemo(() => {
    const clean = text.slice(0, 400);
    return isLao ? decodeLao(clean) : segmentThai(clean);
  }, [text, isLao]);
  const [open, setOpen] = useState(0);
  useEffect(() => setOpen(0), [text]);
  const romanOf = (w, sy) => romanize(sy.roman || "", prefs.roman);
  const course = courseItems(isLao ? "lo" : "th");
  const levelOf = (w) => (w.id ? tintLevel(srs[w.id]) : 0);
  const isSaved = (w) => saved.some((x) => x.th === w.text);
  const save = (w) => setSaved?.((list) => (list.some((x) => x.th === w.text) ? list : [...list, { th: w.text, roman: w.syllables.map((x) => x.roman).filter(Boolean).join("-"), tone: w.syllables.map((x) => x.tone).filter(Boolean), script: isLao ? "lo" : "th", at: Date.now() }]));
  const readable = words.filter((w) => !w.other);
  const knownCount = readable.filter((w) => w.known).length;
  return (
    <div className="space-y-4">
      <SectionTitle icon={Search} title="Decoder" sub="Type or paste any Thai or Lao: a menu, a sign, a message. Every syllable is read from its spelling." color={COLORS.gold} />
      <Card className="space-y-3 p-4">
        <label htmlFor="decoder-input" className="sr-only">Thai or Lao text</label>
        <textarea
          id="decoder-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          spellCheck={false}
          autoCorrect="off"
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-2xl leading-[1.7] text-white outline-none focus:border-amber-400"
          style={{ fontFamily: isLao ? FONT_STACKS.loop.lo : FONT_STACKS.loop.th }}
          placeholder="วางข้อความที่นี่ · paste here"
        />
        <div className="flex flex-wrap items-center gap-2">
          {DECODER_EXAMPLES.map((ex) => <Chip key={ex} active={text === ex} onClick={() => setText(ex)}><span style={{ fontFamily: /[຀-໿]/.test(ex) ? FONT_STACKS.loop.lo : FONT_STACKS.loop.th }}>{ex}</span></Chip>)}
          <button onClick={() => navigator.clipboard?.readText?.().then((t) => t && setText(t)).catch(() => {})} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">Paste</button>
        </div>
      </Card>

      {readable.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>{readable.length} {readable.length === 1 ? "word" : "words"} · {knownCount} from your course</span>
            <button onClick={() => (isLao ? audio.speakHumanVoice("", text) : audio.speakHumanVoice(text))} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 font-semibold text-slate-200"><Volume2 size={13} /> Read it all</button>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
            {words.map((w, i) => (w.other ? <span key={i} className="text-2xl text-slate-400">{w.text}</span> : (
              <button key={i} onClick={() => setOpen(i)} className={`rounded-lg px-1 text-3xl leading-[1.7] transition ${open === i ? "bg-white/10" : "hover:bg-white/5"} ${w.known ? "" : "border-b border-dashed border-white/20"}`} style={{ fontFamily: isLao ? FONT_STACKS.loop.lo : FONT_STACKS.loop.th }}>
                <TintedSyllables syllables={w.syllables} level={levelOf(w)} enabled={prefs.tint} script={isLao ? "lo" : "th"} />
              </button>
            )))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Colours show each syllable's tone and fade as you learn the word. Dashed words aren't in your course yet.</p>
        </Card>
      )}

      {words.map((w, i) => (i !== open || w.other ? null : (
        <Card key={i} className="space-y-3 p-4" glow>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-4xl leading-[1.6] text-white" style={{ fontFamily: isLao ? FONT_STACKS.loop.lo : FONT_STACKS.loop.th }}>{w.text}</div>
              <div className="text-sm text-slate-200">{w.roman ? romanize(w.roman, prefs.roman) : w.syllables.map((sy) => romanOf(w, sy)).filter(Boolean).join("-")}</div>
              <div className="text-sm text-slate-400">{w.known ? w.meaning : "Not in your course yet. Readings with a guess tag are inferred from spelling."}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => (isLao ? audio.speakHumanVoice("", w.text) : audio.speakHumanVoice(w.text))} className="flex items-center gap-1 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-sm font-semibold text-cyan-200"><Volume2 size={14} /> Listen</button>
              {w.known && course.find((c) => c.id === w.id) && <button onClick={() => onInspect?.(course.find((c) => c.id === w.id))} className="flex items-center gap-1 rounded-xl border border-white/15 px-3 py-1.5 text-sm font-semibold text-slate-100"><Eye size={14} /> Inspect</button>}
              {!w.known && setSaved && <button onClick={() => save(w)} disabled={isSaved(w)} className="flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-sm font-bold text-black disabled:opacity-50"><Sparkles size={14} /> {isSaved(w) ? "Saved" : "Save word"}</button>}
            </div>
          </div>
          <div className="space-y-2">{w.syllables.map((sy, k) => <SyllableCard key={k} sy={sy} roman={sy.lao ? "" : romanOf(w, sy)} />)}</div>
        </Card>
      )))}

      {saved.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Saved words</div>
          <div className="flex flex-wrap gap-2">
            {saved.map((x) => (
              <span key={x.th} className="inline-flex w-full items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-1.5">
                <button onClick={() => setText(x.th)} className="shrink-0 text-xl text-white" style={{ fontFamily: x.script === "lo" ? FONT_STACKS.loop.lo : FONT_STACKS.loop.th }}>{x.th}</button>
                <span className="shrink-0 text-xs text-slate-400">{romanize(x.roman, prefs.roman)}</span>
                <input
                  defaultValue={x.meaning || ""}
                  placeholder="add a meaning"
                  aria-label={`Meaning of ${x.th}`}
                  onBlur={(e) => { const m = e.target.value.trim(); setSaved((l) => l.map((y) => (y.th === x.th ? { ...y, meaning: m } : y))); }}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-white outline-none focus:border-amber-400"
                />
                <button aria-label={`Remove ${x.th}`} onClick={() => setSaved((l) => l.filter((y) => y.th !== x.th))} className="shrink-0 text-slate-400 hover:text-white"><X size={12} /></button>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">A saved word with a meaning becomes a card in the Sentence deck on the Shrine.</p>
        </Card>
      )}
      <p className="text-xs text-slate-400">Tip: point Google Lens at a sign, select the text, tap Share and choose SuvarṇaKani. It opens here.</p>
    </div>
  );
}


/* ============================================================================
 * Font Gauntlet: the same letters in the faces real streets use.
 * ========================================================================== */
function FontGauntlet({ mode, srs, stats = {}, setStats }) {
  useEffect(() => { loadGauntletFonts(); }, []);
  const script = mode === "lo" ? "lo" : "th";
  const faces = script === "lo" ? GAUNTLET_FACES.filter((f) => GAUNTLET_LAO.includes(f.id)) : GAUNTLET_FACES;
  const course = courseItems(script);
  const words = useMemo(() => {
    const vocab = course.filter((it) => it.tier !== "glyph" && it[script] && !it[script].includes("◌"));
    const known = vocab.filter((it) => (srs[it.id]?.stage || 0) >= 1);
    return (known.length >= 6 ? known : vocab).slice(0, 40);
  }, [course, script, srs]);
  const [wi, setWi] = useState(0);
  const word = words[wi % Math.max(1, words.length)];
  const letters = useMemo(() => course.filter((it) => it.tier === "glyph" && [...(it[script] || "")].length === 1 && /[ก-ฮກ-ຮ]/.test(it[script])), [course, script]);
  const makeQ = () => {
    const target = letters[Math.floor(Math.random() * letters.length)];
    const pool = confusables(target, script).filter((o) => o.tier === "glyph" && [...(o[script] || "")].length === 1).slice(0, 3);
    while (pool.length < 3) {
      const o = letters[Math.floor(Math.random() * letters.length)];
      if (o.id !== target.id && !pool.some((p) => p.id === o.id)) pool.push(o);
    }
    const hard = faces.filter((f) => !f.looped);
    const face = (hard.length ? hard : faces)[Math.floor(Math.random() * (hard.length || faces.length))];
    return { target, face, options: shuffle([target, ...pool]), pick: null };
  };
  const [q, setQ] = useState(null);
  const [round, setRound] = useState({ n: 0, right: 0 });
  useEffect(() => { if (letters.length > 4) setQ(makeQ()); }, [script]); // eslint-disable-line react-hooks/exhaustive-deps
  const answer = (o) => {
    if (q.pick) return;
    const ok = o.id === q.target.id;
    haptic(ok ? "ok" : "bad");
    setQ({ ...q, pick: o.id });
    setRound((r) => ({ n: r.n + 1, right: r.right + (ok ? 1 : 0) }));
    setStats?.((st) => {
      const cur = st[q.face.id] || { right: 0, total: 0 };
      return { ...st, [q.face.id]: { right: cur.right + (ok ? 1 : 0), total: cur.total + 1 } };
    });
  };
  return (
    <div className="space-y-4">
      <SectionTitle icon={Type} title="Font Gauntlet" sub="Textbooks loop; streets don't. Read the same word in the faces you'll meet on signs, menus and handwritten boards." color={COLORS.gold} />
      {word && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm text-slate-300">{word.meaning} · <span className="text-slate-400">{script === "lo" ? word.loRoman : R(word.thRoman.split(" ·")[0])}</span></div>
            <div className="flex gap-1">
              <button aria-label="Previous word" onClick={() => setWi((i) => (i - 1 + words.length) % words.length)} className="rounded-lg border border-white/10 p-1.5 text-slate-200"><ChevronLeft size={16} /></button>
              <button aria-label="Next word" onClick={() => setWi((i) => (i + 1) % words.length)} className="rounded-lg border border-white/10 p-1.5 text-slate-200"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {faces.map((f) => (
              <div key={f.id} className="rounded-xl bg-white/[0.03] p-3 text-center">
                <div className="text-4xl leading-[1.6] text-white" lang={script} style={{ fontFamily: FONT_STACKS[f.id][script] }}>{word[script]}</div>
                <div className="mt-1 text-xs font-semibold text-slate-200">{script === "lo" && f.id === "sarabun" ? "Noto Sans Lao Looped" : script === "lo" && f.id === "street" ? "Noto Sans Lao" : script === "lo" && f.id === "loop" ? "Noto Serif Lao" : f.name}</div>
                <div className="text-[11px] text-slate-400">{f.note}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {q && (
        <Card className="p-4" glow>
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>Which letter is this?</span>
            <span className="tabular-nums">{round.right} / {round.n} this session</span>
          </div>
          <div className="my-2 text-center text-8xl leading-[1.4] text-white" lang={script} style={{ fontFamily: FONT_STACKS[q.face.id][script] }}>{q.target[script]}</div>
          <div className="mb-3 text-center text-xs text-slate-400">{q.pick ? `${q.face.name} · ${q.face.note}` : "Pick the same letter in head-loop type"}</div>
          <div className="grid grid-cols-4 gap-2">
            {q.options.map((o) => {
              const state = !q.pick ? "" : o.id === q.target.id ? "border-emerald-400 bg-emerald-500/15" : o.id === q.pick ? "border-rose-400 bg-rose-500/15" : "opacity-50";
              return (
                <button key={o.id} onClick={() => answer(o)} className={`rounded-xl border border-white/10 py-2 text-4xl leading-[1.5] text-white ${state}`} lang={script} style={{ fontFamily: FONT_STACKS.loop[script] }}>{o[script]}</button>
              );
            })}
          </div>
          {q.pick && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-sm text-slate-300">{q.target.meaning}</span>
              <button onClick={() => setQ(makeQ())} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black">Next</button>
            </div>
          )}
        </Card>
      )}
      {Object.keys(stats).length > 0 && (
        <Card className="p-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Your accuracy by face</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GAUNTLET_FACES.filter((f) => stats[f.id]).map((f) => {
              const st = stats[f.id];
              const pct = Math.round((st.right / st.total) * 100);
              return (
                <div key={f.id} className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                  <div className="text-slate-200">{f.name}</div>
                  <div className={`tabular-nums ${pct >= 80 ? "text-emerald-300" : pct >= 60 ? "text-amber-200" : "text-rose-300"}`}>{pct}% <span className="text-xs text-slate-400">of {st.total}</span></div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================================
 * Settings sheet: everything that used to live in the header and footer, plus
 * backups, your polite particle, text size and haptics.
 * ========================================================================== */
function SettingRow({ label, hint, children }) {
  return (
    <div className="border-t border-white/5 py-3 first:border-0">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      {children}
      {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function AudioSettings({ rate, setRate, muted, setMuted }) {
  const audio = getAudio();
  const [, force] = useState(0);
  useEffect(() => audio.onVoices(() => force((n) => n + 1)), [audio]);
  const th = audio.thaiVoice();
  const lo = audio.laoVoice();
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <Chip active={rate === 0.85} onClick={() => setRate(0.85)}>0.85× Clear</Chip>
        <Chip active={rate === 1} onClick={() => setRate(1)}>1.0× Normal</Chip>
        <Chip active={muted} color="#FB7185" onClick={() => setMuted(!muted)}>{muted ? <><VolumeX size={13} className="mr-1 inline" />Muted</> : <><Volume2 size={13} className="mr-1 inline" />Sound on</>}</Chip>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => audio.speakHumanVoice("สวัสดี ครับ")} className="rounded-xl bg-cyan-500/15 py-2 text-sm text-cyan-200"><Volume2 size={14} className="mr-1 inline" />Test voice</button>
        <button onClick={() => audio.playRanatToneChime(["mid", "low", "falling", "high", "rising"])} className="rounded-xl bg-amber-500/15 py-2 text-sm text-amber-200"><Music size={14} className="mr-1 inline" />5 tone chimes</button>
      </div>
      <div className="mt-3 space-y-1 text-xs">
        <div className={th ? "text-emerald-300" : "text-amber-300"}>{th ? `Thai voice: ${th.name}` : (IS_ANDROID ? `No Thai voice found. ${ANDROID_VOICE_HINT}` : "No Thai voice found. Install a Thai voice in your device's text-to-speech settings.")}</div>
        <div className={lo ? "text-emerald-300" : "text-slate-400"}>{lo ? `Lao voice: ${lo.name}` : "No Lao voice: Lao items are read with Thai-script approximations."}</div>
      </div>
    </>
  );
}

function BackupSettings({ getState }) {
  const [snaps, setSnaps] = useState(null);
  const [msg, setMsg] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);
  useEffect(() => { listSnapshots().then(setSnaps); }, []);
  const doExport = async () => {
    const r = await deliverBackup(getState());
    setMsg(r === "shared" ? { ok: true, text: "Backup shared." } : r === "downloaded" ? { ok: true, text: "Backup saved to Downloads." } : null);
  };
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const obj = readBackup(await f.text());
      setConfirm({ kind: "file", obj, label: `the backup from ${obj.exportedAt?.slice(0, 10) || "that file"}` });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };
  const apply = async () => {
    try {
      await snapshotToday(getState());
      if (confirm.obj.voices?.length) await importVoices(confirm.obj.voices);
      restoreState(confirm.obj.state);
    } catch (err) {
      setMsg({ ok: false, text: err.message });
      setConfirm(null);
    }
  };
  const fmt = (sum) => (sum ? `${sum.started} ${sum.started === 1 ? "item" : "items"} started, ${sum.burned} burned` : "");
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={doExport} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-black"><Download size={15} /> Back up</button>
        <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-slate-100"><Upload size={15} /> Restore a file</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
      </div>
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}
      <div className="mt-3 text-xs text-slate-400"><History size={12} className="mr-1 inline" />Daily snapshots on this phone</div>
      <div className="mt-1.5 space-y-1">
        {snaps === null && <div className="text-xs text-slate-400">Loading…</div>}
        {snaps && snaps.length === 0 && <div className="text-xs text-slate-400">The first snapshot is taken today. One is kept for each of the last {SNAPSHOT_DAYS} days you open the app.</div>}
        {snaps && snaps.map((sn) => (
          <div key={sn.key} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-1.5 text-xs">
            <span className="text-slate-200">{sn.key === todayKey() ? "Start of today" : new Date(sn.at).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} <span className="text-slate-400">· {fmt(sn.summary)}</span></span>
            <button onClick={() => setConfirm({ kind: "snap", obj: sn, label: sn.key === todayKey() ? "the start of today" : new Date(sn.at).toLocaleDateString() })} className="shrink-0 rounded-lg border border-white/10 px-2 py-0.5 font-semibold text-slate-200">Restore</button>
          </div>
        ))}
      </div>
      {confirm && (
        <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-100">
          Replace everything on this phone with {confirm.label}{confirm.obj.summary ? ` (${fmt(confirm.obj.summary)})` : ""}? Today's state is kept as a snapshot first.
          <div className="mt-2 flex gap-2">
            <button onClick={apply} className="rounded-lg bg-amber-500 px-3 py-1 font-bold text-black">Restore</button>
            <button onClick={() => setConfirm(null)} className="rounded-lg border border-white/15 px-3 py-1 text-slate-200">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

function SettingsSheet({ open, onClose, s, getState, onReset, confirmReset }) {
  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <SettingRow label="Script">
        <div className="flex flex-wrap gap-2">
          {[["dual", "Thai + Lao"], ["th", "Thai"], ["lo", "Lao"]].map(([k, l]) => <Chip key={k} active={s.mode === k} onClick={() => s.setMode(k)}>{l}</Chip>)}
        </div>
      </SettingRow>
      <SettingRow label="Theme" hint="System follows your phone. True black saves power on the S25's OLED screen at night.">
        <div className="flex flex-wrap gap-2">
          {[["system", "System", SunMoon], ["light", "Daylight", Sun], ["dark", "Night", Moon]].map(([k, l, Icon]) => <Chip key={k} active={s.prefs.theme === k} onClick={() => s.setPref("theme", k)}><Icon size={13} className="mr-1 inline" />{l}</Chip>)}
          <Chip active={s.prefs.trueBlack} onClick={() => s.setPref("trueBlack", !s.prefs.trueBlack)}>{s.prefs.trueBlack ? "True black at night" : "Soft night"}</Chip>
        </div>
      </SettingRow>
      <SettingRow label="Your polite particle" hint="Your lines in dialogues use it. Until you pick, they show both.">
        <div className="flex flex-wrap gap-2">
          <Chip active={s.prefs.particle === "male"} onClick={() => s.setPref("particle", "male")}><span style={{ fontFamily: FONT_STACKS.loop.th }}>ครับ</span> khráp</Chip>
          <Chip active={s.prefs.particle === "female"} onClick={() => s.setPref("particle", "female")}><span style={{ fontFamily: FONT_STACKS.loop.th }}>ค่ะ / คะ</span> khâ / khá</Chip>
          <Chip active={s.prefs.particle === "unset"} onClick={() => s.setPref("particle", "unset")}>Show both</Chip>
        </div>
      </SettingRow>
      <SettingRow label="Letter style" hint="Head-loop fonts teach the shapes; street fonts are what signs use.">
        <div className="flex flex-wrap gap-2">
          <Chip active={s.font === "loop"} onClick={() => s.setFont("loop")}>Head-loop</Chip>
          <Chip active={s.font === "street"} onClick={() => s.setFont("street")}>Street</Chip>
        </div>
      </SettingRow>
      <SettingRow label="Romanisation" hint="Learner spelling marks tones; RTGS is what road signs use; IPA is the phonetic alphabet.">
        <div className="flex flex-wrap gap-2">
          {Object.entries(ROMAN_SYSTEMS).map(([k, l]) => <Chip key={k} active={s.prefs.roman === k} onClick={() => s.setPref("roman", k)}>{l}</Chip>)}
        </div>
        <p className="mt-2 text-sm text-slate-200">{romanize("khɔ̀ɔp-khun mâak khráp", s.prefs.roman)}</p>
      </SettingRow>
      <SettingRow label="Reading help" hint="Tone colours fade as you learn each word. Random fonts show stage 3+ review items in a different typeface each time.">
        <div className="flex flex-wrap gap-2">
          <Chip active={s.prefs.tint} onClick={() => s.setPref("tint", !s.prefs.tint)}>{s.prefs.tint ? "Tone colours on" : "Tone colours off"}</Chip>
          <Chip active={s.prefs.randomFonts} onClick={() => s.setPref("randomFonts", !s.prefs.randomFonts)}>{s.prefs.randomFonts ? "Random fonts in reviews" : "Same font in reviews"}</Chip>
        </div>
      </SettingRow>
      <SettingRow label="Daily goal">
        <div className="flex flex-wrap gap-2">
          {[5, 12, 20].map((m) => <Chip key={m} active={s.dailyMinutes === m} onClick={() => s.setDailyMinutes(m)}>{m} min</Chip>)}
        </div>
      </SettingRow>
      <SettingRow label="Text size">
        <div className="flex flex-wrap gap-2">
          {[[100, "Normal"], [112, "Large"], [125, "Larger"]].map(([v, l]) => <Chip key={v} active={s.prefs.textSize === v} onClick={() => s.setPref("textSize", v)}>{l}</Chip>)}
        </div>
      </SettingRow>
      <SettingRow label="Touch">
        <div className="flex flex-wrap gap-2">
          <Chip active={s.prefs.haptics} onClick={() => s.setPref("haptics", !s.prefs.haptics)}>{s.prefs.haptics ? "Haptics on" : "Haptics off"}</Chip>
          <Chip active={s.sandbox} color="#34D399" onClick={() => s.setSandbox(!s.sandbox)}>{s.sandbox ? <><Unlock size={13} className="mr-1 inline" />All levels unlocked</> : <><Lock size={13} className="mr-1 inline" />Unlock all levels</>}</Chip>
        </div>
      </SettingRow>
      <SettingRow label="Audio">
        <AudioSettings rate={s.rate} setRate={s.setRate} muted={s.muted} setMuted={s.setMuted} />
      </SettingRow>
      <SettingRow label="Backup" hint="Progress lives in this browser at this web address. Back up before changing phones, browsers or the app's address.">
        <BackupSettings getState={getState} />
      </SettingRow>
      <SettingRow label="Start over">
        <button onClick={onReset} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${confirmReset ? "border-rose-400/60 bg-rose-500/15 text-rose-200" : "border-white/10 text-slate-300"}`}>{confirmReset ? "Tap again to erase all progress" : "Reset progress"}</button>
      </SettingRow>
      <p className="pt-2 text-center text-[11px] text-slate-400">SuvarṇaKani {APP_VERSION}</p>
    </Modal>
  );
}

function WhatsNewSheet({ open, onClose, since }) {
  const list = WHATS_NEW.filter((w) => !since || verCmp(w.v, since) > 0);
  return (
    <Modal open={open} onClose={onClose} title="What's new">
      <div className="space-y-4">
        {(list.length ? list : WHATS_NEW.slice(0, 1)).map((w) => (
          <div key={w.v}>
            <div className="mb-1 font-bold text-white">{w.title} <span className="text-xs font-normal text-slate-400">{w.v}</span></div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">{w.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        ))}
        <button onClick={onClose} className="w-full rounded-xl bg-amber-500 py-2.5 font-bold text-black">Got it</button>
      </div>
    </Modal>
  );
}

/** Shows a bar when a new build has taken over the service worker. */
function useUpdateReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : null;
    if (!sw) return undefined;
    const hadController = !!sw.controller;
    const onChange = () => { if (hadController) setReady(true); };
    sw.addEventListener("controllerchange", onChange);
    // Check for a new build whenever the app comes back to the front.
    const check = () => { if (document.visibilityState === "visible") sw.getRegistration?.().then((r) => r?.update()).catch(() => {}); };
    document.addEventListener("visibilitychange", check);
    return () => { sw.removeEventListener("controllerchange", onChange); document.removeEventListener("visibilitychange", check); };
  }, []);
  return ready;
}

/* ============================================================================
 * App shell
 * ========================================================================== */
const LAB_TABS = [
  { id: "reactor", label: "Tone Reactor", icon: FlaskConical },
  { id: "orbit", label: "Vowel Orbit", icon: Orbit },
  { id: "bridge", label: "Mekong Predictor", icon: Languages },
  { id: "clock", label: "Market Clock", icon: Clock },
  { id: "corral", label: "Classifiers", icon: Layers },
];
const EAR_TABS = [
  { id: "dojo", label: "Ear Dojo", icon: Ear },
  { id: "shadow", label: "Shadow Mirror", icon: Mic },
  { id: "talk", label: "Talk Paths", icon: MessageCircle },
  { id: "bank", label: "Voice Bank", icon: Music },
];
const READ_TABS = [
  { id: "library", label: "Library", icon: Library },
  { id: "decoder", label: "Decoder", icon: Search },
  { id: "slicer", label: "Script Slicer", icon: Scissors },
  { id: "street", label: "Street Reader", icon: BookOpen },
  { id: "fonts", label: "Font Gauntlet", icon: Type },
  { id: "ride", label: "Ride the line", icon: Train },
];
// Older saved tabs map onto the new hubs.
const LEGACY_TAB = { reactor: ["lab", "reactor"], orbit: ["lab", "orbit"], slicer: ["read", "slicer"] };

const TABS = [
  { id: "shrine", label: "Shrine", icon: Landmark },
  { id: "ear", label: "Ear", icon: Ear },
  { id: "tracer", label: "Write", icon: PenTool },
  { id: "lab", label: "Lab", icon: FlaskConical },
  { id: "read", label: "Read", icon: BookOpen },
];

export default function SuvarnaKani() {
  const initial = useMemo(() => loadState() || {}, []);
  const launchGo = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("text") ? "decoder" : new URLSearchParams(window.location.search).get("go")) : null;
  const [tab, setTab] = useState(launchGo === "decoder" ? "read" : launchGo === "ear" ? "ear" : launchGo === "reviews" ? "shrine" : LEGACY_TAB[initial.tab]?.[0] || initial.tab || "shrine");
  const [labTab, setLabTab] = useState(LEGACY_TAB[initial.tab]?.[1] === "reactor" || LEGACY_TAB[initial.tab]?.[1] === "orbit" ? LEGACY_TAB[initial.tab][1] : initial.labTab || "reactor");
  const [readTab, setReadTab] = useState(launchGo === "decoder" ? "decoder" : initial.readTab || "decoder");
  const [earTab, setEarTab] = useState(initial.earTab || "dojo");
  const [shadow, setShadow] = useState(() => ({ ...emptyShadow(), ...(initial.shadow || {}) }));
  const [bridge, setBridge] = useState(() => ({ ...emptyBridge(), ...(initial.bridge || {}) }));
  const [bridgeSched, setBridgeSched] = useState(() => initial.bridgeSched || {});
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
  const [prefs, setPrefs] = useState(() => ({ ...DEFAULT_PREFS, ...(initial.prefs || {}) }));
  const setPref = (k, v) => setPrefs((p) => ({ ...p, [k]: v }));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [decoderSaved, setDecoderSaved] = useState(() => initial.decoderSaved || []);
  const [gauntlet, setGauntlet] = useState(() => initial.gauntlet || {});
  const [garden, setGarden] = useState(() => initial.garden || []);
  const [sentSrs, setSentSrs] = useState(() => {
    const fixed = {};
    Object.entries(initial.sentSrs || {}).forEach(([k, v]) => { fixed[k] = k.startsWith("__") ? v : { ...v, next: v.next === null ? Infinity : v.next }; });
    return fixed;
  });
  const [drills, setDrills] = useState(() => initial.drills || {});
  const [library, setLibrary] = useState(() => initial.library || {});
  const [marks, setMarks] = useState(() => initial.marks || {});
  const [kb, setKb] = useState(() => initial.kb || {});
  // Home-screen shortcuts (?go=reviews|ear|decoder) and text shared from other apps (?text=).
  const launch = useMemo(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const shared = [q.get("text"), q.get("title"), q.get("url")].filter(Boolean).join(" ").trim();
      if (q.toString()) window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      return { go: shared ? "decoder" : q.get("go"), text: shared };
    } catch {
      return {};
    }
  }, []);
  const [sharedText] = useState(launch.text || "");
  const [autoReview, setAutoReview] = useState(launch.go === "reviews");
  // Existing users see What's new once after an update; new users start at the current version.
  const [seenVersion, setSeenVersion] = useState(initial.seenVersion || (initial.srs ? "0.19.0" : APP_VERSION));
  const updateReady = useUpdateReady();
  runtimePrefs.haptics = prefs.haptics;
  runtimePrefs.roman = prefs.roman;
  useEffect(() => {
    document.documentElement.style.fontSize = prefs.textSize === 100 ? "" : `${prefs.textSize}%`;
  }, [prefs.textSize]);
  const theme = useResolvedTheme(prefs.theme);
  applyTonePalette(theme);
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-sk-theme", theme);
    if (theme === "dark" && prefs.trueBlack) root.setAttribute("data-sk-black", ""); else root.removeAttribute("data-sk-black");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#FAF7F0" : prefs.trueBlack ? "#000000" : "#0B0F19");
  }, [theme, prefs.trueBlack]);
  // Back from another tab returns to the Shrine instead of closing the app.
  useBackClose(tab !== "shrine", () => setTab("shrine"));
  const logActivity = useCallback((delta) => {
    setLog((prev) => {
      const key = todayKey();
      const day = { ...(prev[key] || {}) };
      Object.entries(delta).forEach(([k, v]) => { day[k] = (day[k] || 0) + v; });
      const next = { ...prev, [key]: day };
      // Keep a year of daily history (F4).
      Object.keys(next).sort().slice(0, -REVIEW_KEEP_DAYS).forEach((k) => delete next[k]);
      return next;
    });
  }, []);
  // Study time: 30-second ticks while the app is visible and was touched in the last 90 seconds.
  useEffect(() => {
    let lastTouch = Date.now();
    const touch = () => { lastTouch = Date.now(); };
    window.addEventListener("pointerdown", touch, { passive: true });
    window.addEventListener("keydown", touch);
    const id = setInterval(() => { if (document.visibilityState === "visible" && Date.now() - lastTouch < 90000) logActivity({ secs: 30 }); }, 30000);
    pruneReviews();
    loadVoiceBank();
    return () => { clearInterval(id); window.removeEventListener("pointerdown", touch); window.removeEventListener("keydown", touch); };
  }, [logActivity]);
  // Lamps for streak milestones, once each (V5).
  useEffect(() => {
    const streak = computeStreak(log);
    const hit = STREAK_MILESTONES.filter((n) => streak >= n).pop();
    if (!hit || hit <= (marks.streak || 0)) return;
    setMarks((m) => ({ ...m, streak: hit }));
    if (onboarded) celebrate({ kind: "lamps", label: `${hit}-day streak`, title: hit >= 30 ? "A month of lamps lit" : "The lamps are lit", sub: "Every day you study lights one more.", lamps: Math.min(7, Math.ceil(hit / 5) + 2) });
  }, [log]); // eslint-disable-line react-hooks/exhaustive-deps
  const finishOnboarding = (a) => {
    if (a.mode) setMode(a.mode);
    if (a.level === "reads") setSandbox(true);
    if (a.minutes) setDailyMinutes(a.minutes);
    setOnboarded(true);
  };
  const goPractice = (kind) => {
    if (kind === "trace") setTab("tracer");
    if (kind === "mekong") { setTab("lab"); setLabTab("bridge"); }
    if (kind === "sign") { setTab("read"); setReadTab("street"); }
    if (kind === "shadow") { setTab("ear"); setEarTab("shadow"); }
    window.scrollTo?.(0, 0);
  };
  const [inspect, setInspect] = useState(null);

  useEffect(() => {
    if (document.querySelector("[data-suvarnakani-fonts]")) return;
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

  const stateRef = useRef(null);
  stateRef.current = { tab, labTab, readTab, mode, font, sandbox, rate, muted, srs, ear, log, dailyMinutes, onboarded, bridge, bridgeSched, streetBest, earTab, shadow, prefs, seenVersion, decoderSaved, gauntlet, garden, sentSrs, drills, library, marks, kb };
  useEffect(() => {
    if (restoringState) return;
    saveState(stateRef.current);
  }, [earTab, shadow, tab, labTab, readTab, mode, font, sandbox, rate, muted, srs, ear, log, dailyMinutes, onboarded, bridge, bridgeSched, streetBest, prefs, seenVersion, decoderSaved, gauntlet, garden, sentSrs, drills, library, marks, kb]);
  // A snapshot of the state as the app opens each day, before today's work changes it.
  useEffect(() => { if (stateRef.current.onboarded) snapshotToday(stateRef.current); }, []);

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
    setBridgeSched({});
    setStreetBest({});
    setShadow(emptyShadow());
    setGauntlet({});
    setGarden([]);
    setSentSrs({});
    setDrills({});
    setLibrary({});
    setMarks({});
    setKb({});
    setConfirmReset(false);
  };

  return (
    <PrefsContext.Provider value={prefs}>
    <style>{THEME_CSS}</style>
    <div className="min-h-[100dvh] bg-sk-bg pb-[calc(6rem+env(safe-area-inset-bottom))] text-slate-100 sm:pb-8" style={{ fontFamily: UI_FONT, backgroundImage: "var(--sk-glow)" }}>
      <header className="sticky top-0 z-30 border-b border-white/5 bg-sk-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-x-2 px-4 py-3">
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
          {sandbox && <span title="All levels unlocked" className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-2 text-emerald-200"><Unlock size={14} /></span>}
          <button onClick={() => setSettingsOpen(true)} aria-label="Settings" className="relative rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10">
            <Settings size={16} />
            {muted && <VolumeX size={10} className="absolute -right-1 -top-1 rounded-full bg-rose-500 p-0.5 text-white" />}
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
        {tab === "shrine" && <Shrine srs={srs} setSrs={setSrs} sandbox={sandbox} mode={mode} font={font} onInspect={setInspect} ear={ear} onOpenEar={() => setTab("ear")} log={log} logActivity={logActivity} dailyMinutes={dailyMinutes} bridgeSched={bridgeSched} onPractice={goPractice} autoReview={autoReview} onAutoReviewDone={() => setAutoReview(false)} garden={garden} setGarden={setGarden} sentSrs={sentSrs} setSentSrs={setSentSrs} decoderSaved={decoderSaved} mined={library.mined} />}
        {tab === "ear" && (
          <>
            <SubTabs tabs={EAR_TABS} active={earTab} onChange={setEarTab} />
            {earTab === "dojo" && <EarDojo ear={ear} setEar={setEar} logActivity={logActivity} />}
            {earTab === "shadow" && <ShadowMirror ear={ear} shadow={shadow} setShadow={setShadow} sandbox={sandbox} logActivity={logActivity} />}
            {earTab === "talk" && <TalkPaths mode={mode} shadow={shadow} logActivity={logActivity} />}
            {earTab === "bank" && <VoiceBank mode={mode} />}
          </>
        )}
        {tab === "tracer" && <Tracer mode={mode} srs={srs} setSrs={setSrs} logActivity={logActivity} kb={kb} setKb={setKb} />}
        {tab === "lab" && (
          <>
            <SubTabs tabs={LAB_TABS} active={labTab} onChange={setLabTab} />
            {labTab === "reactor" && <Reactor mode={mode} font={font} />}
            {labTab === "orbit" && <OrbitModule mode={mode} font={font} />}
            {labTab === "clock" && <MarketClock mode={mode} drills={drills} setDrills={setDrills} logActivity={logActivity} />}
            {labTab === "corral" && <ClassifierCorral mode={mode} drills={drills} setDrills={setDrills} logActivity={logActivity} />}
            {labTab === "bridge" && <MekongPredictor mode={mode} font={font} bridge={bridge} setBridge={setBridge} sched={bridgeSched} setSched={setBridgeSched} logActivity={logActivity} />}
          </>
        )}
        {tab === "read" && (
          <>
            <SubTabs tabs={READ_TABS} active={readTab} onChange={setReadTab} />
            {readTab === "slicer" && <Slicer mode={mode} font={font} />}
            {readTab === "decoder" && <Decoder srs={srs} initialText={sharedText} onInspect={setInspect} saved={decoderSaved} setSaved={setDecoderSaved} />}
            {readTab === "ride" && <RideTheLine mode={mode} drills={drills} setDrills={setDrills} logActivity={logActivity} />}
            {readTab === "library" && <LanternLibrary mode={mode} font={font} srs={srs} sandbox={sandbox} library={library} setLibrary={setLibrary} logActivity={logActivity} />}
            {readTab === "fonts" && <FontGauntlet mode={mode} srs={srs} stats={gauntlet} setStats={setGauntlet} />}
            {readTab === "street" && <StreetReader mode={mode} srs={srs} setSrs={setSrs} best={streetBest} setBest={setStreetBest} logActivity={logActivity} />}
          </>
        )}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-4 text-xs text-slate-400">
          <span><Zap size={12} className="mr-1 inline text-amber-400" />Progress is saved on this device. <button onClick={() => setSettingsOpen(true)} className="underline hover:text-slate-200">Back it up</button></span>
          <button onClick={() => setSeenVersion("show")} className="underline hover:text-slate-200">What's new in {APP_VERSION}</button>
        </footer>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-sk-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${tab === t.id ? "text-amber-400" : "text-slate-400"}`}>
            <t.icon size={20} />
            {t.label}
          </button>
        ))}
      </nav>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        s={{ mode, setMode, font, setFont, sandbox, setSandbox, rate, setRate, muted, setMuted, dailyMinutes, setDailyMinutes, prefs, setPref }}
        getState={() => stateRef.current}
        onReset={resetProgress}
        confirmReset={confirmReset}
      />
      <WhatsNewSheet open={onboarded && !settingsOpen && seenVersion !== APP_VERSION} onClose={() => setSeenVersion(APP_VERSION)} since={seenVersion === "show" ? null : seenVersion} />
      {updateReady && (
        <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-sk-panel px-4 py-3 text-sm text-slate-100 shadow-2xl sm:bottom-4 sm:left-auto sm:right-4 sm:w-96">
          <span><RefreshCw size={14} className="mr-1.5 inline text-amber-300" />A new version is ready.</span>
          <button onClick={() => window.location.reload()} className="rounded-xl bg-amber-500 px-3 py-1.5 font-bold text-black">Reload</button>
        </div>
      )}
      <Inspector item={inspect} mode={mode} font={font} srs={srs} onClose={() => setInspect(null)} />
      <MomentLayer />
      {!onboarded && <Onboarding onDone={finishOnboarding} />}
    </div>
    </PrefsContext.Provider>
  );
}

/* Pure functions exposed for the test suite (tests/run.mjs). Not used by the app. */
export const __test = { KEYMAPS, keyFor, typeable, dictationPool, syllableTargets, traceTargets, SRS_STAGES, ANATOMY, TONES_LIGHT_BASE, applyTonePalette, STREAK_MILESTONES, TALK_PATHS, talkLine, SOUND_SETS, phraseTrials, climbLadder, voiceBankLists, LIBRARY, storyText, rideRun, SIGN_PACKS, dailyMenu, numberWords, numberRoman, clockPhrase, sentenceCards, interleave, looseRoman, GARDEN_BEDS, GARDEN_ITEMS, laoToThai, laoReading, isCorrect, SENTENCES, readThai, segmentThai, romanize, computeTone, laoSyllables, laoSyllable, laoTone, courseItems, CURRICULUM, LAO_ONLY_ITEMS, TONES, fsrsUpdate, scheduleItem, politeLine, readBackup, makeBackup, verCmp };
