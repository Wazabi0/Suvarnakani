# Native Thai voices (Roadmap IV, C1)

The app plays a real speaker's recording for any Thai word or sentence listed in
`voices/th/index.json`, rotating speakers on each play, and falls back to the
phone's voice for everything else. Lao is never read from these clips. This
folder makes that pack from **Mozilla Common Voice Thai** (CC0, so no
attribution is required, though the app names the source in Settings).

Nothing here runs in CI: the pack is built once on a computer with the data,
checked by ear, and committed.

## 1. Get the data

1. Sign in at the Mozilla Data Collective (datacollective.mozillafoundation.org),
   find **Common Voice Scripted Speech, Thai**, accept the terms and download the
   latest release (several GB).
2. Unpack it. You need the folder holding `validated.tsv` and `clips/`, e.g.
   `~/cv/cv-corpus-23.0/th`.

## 2. Install the tools

```sh
# ffmpeg (brew install ffmpeg, apt install ffmpeg, ...)
conda create -n mfa -c conda-forge montreal-forced-aligner
conda activate mfa
mfa model download acoustic thai_mfa
mfa model download dictionary thai_mfa
pip install pythainlp   # optional: splits the transcripts into words first
```

## 3. Build

```sh
node scripts/voices/targets.mjs                     # every Thai text the app speaks → voices/targets.json
python3 scripts/voices/make_pack.py prepare --cv ~/cv/cv-corpus-23.0/th --work ~/cv/work
mfa align ~/cv/work/corpus thai_mfa thai_mfa ~/cv/work/aligned --clean
python3 scripts/voices/make_pack.py build   --cv ~/cv/cv-corpus-23.0/th --work ~/cv/work
```

`prepare` keeps clips with at least 2 up-votes and no down-votes, picks up to 8
speakers per target word (shortest sentences first, they align best) plus every
clip whose whole sentence is one of the app's sentences, and converts them for
MFA. `build` cuts each target word from the alignments (joining up to four
aligned tokens when MFA splits a word), keeps up to 3 speakers per word or
sentence (most up-voted first, alternating male and female where it can), drops
clips that are too short, too long or too quiet, and writes 48 kbps mono MP3s.

## 4. Check by ear, then commit

Open `voices/th/review.html` in a browser and listen. For any bad clip (wrong
word, cut off, noisy), add its file name to `voices/reject.txt` and run `build`
again; the next speaker takes its place. Then commit `voices/th/` and
`voices/reject.txt`. `npm run build` copies the pack into `dist/voices/th/`, and
the service worker keeps each clip once it has played.
