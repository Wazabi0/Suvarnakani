# SuvarṇaKani

A single-file React app for learning to read Thai and Lao script: an SRS "Shrine" of glyphs, syllables and vocab, a stroke Tracer, a tone Reactor, a vowel Orbit, and a word Slicer for unspaced text.

## Files
- `SuvarnaKani.jsx`: the React app (hooks, Tailwind, lucide-react). Use it as the default export in any React + Tailwind project.
- `SuvarnaKani.html`: standalone build. Open it in a browser (internet is needed only for Google Fonts).
- `NOTES.md`: build notes, feature list and linguistic corrections to the original spec.

## Build
```
npm install
npm run build   # writes SuvarnaKani.html
```

## Changelog
- **0.4.0**: Mekong Predictor: build the Lao spelling of a Thai word (or the reverse) from tiles across 10 bridge laws (clusters, ร→ຮ, ช/ซ→ຊ, silent ◌์, ໜ/ໝ, Sanskrit letters, ◌ົວ, written o, ເ◌ຍ/◌ຽ, ເ◌ົາ), with law-specific feedback, a flagged law-breaker (รถ→ລົດ) and per-law mastery. Navigation regrouped into five tabs: Shrine, Ear, Tracer, Lab (Reactor, Orbit, Predictor) and Read (Slicer).
- **0.3.0**: Today Path on the Shrine (one ordered daily session sized to 5/12/20 minutes: reviews, Ear set, leech drill, new lessons gated on 80% weekly accuracy), streak, 7-day review forecast; FSRS-4.5 scheduling at 90% target recall with separate memory tracks for reading and tone/class; "I guessed" rating; leech detection (4+ lapses) with a lookalike contrast drill; three-question onboarding; reset no longer uses `confirm()`.
- **0.2.0**: Tone Ear Dojo (adaptive minimal-set listening drills, per-tone accuracy and confusions); reviews now ask a second question (tone for syllables and words, consonant class for letters) and explain which rule a wrong answer broke; colour-blind-safe tone, tier and class palettes (tone lightness follows pitch height, contours drawn as gradients, class shown with gold "altitude" ramp plus icons); text contrast floor raised to slate-400.
