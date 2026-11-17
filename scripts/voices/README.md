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
python3 scripts/voices/make_pack.py prepare --cv ~/cv/cv-corpus-23.0/th --work ~/cv/work --dict ~/Documents/MFA/pretrained_models/dictionary/thai_mfa.dict
mfa align ~/cv/work/corpus thai_mfa thai_mfa ~/cv/work/aligned --clean --no_tokenization
python3 scripts/voices/make_pack.py verify  --cv ~/cv/cv-corpus-23.0/th --work ~/cv/work \
    --dict ~/Documents/MFA/pretrained_models/dictionary/thai_mfa.dict \
    --acoustic ~/Documents/MFA/pretrained_models/acoustic/thai_mfa.zip
python3 scripts/voices/make_pack.py build   --cv ~/cv/cv-corpus-23.0/th --work ~/cv/work
```

`prepare` keeps clips with at least 2 up-votes and no down-votes, picks up to 8
speakers per target word (shortest sentences first, they align best) plus every
clip whose whole sentence is one of the app's sentences, and converts them for
MFA. `build` cuts each target word from the alignments (joining up to four
aligned tokens when MFA splits a word), keeps up to 3 speakers per word or
sentence (most up-voted first, alternating male and female where it can), drops
clips that are too short, too long or too quiet, and writes 48 kbps mono MP3s.

`verify` is the check that doesn't need a Thai ear. It runs the aligner again
on every word clip as a tiny recogniser: the clip may be its word or any of
about 75 decoys (similar-length words, and the word with a stray syllable
before or after). A clip passes only when the word itself fits best; when the
word plus a stray syllable wins, the clip is re-cut to just the word's sounds
and checked again. Of 11 clips a learner flagged by ear it caught 9 (the 2 it
missed are in `reject.txt`). On the first full run, 3,716 of 4,854 candidates
passed, 1,537 of them after trimming.

## 4. Check by ear, then commit

Open `voices/th/review.html` in a browser and listen. For any bad clip (wrong
word, cut off, noisy), add its file name to `voices/reject.txt` and run `build`
again; the next speaker takes its place. Then commit `voices/th/` and
`voices/reject.txt`. `npm run build` copies the pack into `dist/voices/th/`, and
the service worker keeps each clip once it has played.

## Clean clips from LOTUS

`lotus.py` adds studio clips from the NECTEC LOTUS corpus (CC BY-NC-SA 3.0, so the app
must stay non-commercial and credit it). The cloud can download it directly:

```
curl -L -o lotus.zip https://github.com/korakot/corpus/releases/download/v1.0/AIFORTHAI-LotusCorpus.zip
unzip lotus.zip 'LOTUS/PD/C/*' 'LOTUS/Supplement/*'
node scripts/voices/targets.mjs
python3 scripts/voices/lotus.py --lotus LOTUS --dict thai_mfa.dict --acoustic thai_mfa.zip --mfa path/to/mfa
```

LOTUS has hand-checked phone labels, so word boundaries come straight from them. Each
cut is then checked by the aligner, as `verify` does. Run it after `make_pack.py build`.
It replaces earlier LOTUS clips, so it can be run again. This release of LOTUS holds
read sentences only, with no isolated words and no letter names.
