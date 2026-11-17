"""Add clean studio clips from the NECTEC LOTUS corpus to the native Thai voice pack.

LOTUS (2005, NECTEC, CC BY-NC-SA 3.0) has 24 speakers (12 women, 12 men) reading
phonetically balanced sentences into a close-talk microphone, once in a quiet room
("Clean", CCF001...) and once in an office ("Office", COF001..., the same people), with hand-checked phone labels. Those labels give exact
word boundaries, so no aligner is needed: each sentence's words come from
Supplement/PDsen.txt (words split by "|", syllables by spaces) and are matched phone
by phone to the .lab files.

  curl -L -o lotus.zip https://github.com/korakot/corpus/releases/download/v1.0/AIFORTHAI-LotusCorpus.zip
  unzip lotus.zip 'LOTUS/PD/C/*' 'LOTUS/Supplement/*'
  node scripts/voices/targets.mjs
  python3 scripts/voices/lotus.py --lotus path/to/LOTUS

Runs after make_pack.py build: it adds up to --per-word LOTUS clips per word in front
of the Common Voice ones (the app plays the first clip first), keeps at most --max
clips per word in all, and rewrites voices/th/index.json. Words said next to a pause
and recorded in the quiet room come first; genders alternate. Entries in
voices/reject.txt (file name, or word:LOTUS file id) are skipped.
"""
import argparse, difflib, glob, hashlib, json, os, re, subprocess, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from make_pack import VOICES, key, load_dict, load_targets, loudness, mfa_check, tokenize  # noqa: E402

SOURCE = "Mozilla Common Voice Thai (CC0) and NECTEC LOTUS corpus (CC BY-NC-SA 3.0)"
PAUSES = ("sil", "sp")


def read_lab(path):
    out = []
    with open(path) as f:
        for line in f:
            p = line.split()
            if len(p) == 3:
                out.append((int(p[0]) / 1e7, int(p[1]) / 1e7, p[2]))
    return out


def word_phones(phones):
    """PDsen phone column → [(word index, phone)], dropping tones and the empty final z^."""
    out = []
    for wi, w in enumerate(phones.strip().strip("|").split("|")):
        for syl in w.split():
            out += [(wi, p) for p in syl.split("-")[:-1] if p != "z^"]
    return out


def load_lotus(root):
    sen = {}
    with open(os.path.join(root, "Supplement", "PDsen.txt"), encoding="utf-8") as f:
        for line in f:
            p = line.rstrip("\r\n").split("\t")
            if len(p) >= 3:
                sen[p[0]] = (p[1].split(), p[2])
    idx = {}
    with open(os.path.join(root, "Supplement", "index.txt"), encoding="utf-8") as f:
        for line in f:
            p = line.split()
            if len(p) == 3 and p[0].startswith("Pa"):
                idx[(p[0], p[1])] = p[2]
    return sen, idx


def spans(lab, words, phones):
    """Each word's (start, end, pause before, pause after) from a label file, when its phones match."""
    real = [(i, x) for i, x in enumerate(lab) if x[2] not in PAUSES]
    want = word_phones(phones)
    sm = difflib.SequenceMatcher(a=[x[2] for _, x in real], b=[p for _, p in want], autojunk=False)
    ok = {}
    for tag, a0, a1, b0, b1 in sm.get_opcodes():
        if tag == "equal":
            for k in range(a1 - a0):
                ok[b0 + k] = real[a0 + k][0]
    by_word = defaultdict(list)
    for j, (wi, _) in enumerate(want):
        by_word[wi].append(j)
    out = {}
    for wi, js in by_word.items():
        if wi >= len(words) or not all(j in ok for j in js):
            continue
        li = [ok[j] for j in js]
        if li != list(range(li[0], li[0] + len(li))):
            continue  # a pause inside the word: skip
        a, b = li[0], li[-1]
        before = lab[a - 1] if a > 0 else None
        after = lab[b + 1] if b + 1 < len(lab) else None
        pb = before[1] - before[0] if before and before[2] in PAUSES else 0.0
        pa = after[1] - after[0] if after and after[2] in PAUSES else 0.0
        out[wi] = (lab[a][0], lab[b][1], pb, pa)
    return out


def cut(src, dst, start, end, pad_before, pad_after, gain):
    s = max(0.0, start - pad_before)
    flt = f"volume={gain:.1f}dB,afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{s:.3f}", "-t", f"{end + pad_after - s:.3f}", "-i", src,
                    "-ac", "1", "-ar", "24000", "-af", flt, "-b:a", "48k", dst], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lotus", required=True, help="the LOTUS folder (holds PD/ and Supplement/)")
    ap.add_argument("--per-word", type=int, default=3)
    ap.add_argument("--max", type=int, default=6, help="clips per word in all, LOTUS first")
    ap.add_argument("--min-db", type=float, default=-40.0)
    ap.add_argument("--target-db", type=float, default=-21.0, help="mean loudness the clips are brought to")
    ap.add_argument("--dict", help="thai_mfa.dict: with --acoustic, check every clip as make_pack.py verify does")
    ap.add_argument("--acoustic", help="thai_mfa.zip")
    ap.add_argument("--mfa", default="mfa")
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--work", default=os.path.join(os.path.expanduser("~"), "lotus-work"))
    args = ap.parse_args()

    words, _ = load_targets()
    want = {key(w): w for w in words}
    sen, idx = load_lotus(args.lotus)
    rejected = set()
    rj = os.path.join(VOICES, "reject.txt")
    if os.path.exists(rj):
        rejected = {l.strip() for l in open(rj, encoding="utf-8") if l.strip() and not l.startswith("#")}

    cands = defaultdict(list)
    for wav in sorted(glob.glob(os.path.join(args.lotus, "PD", "C", "*", "Wav", "*", "*.wav"))):
        base = os.path.basename(wav)[:-4]
        spk, pa, n = base.split("_")
        sid = idx.get((pa, n))
        labs = glob.glob(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(wav))), "*lab", base + ".lab"))
        if not sid or sid not in sen or not labs:
            continue
        toks, phones = sen[sid]
        clean = "/Clean/" in wav.replace(os.sep, "/")
        for wi, (s, e, pb, pa_) in spans(read_lab(labs[0]), toks, phones).items():
            k = key(toks[wi])
            if k not in want or not 0.12 <= e - s <= 1.6:
                continue
            quiet = (pb >= 0.05) + (pa_ >= 0.05)
            cands[want[k]].append({"wav": wav, "id": base, "spk": spk[2:], "g": "f" if spk[2] == "F" else "m", "span": (s, e),
                                   "pad": (min(0.06, pb * 0.6) if pb else 0.008, min(0.08, pa_ * 0.6) if pa_ else 0.008),
                                   "quiet": quiet, "clean": clean})

    # Shortlist: per word, the best few candidates from different speakers.
    for target, pool in cands.items():
        pool.sort(key=lambda c: (-c["quiet"], not c["clean"], c["id"]))
        short, spk = [], set()
        for c in pool:
            if c["spk"] not in spk:
                short.append(c)
                spk.add(c["spk"])
            if len(short) >= args.per_word * 2:
                break
        cands[target] = short
    if args.dict and args.acoustic:
        # The same closed-set check as make_pack.py verify: the aligner must pick the
        # word itself over ~75 decoys (other words, the word plus a stray syllable).
        import random
        random.seed(7)
        D = load_dict(args.dict)
        by_len = defaultdict(list)
        for prs in D.values():
            for pr in prs:
                by_len[len(pr.split())].append(pr)

        def prons(text):
            out = [""]
            for t in tokenize(text, args.dict).split():
                if t not in D:
                    return []
                out = [(a + " " + b).strip() for a in out for b in D[t]][:8]
            return out
        items = []
        for target, pool in cands.items():
            tp = prons(target)
            for c in pool:
                items.append((f"{target}|{c['id']}", target, tp, c["wav"], c["span"][0], c["span"][1], 0.03))
        os.makedirs(args.work, exist_ok=True)
        passed = {m[0] for m, ph in mfa_check(args, items, "lotus", by_len, by_len[2] + by_len[3]).values()
                  if " ".join(p[2] for p in ph) in m[2]}
        before = sum(len(v) for v in cands.values())
        for target in cands:
            cands[target] = [c for c in cands[target] if f"{target}|{c['id']}" in passed]
        print(f"aligner check: {sum(len(v) for v in cands.values())} of {before} LOTUS clips passed")

    index_path = os.path.join(VOICES, "th", "index.json")
    with open(index_path, encoding="utf-8") as f:
        index = json.load(f)
    clips = index["clips"]
    # Drop LOTUS clips from an earlier run, so this is repeatable.
    for t in list(clips):
        clips[t] = [c for c in clips[t] if not c[1].startswith("L")]
    added, words_hit = 0, 0
    for target, pool in sorted(cands.items()):
        picked, seen = [], set()
        while pool and len(picked) < args.per_word:
            wantg = ("m" if picked[-1]["g"] == "f" else "f") if picked else None
            free = [c for c in pool if c["spk"] not in seen]
            if not free:
                break
            top = [c for c in free if c["quiet"] == free[0]["quiet"]]  # either room, same pause context
            c = next((x for x in top if x["g"] == wantg), None) or free[0]
            pool.remove(c)
            sid = "L" + c["spk"].lower()  # e.g. Lf001, Lm034
            fname = f"{hashlib.sha1(target.encode()).hexdigest()[:10]}-{sid}.mp3"
            if fname in rejected or f"{target}:{c['id']}" in rejected:
                continue
            s, e = c["span"]
            db = loudness(c["wav"], s, e - s)
            if db < args.min_db:
                continue
            cut(c["wav"], os.path.join(VOICES, "th", fname), s, e, *c["pad"], gain=max(-6.0, min(12.0, args.target_db - db)))
            seen.add(c["spk"])
            picked.append({**c, "f": fname, "sid": sid})
        if picked:
            words_hit += 1
            added += len(picked)
            clips[target] = ([[p["f"], p["sid"], p["g"]] for p in picked] + clips.get(target, []))[: args.max]
    used = {c[0] for lst in clips.values() for c in lst}
    for name in os.listdir(os.path.join(VOICES, "th")):
        if name.endswith(".mp3") and "-L" in name and name not in used:
            os.remove(os.path.join(VOICES, "th", name))
    index["source"] = SOURCE
    index["license"] = "CC0-1.0 (Common Voice); CC BY-NC-SA 3.0 (LOTUS, NECTEC)"
    index["speakers"] = len({c[1] for lst in clips.values() for c in lst})
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    print(f"LOTUS: {added} clips for {words_hit} words; pack now {len(used)} clips, {index['speakers']} speakers")


if __name__ == "__main__":
    main()
