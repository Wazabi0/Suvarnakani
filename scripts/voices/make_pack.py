#!/usr/bin/env python3
"""Native Thai voice pack for SuvarnaKani (Roadmap IV, C1).

Turns Mozilla Common Voice Thai (CC0) into short word and sentence clips the
app plays instead of the phone's voice. Two steps, with Montreal Forced Aligner
in between (see README.md in this folder):

  python3 scripts/voices/make_pack.py prepare --cv CV_TH_DIR --work WORK_DIR
  mfa align WORK_DIR/corpus thai_mfa thai_mfa WORK_DIR/aligned
  python3 scripts/voices/make_pack.py build --cv CV_TH_DIR --work WORK_DIR

CV_TH_DIR is the unpacked Thai folder (validated.tsv and clips/). The result
lands in voices/th/: index.json, the clips, and review.html for listening
through them. Clips you reject in review.html go in voices/reject.txt and are
left out on the next build.

Needs ffmpeg on PATH. pythainlp is optional: with it, the .lab transcripts are
split into words before alignment, which helps MFA on unspaced Thai.
"""
import argparse
import csv
import hashlib
import html
import json
import os
import re
import subprocess
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VOICES = os.path.join(ROOT, "voices")
THAI = re.compile(r"[^฀-๿]")
SKIP_WORDS = {"", "<eps>", "sil", "sp", "spn", "<unk>"}

csv.field_size_limit(sys.maxsize)


def key(text):
    """Same as the app's nativeKey(): Thai letters only, no spaces, sara am composed (MFA writes ำ as ํ + า)."""
    return re.sub("\u0e4d([\u0e48-\u0e4b]?)\u0e32", "\\1\u0e33", THAI.sub("", text or ""))


def load_targets():
    path = os.path.join(VOICES, "targets.json")
    if not os.path.exists(path):
        sys.exit("voices/targets.json is missing: run `node scripts/voices/targets.mjs` first.")
    with open(path, encoding="utf-8") as f:
        t = json.load(f)
    return {w["text"]: w.get("level", 99) for w in t["words"]}, set(t["sentences"])


def load_cv(cv_dir, min_up=2):
    """Validated clips with at least `min_up` up-votes and no down-votes."""
    rows = []
    with open(os.path.join(cv_dir, "validated.tsv"), encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE):
            try:
                up, down = int(r.get("up_votes") or 0), int(r.get("down_votes") or 0)
            except ValueError:
                continue
            if up < min_up or down > 0:
                continue
            g = (r.get("gender") or "").lower()
            rows.append({
                "path": r["path"], "speaker": r["client_id"], "text": r["sentence"], "key": key(r["sentence"]),
                "gender": "m" if g.startswith("male") else "f" if g.startswith("female") else "",
                "up": up,
            })
    return rows


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


_TOKENIZER = {}


def tokenize(text, dict_path=None):
    """Space-separated words. With the MFA dictionary, splits only into words it can pronounce."""
    try:
        from pythainlp.tokenize import word_tokenize  # optional
    except ImportError:
        return text
    if dict_path and "trie" not in _TOKENIZER:
        from pythainlp.util import Trie
        with open(dict_path, encoding="utf-8") as f:
            _TOKENIZER["trie"] = Trie({l.split("\t", 1)[0] for l in f if l.strip()})
    trie = _TOKENIZER.get("trie")
    toks = word_tokenize(text, custom_dict=trie, keep_whitespace=False) if trie else word_tokenize(text, keep_whitespace=False)
    return " ".join(t for t in toks if t.strip())


def token_hits(tokens, words, max_join=4):
    """Targets spelled by 1 to max_join consecutive tokens."""
    hits = set()
    for i in range(len(tokens)):
        joined = ""
        for j in range(i, min(len(tokens), i + max_join)):
            joined += tokens[j]
            if joined in words:
                hits.add(joined)
    return hits


def prepare(args):
    words, sentences = load_targets()
    rows = load_cv(args.cv, args.min_up)
    # For each target word, the clips that contain it, spread over speakers.
    by_word = defaultdict(list)
    for n, r in enumerate(rows):
        if not any(w in r["key"] for w in words):
            continue
        # Count a clip for a word only where the word stands as whole tokens (กา is not in การ).
        r["lab"] = tokenize(r["text"], args.dict)
        for w in token_hits([key(t) for t in r["lab"].split()], words):
            by_word[w].append(r)
        if (n + 1) % 20000 == 0:
            print(f"  {n + 1} / {len(rows)} sentences scanned")
    chosen = {}
    for w, rs in by_word.items():
        seen = set()
        rs.sort(key=lambda r: (len(r["key"]), -r["up"]))  # short sentences align best
        for r in rs:
            if r["speaker"] in seen:
                continue
            seen.add(r["speaker"])
            chosen[r["path"]] = r
            if len(seen) >= args.candidates:
                break
    for r in rows:
        if r["key"] in sentences:
            chosen[r["path"]] = r
    corpus = os.path.join(args.work, "corpus")
    os.makedirs(corpus, exist_ok=True)
    os.makedirs(args.work, exist_ok=True)
    with open(os.path.join(args.work, "needed.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(sorted(chosen)) + "\n")
    missing = {p for p in chosen if not os.path.exists(os.path.join(args.cv, "clips", p))}
    if missing:
        print(f"{len(missing)} of {len(chosen)} chosen clips are not in {args.cv}/clips yet (list: needed.txt); converting the rest.")
    for i, r in enumerate(r for r in chosen.values() if r["path"] not in missing):
        spk = hashlib.sha1(r["speaker"].encode()).hexdigest()[:10]
        d = os.path.join(corpus, spk)
        os.makedirs(d, exist_ok=True)
        base = os.path.splitext(r["path"])[0]
        wav = os.path.join(d, base + ".wav")
        if not os.path.exists(wav):
            run(["ffmpeg", "-y", "-i", os.path.join(args.cv, "clips", r["path"]), "-ac", "1", "-ar", "16000", wav])
        with open(os.path.join(d, base + ".lab"), "w", encoding="utf-8") as f:
            f.write(r.get("lab") or tokenize(r["text"], args.dict))
        if (i + 1) % 200 == 0:
            print(f"  {i + 1} / {len(chosen)} clips converted")
    covered = sum(1 for w in words if by_word.get(w))
    print(f"{len(chosen)} clips in {corpus}: {covered} of {len(words)} words appear in Common Voice.")
    print(f"Next: mfa align {corpus} thai_mfa thai_mfa {os.path.join(args.work, 'aligned')}")


def read_tier(path, names=("phones", "phone")):
    """Intervals [(start, end, text)] of one tier of a long-format TextGrid."""
    with open(path, encoding="utf-8") as f:
        lines = [l.strip() for l in f]
    out, tier, cur = [], None, {}
    for l in lines:
        if l.startswith("name ="):
            tier = l.split("=", 1)[1].strip().strip('"')
        elif tier and tier.lower() in names:
            if l.startswith("xmin ="):
                cur = {"s": float(l.split("=")[1])}
            elif l.startswith("xmax =") and "s" in cur:
                cur["e"] = float(l.split("=")[1])
            elif l.startswith("text =") and "e" in cur:
                out.append((cur["s"], cur["e"], l.split("=", 1)[1].strip().strip('"')))
                cur = {}
    return out


def read_textgrid(path):
    """Word intervals [(start, end, text)] from a long-format TextGrid's word tier."""
    with open(path, encoding="utf-8") as f:
        lines = [l.strip() for l in f]
    out, tier, cur = [], None, {}
    for l in lines:
        if l.startswith("name ="):
            tier = l.split("=", 1)[1].strip().strip('"')
        elif tier and tier.lower() in ("words", "word"):
            if l.startswith("xmin ="):
                cur = {"s": float(l.split("=")[1])}
            elif l.startswith("xmax =") and "s" in cur:
                cur["e"] = float(l.split("=")[1])
            elif l.startswith("text =") and "e" in cur:
                out.append((cur["s"], cur["e"], l.split("=", 1)[1].strip().strip('"')))
                cur = {}
    return out


def word_spans(intervals, words, max_join=4, pause=0.08):
    """(start, end, target, quiet) where 1 to max_join consecutive aligned words spell a target.

    quiet counts the sides (0 to 2) where the speaker paused or the clip starts or
    ends: words said in a run blur into their neighbours, so those cut worse.
    """
    toks = [(s, e, key(t)) for s, e, t in intervals if t.strip() not in SKIP_WORDS and key(t)]
    out = []
    for i in range(len(toks)):
        joined = ""
        for j in range(i, min(len(toks), i + max_join)):
            joined += toks[j][2]
            if joined in words:
                before = i == 0 or toks[i][0] - toks[i - 1][1] >= pause
                after = j == len(toks) - 1 or toks[j + 1][0] - toks[j][1] >= pause
                out.append((toks[i][0], toks[j][1], joined, int(before) + int(after)))
            if len(joined) > 24:
                break
    return out


def loudness(path, start=None, dur=None):
    cmd = ["ffmpeg", "-hide_banner", "-nostats"]
    if start is not None:
        cmd += ["-ss", f"{start:.3f}", "-t", f"{dur:.3f}"]
    cmd += ["-i", path, "-af", "volumedetect", "-f", "null", "-"]
    p = subprocess.run(cmd, capture_output=True, text=True)
    m = re.search(r"mean_volume: (-?[\d.]+) dB", p.stderr)
    return float(m.group(1)) if m else -99.0


def cut(src, dst, start=None, end=None, pad=0.06):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    cmd = ["ffmpeg", "-y"]
    if start is not None:
        s = max(0.0, start - pad)
        cmd += ["-ss", f"{s:.3f}", "-t", f"{end + pad - s:.3f}"]
    cmd += ["-i", src, "-ac", "1", "-ar", "24000"]
    flt = "afade=t=in:d=0.03,areverse,afade=t=in:d=0.04,areverse"
    if start is None:  # whole sentence: trim the silence at both ends
        flt = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse," + flt
    cmd += ["-af", flt, "-b:a", "48k", dst]
    run(cmd)


def gather(args, words, sentences, rows):
    """Every candidate clip per target: whole clips that are the text, and word spans from the alignments."""
    cands = defaultdict(list)  # target -> [candidate]
    corpus, aligned = os.path.join(args.work, "corpus"), os.path.join(args.work, "aligned")
    for spk in sorted(os.listdir(corpus)) if os.path.isdir(corpus) else []:
        for name in sorted(os.listdir(os.path.join(corpus, spk))):
            if not name.endswith(".wav"):
                continue
            base = name[:-4]
            r = rows.get(base)
            if not r:
                continue
            wav = os.path.join(corpus, spk, name)
            if r["key"] in sentences or r["key"] in words:
                # A clip that is the whole word or sentence: no cutting needed, best of all.
                cands[r["key"]].append({"r": r, "wav": wav, "span": None, "quiet": 3})
            tg = os.path.join(aligned, spk, base + ".TextGrid")
            if os.path.exists(tg):
                for s, e, w, quiet in word_spans(read_textgrid(tg), words):
                    if args.min_word <= e - s <= args.max_word and not (r["key"] == w):
                        cands[w].append({"r": r, "wav": wav, "span": (s, e), "quiet": quiet})
    return cands


def cand_id(target, c):
    span = c["span"]
    return f"{target}|{os.path.splitext(c['r']['path'])[0]}|{span[0]:.3f}" if span else f"{target}|{os.path.splitext(c['r']['path'])[0]}|all"


def build(args):
    words, sentences = load_targets()
    rows = {os.path.splitext(r["path"])[0]: r for r in load_cv(args.cv, args.min_up)}
    reject_file = os.path.join(VOICES, "reject.txt")
    rejected = set()
    if os.path.exists(reject_file):
        with open(reject_file, encoding="utf-8") as f:
            rejected = {l.strip() for l in f if l.strip() and not l.startswith("#")}
    cands = gather(args, words, sentences, rows)
    verified_file = os.path.join(args.work, "verified.json")
    if os.path.exists(verified_file):
        # Words keep only clips that passed `verify`, cut where it found the word.
        with open(verified_file, encoding="utf-8") as f:
            verified = json.load(f)
        for target in list(cands):
            if target in sentences and target not in words:
                continue
            kept = []
            for c in cands[target]:
                v = verified.get(cand_id(target, c))
                if v and v["ok"]:
                    kept.append({**c, "span": tuple(v["span"]) if v["span"] else None, "pad": v.get("pad", 0.06)})
            cands[target] = kept
        print(f"using {verified_file}: {sum(len(v) for t, v in cands.items() if t in words)} verified word clips")

    out_dir = os.path.join(VOICES, "th")
    os.makedirs(out_dir, exist_ok=True)
    speakers, clips, report = {}, {}, []
    for target in sorted(cands, key=lambda t: (words.get(t, 100), t)):
        picked, seen = [], set()
        # One clip per speaker, alternating genders among equally clean candidates.
        # Words said on their own or between pauses first, then the most up-voted.
        pool = sorted(cands[target], key=lambda c: (-c["quiet"], -c["r"]["up"]))
        while pool and len(picked) < args.per_text:
            want = None
            if picked and picked[-1]["r"]["gender"]:
                want = "f" if picked[-1]["r"]["gender"] == "m" else "m"
            free = [c for c in pool if c["r"]["speaker"] not in seen]
            best = [c for c in free if c["quiet"] == free[0]["quiet"]] if free else []
            c = next((c for c in best if c["r"]["gender"] == want), None) or (free[0] if free else None)
            if not c:
                break
            pool.remove(c)
            # Speaker ids come from the Common Voice id, so file names stay put between builds.
            sid = speakers.setdefault(c["r"]["speaker"], "s" + hashlib.sha1(c["r"]["speaker"].encode()).hexdigest()[:6])
            fname = f"{hashlib.sha1(target.encode()).hexdigest()[:10]}-{sid}.mp3"
            src = f"{target}:{os.path.splitext(c['r']['path'])[0]}"
            if fname in rejected or src in rejected:
                continue
            span = c["span"]
            if loudness(c["wav"], *(span[0], span[1] - span[0]) if span else (None, None)) < args.min_db:
                continue  # too quiet or empty
            dst = os.path.join(out_dir, fname)
            if not os.path.exists(dst):
                cut(c["wav"], dst, *(span if span else (None, None)), pad=c.get("pad", 0.06))
            seen.add(c["r"]["speaker"])
            picked.append(c)
            clips.setdefault(target, []).append([fname, sid, c["r"]["gender"]])
            report.append((target, fname, sid, c["r"]["text"]))
    used = {f for lst in clips.values() for f, _, _ in lst}
    for name in os.listdir(out_dir):
        if name.endswith(".mp3") and name not in used:
            os.remove(os.path.join(out_dir, name))
    index = {
        "source": "Mozilla Common Voice Thai, CC0", "license": "CC0-1.0",
        "speakers": len({sid for lst in clips.values() for _, sid, _ in lst}), "clips": clips,
    }
    with open(os.path.join(out_dir, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(out_dir, "review.html"), "w", encoding="utf-8") as f:
        f.write("<!doctype html><meta charset=utf-8><title>Voice pack review</title><style>body{font:15px system-ui;margin:16px}"
                "td{padding:4px 8px;border-bottom:1px solid #ddd}td:first-child{font-size:22px}</style>"
                "<p>Listen through; put the file name of any bad clip in voices/reject.txt and run build again.</p><table>")
        for target, fname, sid, src in report:
            f.write(f"<tr><td>{html.escape(target)}</td><td><audio controls preload=none src='{fname}'></audio></td>"
                    f"<td>{fname}</td><td><small>{html.escape(src)}</small></td></tr>")
        f.write("</table>")
    wcount = sum(1 for t in clips if t in words)
    print(f"{len(used)} clips: {wcount} of {len(words)} words, {len(clips) - wcount} sentences, {index['speakers']} speakers → {out_dir}")


def load_dict(path):
    prons = defaultdict(list)
    with open(path, encoding="utf-8") as f:
        for l in f:
            p = l.rstrip("\n").split("\t")
            if len(p) >= 2 and p[-1] not in prons[p[0]]:
                prons[p[0]].append(p[-1])
    return prons


def verify(args):
    """Check every word clip with the aligner as a small closed-set recogniser.

    Each clip may be its word or any of ~75 decoys: words of about the same
    length, and the word with a stray syllable before or after it (a neighbour's
    sound bleeding in). The aligner picks whichever pronunciation fits the audio
    best. A clip passes when that is the word itself. When it picks the word
    plus a stray syllable, the clip is re-cut to just the word's phones and
    checked again. On 28 clips heard by a learner this caught 9 of the 11 bad
    ones. Writes WORK/verified.json, which `build` then uses.
    """
    import random
    random.seed(7)
    words, sentences = load_targets()
    rows = {os.path.splitext(r["path"])[0]: r for r in load_cv(args.cv, args.min_up)}
    cands = gather(args, words, sentences, rows)
    D = load_dict(args.dict)
    by_len = defaultdict(list)
    for prs in D.values():
        for pr in prs:
            by_len[len(pr.split())].append(pr)
    syllables = by_len[2] + by_len[3]

    def target_prons(text):
        out = [""]
        for t in tokenize(text, args.dict).split():
            if t not in D:
                return []
            out = [(a + " " + b).strip() for a in out for b in D[t]][:8]
        return out

    results, todo = {}, []
    for target, cs in cands.items():
        if target not in words:
            continue
        tp = target_prons(target)
        for c in cs:
            span = c["span"] or (None, None)
            todo.append((cand_id(target, c), target, tp, c["wav"], span[0], span[1], 0.06))

    def run_round(items, label):
        d = os.path.join(args.work, "verify", label)
        if os.path.exists(d):
            import shutil
            shutil.rmtree(d)
        os.makedirs(os.path.join(d, "x"))
        meta = {}
        with open(os.path.join(d, "check.dict"), "w", encoding="utf-8") as dic:
            for i, (cid, target, tp, wav, s, e, pad) in enumerate(items):
                if not tp:
                    continue
                n = len(tp[0].split())
                decoys = set()
                for k in (n - 1, n, n + 1):
                    if by_len[k]:
                        decoys.update(random.sample(by_len[k], min(25, len(by_len[k]))))
                for _ in range(10):
                    decoys.add(random.choice(syllables) + " " + tp[0])
                    decoys.add(tp[0] + " " + random.choice(syllables))
                decoys -= set(tp)
                for pr in tp + sorted(decoys):
                    dic.write(f"clip{i}\t{pr}\n")
                name = f"c{i}"
                cmd = ["ffmpeg", "-y", "-loglevel", "error"]
                offset = 0.0
                if s is not None:
                    offset = max(0.0, s - pad)
                    cmd += ["-ss", f"{offset:.3f}", "-t", f"{e + pad - offset:.3f}"]
                run(cmd + ["-i", wav, "-ac", "1", "-ar", "16000", os.path.join(d, "x", name + ".wav")])
                with open(os.path.join(d, "x", name + ".lab"), "w", encoding="utf-8") as f:
                    f.write(f"clip{i}")
                meta[name] = (cid, target, tp, wav, s, e, pad, offset)
        out = os.path.join(d, "out")
        env = dict(os.environ)
        if os.path.dirname(args.mfa):  # MFA calls Kaldi and OpenFst tools that live beside it
            env["PATH"] = os.path.dirname(os.path.abspath(args.mfa)) + os.pathsep + env.get("PATH", "")
        subprocess.run([args.mfa, "align", os.path.join(d, "x"), os.path.join(d, "check.dict"), args.acoustic, out,
                        "--clean", "-j", str(args.jobs), "--single_speaker", "--no_tokenization"],
                       check=True, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        verdicts = {}
        for name, m in meta.items():
            tg = os.path.join(out, name + ".TextGrid")
            if not os.path.exists(tg):
                tg = os.path.join(out, "x", name + ".TextGrid")
            ph = [p for p in read_tier(tg) if p[2] and p[2] not in ("sil", "sp", "spn")] if os.path.exists(tg) else []
            verdicts[name] = (m, ph)
        return verdicts

    print(f"checking {len(todo)} word clips (round 1)")
    retry = []
    for name, (m, ph) in run_round(todo, "round1").items():
        cid, target, tp, wav, s, e, pad, offset = m
        got = [p[2] for p in ph]
        if " ".join(got) in tp:
            results[cid] = {"ok": True, "span": [s, e] if s is not None else None, "pad": pad}
            continue
        results[cid] = {"ok": False, "span": None, "got": " ".join(got)}
        # The word plus a stray syllable: re-cut to just the word's phones.
        for pr in tp:
            want = pr.split()
            for j in range(len(got) - len(want) + 1):
                if got[j:j + len(want)] == want:
                    ns, ne = offset + ph[j][0], offset + ph[j + len(want) - 1][1]
                    retry.append((cid, target, tp, wav, ns, ne, 0.03))
                    break
            else:
                continue
            break
    print(f"re-checking {len(retry)} trimmed clips (round 2)")
    if retry:
        for name, (m, ph) in run_round(retry, "round2").items():
            cid, target, tp, wav, s, e, pad, offset = m
            if " ".join(p[2] for p in ph) in tp and e - s >= args.min_word:
                results[cid] = {"ok": True, "span": [s, e], "pad": pad, "trimmed": True}
    with open(os.path.join(args.work, "verified.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False)
    ok = sum(1 for v in results.values() if v["ok"])
    print(f"{ok} of {len(results)} word clips passed ({sum(1 for v in results.values() if v.get('trimmed'))} after trimming)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("prepare", "verify", "build"):
        p = sub.add_parser(name)
        p.add_argument("--cv", required=True, help="Common Voice Thai folder (validated.tsv, clips/)")
        p.add_argument("--work", required=True, help="working folder for the corpus and alignments")
        p.add_argument("--min-up", type=int, default=2, help="minimum up-votes per clip")
    sub.choices["prepare"].add_argument("--candidates", type=int, default=8, help="speakers to align per word")
    sub.choices["prepare"].add_argument("--dict", help="MFA pronunciation dictionary (thai_mfa.dict): split transcripts into its words")
    v = sub.choices["verify"]
    v.add_argument("--dict", required=True, help="MFA pronunciation dictionary (thai_mfa.dict)")
    v.add_argument("--acoustic", required=True, help="MFA acoustic model (thai_mfa.zip)")
    v.add_argument("--mfa", default="mfa", help="path to the mfa command")
    v.add_argument("--jobs", type=int, default=4)
    v.add_argument("--min-word", type=float, default=0.18)
    v.add_argument("--max-word", type=float, default=2.5)
    b = sub.choices["build"]
    b.add_argument("--per-text", type=int, default=3, help="speakers kept per word or sentence")
    b.add_argument("--min-word", type=float, default=0.18, help="shortest word clip, seconds")
    b.add_argument("--max-word", type=float, default=2.5, help="longest word clip, seconds")
    b.add_argument("--min-db", type=float, default=-42.0, help="quietest mean level kept, dB")
    a = ap.parse_args()
    {"prepare": prepare, "verify": verify, "build": build}[a.cmd](a)


if __name__ == "__main__":
    main()
