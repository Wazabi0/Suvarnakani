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

## Install on a Galaxy phone

1. Serve the `dist/` folder over https. For example, drag it onto [Netlify Drop](https://app.netlify.com/drop) or publish it with GitHub Pages.
2. Open the URL in Samsung Internet or Chrome.
3. Choose **Add page to → Home screen** in Samsung Internet, or **Install app** in Chrome.

The app then opens full screen and works offline after the first load.

For audio, set Settings → General management → Text-to-speech → Preferred engine to Speech Services by Google, then download Thai in that engine's settings.

## Changelog
- **0.14.0**: Trace every letter. The Tracer now covers all 54 single-letter glyphs in Thai (37 in Lao mode, drawn in Noto Serif Lao), grouped by level. Start points are found automatically: the app renders the letter, floods the background in from the edges, and marks the top-left closed counter as the head loop. Curls on ascenders and big counters such as ๐ are skipped, and letters with no closed loop get no start check. The eight hand-measured Thai starts are kept. Starting away from the head costs 10 points. Each glyph you have started in the Shrine gets its own `write` FSRS track: a first trace of 70 or more starts it, and later traces rate it 3, 2 or 1 (70+, 50–69, under 50). The write track is kept apart from the reading tracks, so a shaky hand never moves the review schedule. Dots on the picker show what is due, and Next due jumps to it.
- **0.13.0**: Reverse reviews. Once an item reaches stage 2, some of its reviews run the other way. You hear the word, see its reading and meaning, and pick the right spelling from four confusable options (keys 1–4). Spelling has its own FSRS track, and the app alternates directions by whichever is due first. A shared `confusables()` generator picks the distractors: lookalike sets first, then same tier, shared letters, similar length and nearby level. The leech drill now uses it too, so every leech gets meaningful lookalikes instead of three random items.
- **0.12.0**: Lesson quiz. After the lesson cards you type the reading or meaning of each new item. A miss shows the answer and mnemonic and sends that item to the back of the line. Items enter SRS only when every one has been answered right once. This also fixes a bug where the lesson window could stay closed on the first tap: the batch was held in a ref, which didn't trigger a re-render.
- **0.11.0**: Tone checks on every syllable. Words now ask for the tone of each syllable in turn: the romanised syllable is shown with its tone marks stripped, and keys 1–5 work. Feedback names each syllable you missed. When a known item gets a tone track for the first time, a correct answer starts it from the reading track's memory, so long-learned words aren't sent back to stage 1. Long words shrink on the review card so they fit a phone screen.
- **0.10.0**: The whole alphabet. 39 new items, each added to the level where it belongs:
  - **Level 2**: high/low partner letters ถ ท ฝ ฟ ซ ฮ.
  - **Level 3**: the sonorants ง ย ว ญ, with their Lao counterparts.
  - **Level 4**: Sanskrit letters ศ ษ ธ ฉ ภ ณ.
  - **Level 5**: missing vowel patterns ◌ุ ◌ึ เ◌ีย เ◌า -อ and long เ แ โ.
  - **Level 7**: digits ๖–๙.
  - **Level 9 (new), Royal and Rare Letters**: ฆ ฐ ฑ ฒ ฎ ฏ ฌ ฬ, ๆ, ฯ and ฤ.

  Every Thai consonant except the obsolete ฃ and ฅ is now taught on its own. A level you have started stays open when new items join the level before it, and lessons come in level order.
- **0.9.0**: Galaxy S25 Ultra and Android tuning. `dist/` is an installable app with a manifest, icons including a maskable one, and an offline service worker. Layout runs edge to edge and clears the status bar and gesture bar. The keyboard resizes the page instead of covering the review input. Samsung Internet's forced dark mode is opted out. Samsung Keyboard autocorrect is off in reviews. Right and wrong answers trigger short haptics. The Tracer supports the S Pen: pressure-sensitive strokes, 240 Hz coalesced samples and palm rejection, and the page no longer scrolls while tracing. Galaxy-specific steps appear when no Thai voice is installed.
- **0.8.0**: Level 8 course, Particles and Politeness (12 items: ครับ, ค่ะ, คะ, นะ, ไหม, ใช่, ไม่ใช่, ขอโทษ, ไม่เป็นไร, เท่าไร, ได้, คุณ, each paired with its Lao counterpart such as ເຈົ້າ, ເດີ, ບໍ, ແມ່ນ and ບໍ່ເປັນຫຍັງ). Street Reader gains two short dialogues with speaker labels: a Bangkok coffee counter in Thai and a Luang Prabang market in Lao.
- **0.7.0**: Shadow Mirror under Ear. Hear a model syllable, say it back, and your pitch is drawn live over the target contour. Pitch tracking is on-device YIN with octave-jump correction. Scoring combines shape (pitch movement) with height, measured against a one-tap "set my voice" calibration, and each tone gets a specific tip ("Falling needs a clear drop…"). A tone unlocks after 80% Ear Dojo accuracy on it over at least 10 trials, so you hear a tone before you produce it. Microphone refusal is handled with a clear message. No audio leaves the device.
- **0.6.0**: Street Reader under Read: five real-world signs (Bangkok café menu, Skytrain station, convenience store, Chiang Mai temple notice, Vientiane morning market) in street typefaces with a "you can read X%" meter from your SRS, tap-for-gloss with tone and head-loop form, one-tap Add to SRS for course words, and a reading timer with personal bests. New Level 7 course, Street Signs and Numbers (13 items: Thai/Lao digits, baht, exit, toilet, price, open, closed, no-entry).
- **0.5.0**: Courses 4–6 (37 new items): Dead Endings (final consonant groups and dead syllables), Vowel Universe (short, long and wrap-around vowels, ◌็, ◌ำ), Clusters and Leaders (true and false clusters, อ นำ, leading consonants). Each course has its own colour world on the Shrine. All 46 items with tone parts are checked against the tone engine.
- **0.4.0**: Mekong Predictor: build the Lao spelling of a Thai word (or the reverse) from tiles across 10 bridge laws (clusters, ร→ຮ, ช/ซ→ຊ, silent ◌์, ໜ/ໝ, Sanskrit letters, ◌ົວ, written o, ເ◌ຍ/◌ຽ, ເ◌ົາ), with law-specific feedback, a flagged law-breaker (รถ→ລົດ) and per-law mastery. Navigation regrouped into five tabs: Shrine, Ear, Tracer, Lab (Reactor, Orbit, Predictor) and Read (Slicer).
- **0.3.0**: Today Path on the Shrine (one ordered daily session sized to 5/12/20 minutes: reviews, Ear set, leech drill, new lessons gated on 80% weekly accuracy), streak, 7-day review forecast; FSRS-4.5 scheduling at 90% target recall with separate memory tracks for reading and tone/class; "I guessed" rating; leech detection (4+ lapses) with a lookalike contrast drill; three-question onboarding; reset no longer uses `confirm()`.
- **0.2.0**: Tone Ear Dojo (adaptive minimal-set listening drills, per-tone accuracy and confusions); reviews now ask a second question (tone for syllables and words, consonant class for letters) and explain which rule a wrong answer broke; colour-blind-safe tone, tier and class palettes (tone lightness follows pitch height, contours drawn as gradients, class shown with gold "altitude" ramp plus icons); text contrast floor raised to slate-400.
