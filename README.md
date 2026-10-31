# SuvarṇaKani

A single-file React app for learning to read Thai and Lao script: an SRS "Shrine" of glyphs, syllables and vocab, a stroke Tracer, a tone Reactor, a vowel Orbit, and a word Slicer for unspaced text.

## Files
- `SuvarnaKani.jsx`: the React app (hooks, Tailwind, lucide-react). Use it as the default export in any React + Tailwind project.
- `SuvarnaKani.html`: standalone build. Open it in a browser (internet is needed only for Google Fonts).
- `tailwind.preset.cjs`: colour tokens. Add it as a Tailwind preset if you use the JSX in another project.
- `tests/run.mjs`: tone, course and backup checks (`npm test`).
- `NOTES.md`: build notes, feature list and linguistic corrections to the original spec.

## Build
```
npm install
npm test        # tone and course checks
npm run build   # writes SuvarnaKani.html
```

## Install on a Galaxy phone

The `Deploy app to GitHub Pages` workflow builds `dist/` and publishes it on every push to `main`. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Pages on a private repo needs GitHub Pro; on a free plan, either make the repo public or drag the `dist/` folder onto [Netlify Drop](https://app.netlify.com/drop).

1. Open the Pages URL (`https://wazabi0.github.io/Suvarnakani/`) in Chrome or Samsung Internet.
2. Chrome: **⋮ → Add to Home screen → Install**. Samsung Internet: **☰ → Add page to → Home screen**.
3. Open SuvarṇaKani from its icon once while online. From then on it runs full screen and fully offline, fonts included.

Progress is stored on the phone, per browser and per web address. Install from one browser and keep using that icon. Updates arrive automatically: the next launch after a deploy fetches the new version.

For audio, set Settings → General management → Text-to-speech → Preferred engine to Speech Services by Google, then download Thai in that engine's settings.

## Changelog
- **0.23.0**: Read the world (Roadmap III, wave D).
  - **Lantern Library** (Read → Library). Twelve stories of seven or eight sentences, each in Thai and in Lao (180 sentences), written from course and garden words; other words carry their reading and meaning in the source. Text is unspaced; tap a word for its reading, meaning and tones, with tone tint. Read aloud lights each sentence in turn. A timed re-read records letters per minute and charts every read. A story shows how many of its course words you know and opens at 90% (or in sandbox); it can still be opened early. Press and hold a sentence (or EN, then + card) to send it to the Sentence deck. The Lao versions need a native check.
  - **Twenty-three signs** (D24). Fifteen new signs are written in a compact form (`SIGN_SRC`: words the course knows need nothing; others are word=reading=meaning; `$` prices and `#` numbers are read out with `numberWords`), with new worn-paint, road, pharmacy, hospital, neon, banner and river styles. A café menu is generated each day from food words (New menu reshuffles it).
  - **Ride the line** (Read, D25). Ten signs across Bangkok (four in Vientiane) in order; each stop gives a second less, from 14 to 6 seconds. Best score per script is kept.
  - **Review log** (F4). Each answer (item, track, rating, time; also tone-ear answers) goes to an IndexedDB `reviews` store and is kept for a year; the daily log keeps 365 days instead of 60. A 30-second study-time tick runs while the app is visible and in use.
  - **Ledger** (N15). A sheet from the Shrine: 26-week heatmap, reviews per day, recall by track against the 90% target (from the review log, or per-item counts before it), most confused tones, the ten hardest items, study time and a 30-day forecast.
- **0.22.0**: Words in the wild (Roadmap III, wave C).
  - **Word Garden** (levels 10–16). 280 everyday words in seven beds, each with a reading, its Lao word and a short Thai phrase. The beds open once every Level 4 item reaches stage 2; planting a bed adds its words to the lesson queue, three course items then two garden words. Tones come from the reading's tone marks and the tests check them against the reading engine. The Lao reading and the Thai-script text for the voice are spelled out from the Lao letters by `laoToThai` (◌ົ, ◌ຽ, ເ◌ັ, open ◌ື and ◌ໍ handled). The Lao words need a native check.
  - **Hear it in a phrase.** Lesson cards show and play the word's example, or a Slicer line that uses it.
  - **Sentence deck.** Slicer lines, the phrases of garden words you know, and Decoder words you have given a meaning become cards with their own FSRS memory, apart from the course. Directions rotate between reading for meaning, listening for meaning and filling the gap. Five new cards a day.
  - **Market Clock** (Lab). Prices in baht (or kip), times in the Thai six-period clock (ตี, โมงเช้า, บ่าย, โมงเย็น, ทุ่ม; Lao uses formal ໂມງ hours), and conversion between AD and Buddhist-era years, by ear or by eye. Numbers follow ยี่สิบ, เอ็ด and the Lao ຊາວ and ສິບພັນ.
  - **Classifier Corral** (Lab). Sort 29 things into eight Thai classifiers (seven in Lao), then pick the right counting phrase (noun, number, classifier).
  - **Forgiving readings.** Answers also match the RTGS spelling, and a loose match ignores aspiration, vowel length, g/k, j/ch and r/l.
- **0.21.0**: Take it outside (Roadmap III, wave B).
  - **Thai reading engine.** `readThai` splits Thai into syllables by trying every vowel pattern and picking the cheapest split (dynamic programming). It handles clusters, ห นำ and อ นำ, silent ◌์ letters, and the leading-letter rule (ขนม, ตลาด). Hidden vowels are inferred and flagged as guesses. Each syllable's class, live or dead, length and mark go through `computeTone`. `segmentThai` splits unspaced text into words, preferring words the course already knows (course items, slicer words, sign tokens) and their course readings. The tests check 42 words and every slicer word against it.
  - **Decoder** (Read → Decoder). Paste or type Thai or Lao. Each word shows its tone-tinted syllables, a card per syllable (tone, class, live or dead, mark, the rule, any notes) and Listen. Course words open in the Inspector; other words can be saved. Lao uses the Vientiane reader from 0.18.
  - **Share target and shortcuts.** The manifest registers SuvarṇaKani as a share target, so text shared from Google Lens, LINE or Chrome opens in the Decoder. Long-pressing the icon offers Reviews, Ear Dojo and Decoder. A monochrome icon supports Android's themed icons.
  - **Tone tint.** Syllables are coloured by tone in the Decoder, Street Reader and the Slicer's word cards. A word is fully coloured until its item reaches stage 3, underlined in its tone colour at stages 3–4, and plain once burned. It can be turned off in Settings.
  - **Font Gauntlet** (Read → Font Gauntlet). A word in eight faces (Noto Serif Thai, Sarabun, Kanit, Prompt, Mitr, Chakra Petch, Sriracha, Itim; three Lao faces), and a letter drill in loopless and handwritten faces with accuracy per face. The installed app bundles only the Thai and Lao subsets of the new faces (about 110 KB).
  - **Romanisation.** Settings → Romanisation switches Thai readings between the learner spelling, RTGS and IPA (with Chao tone letters).
  - **Random fonts in reviews.** An option shows stage 3+ items in a different face each day.
  - **Slicer.** 26 new lines (13 topics in Thai and Lao), 30 in all, from toilets and prices to a trip to Chiang Mai or Luang Prabang. The Lao lines need a native check.
- **0.20.0**: Safe ground (Roadmap III, wave A).
  - **Backups.** Settings → Backup shares a backup file through the Android share sheet (or downloads it), and Restore a file brings it back on any phone or browser. The app also keeps one snapshot a day for the last seven days in IndexedDB, taken as the app opens, so you can roll back to the start of any of those days. A restore saves the current state as a snapshot first.
  - **Back gesture.** Every sheet (reviews, lessons, the Inspector, Settings) adds a history entry, so Android's back gesture closes the sheet instead of leaving the app. Back from any other tab returns to the Shrine.
  - **Settings sheet.** The header keeps the logo, the script switch and a gear. Font, unlock-all, daily goal, audio, reset and the new settings live in one sheet: your polite particle (ครับ, ค่ะ/คะ, or both shown until you choose), text size and haptics. With ค่ะ/คะ chosen, your lines in the Shadow Mirror dialogues and the Street Reader chat use ค่ะ for statements and คะ for questions, with the right tones for scoring.
  - **Screen stays on** during any sheet, the Tracer and the Shadow Mirror (Screen Wake Lock).
  - **Updates.** When a new build takes over, a bar offers Reload, and What's new lists the changes once.
  - **Tests.** `npm test` checks every toned item against the tone engine, the Bangkok rule table, Lao syllable splits and Vientiane tones, course ids, scheduling, particles and backups (341 checks). The Pages workflow runs it on pull requests and before every deploy.
  - **Design tokens.** Tailwind's slate, white and black, and the app surfaces, now read CSS variables defined in the app (`THEME_CSS`), ready for a daylight theme. When dropping the JSX into another project, add `tailwind.preset.cjs` as a Tailwind preset.
- **0.19.0**: Install on the phone. A GitHub Actions workflow publishes `dist/` to GitHub Pages. The build now bundles the Thai, Lao and Latin fonts into `dist/fonts` (about 430 KB) and the service worker precaches them, so the installed app works offline from its first launch with no requests to Google. The app also asks the browser for persistent storage, so Android does not clear saved progress when space runs low.
- **0.18.0**: Lao as a full course. Lao mode now has its own item list:
  - **Fewer duplicates.** Thai-only letters such as ศ ษ ฉ ฆ ฐ, and the Thai final-consonant groups, collapse onto Lao letters you already have, so they are dropped.
  - **Six Lao-only items.** ຢ (Middle-class y), ໜ ໝ ຫຼ (High-class n, m and l) and the vowels ◌ົ and ◌ຽ are added at the levels where they belong.
  - **Lao classes.** Glyphs are asked about their Lao class, and class feedback names the Lao letters in each class.
  - **Vientiane tones.** Every word gets Vientiane tones read from its Lao spelling. A small syllabifier splits unspaced Lao, such as ສະ|ບາຍ|ດີ and ຕະ|ຫຼາດ. Each syllable's class, live/dead, vowel length and mark then give one of five tones: Rising 24, High 45, Mid 33, Low falling 31 and High falling 52. The rules follow the five-rule summary in *The Lao writing system for Thai speakers (Vientiane dialect)*, and I checked them against its 31 example words.
  - **Lao tone feedback.** Tone questions show the Lao tones, and a wrong answer gets a Lao rule line, for example "Middle class + live + no mark = Rising (24, Vientiane)".
  - **Shared progress.** SRS progress is shared by item id across modes, so a word you know in Thai stays known in Lao. The Tracer, confusable distractors, the Shrine level list and the Today Path all follow the Lao list.
  - **Ear Dojo.** Lao sets now show each word's tone after you answer.
  - **Lao romanisation.** Romanisation in Lao mode is Lao-only.

  Caveat: Lao tone descriptions vary by speaker and source. This course teaches the common learner model and does not split the rising tone by class.
- **0.17.0**: Dialogue shadowing. The Shadow Mirror has a new Dialogue view with two short Bangkok dialogues, *At the counter* and *Asking the way*, 12 lines in all.
  - You can hear one line or play the dialogue from the top up to your line, then say it.
  - Your pitch over the whole line is octave-fixed and lined up with the chained Chao contours of its syllables by dynamic time warping. People never give every syllable the same length, so the warping matters.
  - Each syllable is scored on its own and drawn in its own box over its tone colour. The tip names the syllable that is furthest off and says which way to move it.
  - Your best score on each line is saved.
- **0.16.0**: Ear Dojo decks. Pick a deck before a session:
  - **Single syllables**: the original minimal sets.
  - **Two-syllable words**: 27 everyday words such as ข้าวผัด, ผู้หญิง and หนังสือ, in three themed sets. You name the tone of each syllable in turn. Both answers count towards your per-tone scores and confusions, and the trial picker leans towards words that contain your weak tones.
  - **Lao sets**: six Lao minimal sets (ມາ ມ້າ ໝາ, ຂາ ຂ່າ ຂ້າ, ນາ ນ້າ ໜ້າ ໜາ, ປາ ປ່າ ປ້າ, ເສືອ ເສື່ອ ເສື້ອ, ໄມ້ ໃໝ່ ໄໝ). You pick the spelling you heard, with per-set scores. This deck plays only with a real Lao voice. Vientiane tones differ from Bangkok tones, so it never falls back to a Thai voice, and it tells you how to get a Lao voice.

  The speech engine also no longer throws when a stored voice object goes stale.
- **0.15.0**: A fourth step on the Today Path, and scheduled Mekong laws. The path now ends with one practice activity that rotates by day: trace 3 letters, work through a Mekong law (4 words), read a street sign against the clock, or shadow 5 syllables. Due work wins the day: 3 or more letters due to write make it a tracing day, otherwise a due Mekong law takes it. Once you begin an activity it stays as today's step. Tapping the step opens the right tab, and the Tracer opens on the first letter that is due. Each bridge law now gets its own FSRS track the first time you try it (right = 3, wrong = 1). The Predictor opens on the most overdue law, marks due laws in the list, and moves on to the next due law when you finish one. Traces, Mekong words and street signs now count towards the streak.
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
