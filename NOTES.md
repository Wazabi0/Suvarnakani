# SuvarṇaKani build notes

## Files
- `SuvarnaKani.jsx`: the single-file React app (hooks, Tailwind classes, lucide-react). Drop it into any React + Tailwind project as the default export.
- `SuvarnaKani.html`: standalone build of the same file (React and Tailwind compiled in). Open it in a browser; it needs internet only for Google Fonts.

## What is in it
- **Shrine**: 40 items over 3 levels (glyph / syllable / vocab tiers in cyan / magenta / purple), lesson carousel, typed reviews (reading or meaning, tone marks optional), 6 SRS stages with 4h / 1d / 7d / 30d intervals, item inspector (mnemonic, head-loop path, tone equation, Mekong bridge note, lookalike trap, loop vs street font). Level N+1 unlocks when all of level N reach Novice Monk. Progress saves to localStorage.
- **Tracer**: 8 glyphs, golden start point, canvas tracing scored on coverage, staying on the line, and whether you started at the head.
- **Reactor**: class × live/dead × length × mark × ห นำ, with the derived tone, Chao contour, step-by-step equation, presets (มา / ม้า / หมา / ค่ะ / ขา).
- **Orbit**: vowel compass (front, roof, under, behind, surrounding) for 6 consonants in Thai and Lao, plus the lookalike and silent-killer (◌์) dojos.
- **Slicer**: 2 unspaced sentences in Thai and Lao with tap-to-cut boundaries, checking, reveal and word cards.
- **Audio**: `SuvarnaMobileAudioEngine` never overlaps speech and Web Audio, 120 ms speech debounce, Thai-only sanitised TTS strings, a Lao voice used when the device has one, iOS speech priming on first tap.

## Linguistic corrections to the spec
1. **Lao tones are not Thai tones.** Lao uses the same class × live/dead × mark logic, but Vientiane Lao has different pitch values and up to six tones. The Reactor computes Bangkok Thai tones and says so in Lao mode; Lao words show no Thai tone badge.
2. **Head-loop direction is not a class rule.** "High = inward loop, Low = outward loop" doesn't hold across the alphabet. The app teaches loop shape per letter pair instead (ด vs ค, ผ vs พ).
3. **ผ vs พ**: the real difference is the height of the inner peak (low in ผ, full height in พ), not loop direction. ฝ / ฟ add a tall tail.
4. **ก has no head loop.** Its stroke starts at the beak.
5. **Lao ห นำ ligatures**: only ໜ and ໝ (and ຫຼ with subscript lo) are single letters. ຫງ, ຫຍ, ຫວ stay as two letters.
6. **Thai ร ↔ Lao**: native words usually go to ຮ (รัก/ຮັກ) but many go to ລ (รถ/ລົດ). Lao also has ຣ for names and loans.
7. **Middle-class dead syllables** (missing from the spec) are Low tone; implemented.
8. **Mai tri / chattawa** normally only sit on Middle-class consonants; the Reactor warns when you put them elsewhere.
9. **ขอบใจ** is casual in Thai (said to juniors) but the normal polite thanks in Lao. **สบายดี** in Thai means "I'm fine", not "hello".
10. Smaller: Lao romanisation is kept informal (no tone marks) to avoid false precision; Lao letter-name words differ from Thai (ຈອກ, ແບ້, ໂອ, ຫ່ານ, ນົກ, ແມວ, ພູ, ເຮືອນ) and are used in the Lao names.
