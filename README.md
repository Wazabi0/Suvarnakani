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
- **0.2.0**: Tone Ear Dojo (adaptive minimal-set listening drills, per-tone accuracy and confusions); reviews now ask a second question (tone for syllables and words, consonant class for letters) and explain which rule a wrong answer broke; colour-blind-safe tone, tier and class palettes (tone lightness follows pitch height, contours drawn as gradients, class shown with gold "altitude" ramp plus icons); text contrast floor raised to slate-400.
