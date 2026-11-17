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
    """Same as the app's nativeKey(): Thai letters only, no spaces."""
    return THAI.sub("", text or "")


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


def tokenize(text):
    try:
        from pythainlp.tokenize import word_tokenize  # optional
        return " ".join(w for w in word_tokenize(text, keep_whitespace=False) if w.strip())
    except ImportError:
        return text


def prepare(args):
    words, sentences = load_targets()
    rows = load_cv(args.cv, args.min_up)
    # For each target word, the clips that contain it, spread over speakers.
    by_word = defaultdict(list)
    for r in rows:
        for w in words:
            if w in r["key"]:
                by_word[w].append(r)
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
    for i, r in enumerate(chosen.values()):
        spk = hashlib.sha1(r["speaker"].encode()).hexdigest()[:10]
        d = os.path.join(corpus, spk)
        os.makedirs(d, exist_ok=True)
        base = os.path.splitext(r["path"])[0]
        wav = os.path.join(d, base + ".wav")
        if not os.path.exists(wav):
            run(["ffmpeg", "-y", "-i", os.path.join(args.cv, "clips", r["path"]), "-ac", "1", "-ar", "16000", wav])
        with open(os.path.join(d, base + ".lab"), "w", encoding="utf-8") as f:
            f.write(tokenize(r["text"]))
        if (i + 1) % 200 == 0:
            print(f"  {i + 1} / {len(chosen)} clips converted")
    covered = sum(1 for w in words if by_word.get(w))
    print(f"{len(chosen)} clips in {corpus}: {covered} of {len(words)} words appear in Common Voice.")
    print(f"Next: mfa align {corpus} thai_mfa thai_mfa {os.path.join(args.work, 'aligned')}")


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


def word_spans(intervals, words, max_join=4):
    """(start, end, target) where 1 to max_join consecutive aligned words spell a target."""
    toks = [(s, e, key(t)) for s, e, t in intervals if t.strip() not in SKIP_WORDS and key(t)]
    out = []
    for i in range(len(toks)):
        joined = ""
        for j in range(i, min(len(toks), i + max_join)):
            joined += toks[j][2]
            if joined in words:
                out.append((toks[i][0], toks[j][1], joined))
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


def build(args):
    words, sentences = load_targets()
    rows = {os.path.splitext(r["path"])[0]: r for r in load_cv(args.cv, args.min_up)}
    reject_file = os.path.join(VOICES, "reject.txt")
    rejected = set()
    if os.path.exists(reject_file):
        with open(reject_file, encoding="utf-8") as f:
            rejected = {l.strip() for l in f if l.strip() and not l.startswith("#")}

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
            if r["key"] in sentences:
                cands[r["key"]].append({"r": r, "wav": wav, "span": None})
            tg = os.path.join(aligned, spk, base + ".TextGrid")
            if os.path.exists(tg):
                for s, e, w in word_spans(read_textgrid(tg), words):
                    if args.min_word <= e - s <= args.max_word:
                        cands[w].append({"r": r, "wav": wav, "span": (s, e)})

    out_dir = os.path.join(VOICES, "th")
    os.makedirs(out_dir, exist_ok=True)
    speakers, clips, report = {}, {}, []
    for target in sorted(cands, key=lambda t: (words.get(t, 100), t)):
        picked, seen = [], set()
        # Most up-voted first, one clip per speaker, alternating genders when we can.
        pool = sorted(cands[target], key=lambda c: -c["r"]["up"])
        while pool and len(picked) < args.per_text:
            want = None
            if picked and picked[-1]["r"]["gender"]:
                want = "f" if picked[-1]["r"]["gender"] == "m" else "m"
            c = next((c for c in pool if c["r"]["speaker"] not in seen and c["r"]["gender"] == want), None) \
                or next((c for c in pool if c["r"]["speaker"] not in seen), None)
            if not c:
                break
            pool.remove(c)
            sid = speakers.setdefault(c["r"]["speaker"], f"s{len(speakers) + 1}")
            fname = f"{hashlib.sha1(target.encode()).hexdigest()[:10]}-{sid}.mp3"
            if fname in rejected:
                continue
            span = c["span"]
            if loudness(c["wav"], *(span[0], span[1] - span[0]) if span else (None, None)) < args.min_db:
                continue  # too quiet or empty
            dst = os.path.join(out_dir, fname)
            if not os.path.exists(dst):
                cut(c["wav"], dst, *(span if span else (None, None)))
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


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("prepare", "build"):
        p = sub.add_parser(name)
        p.add_argument("--cv", required=True, help="Common Voice Thai folder (validated.tsv, clips/)")
        p.add_argument("--work", required=True, help="working folder for the corpus and alignments")
        p.add_argument("--min-up", type=int, default=2, help="minimum up-votes per clip")
    sub.choices["prepare"].add_argument("--candidates", type=int, default=8, help="speakers to align per word")
    b = sub.choices["build"]
    b.add_argument("--per-text", type=int, default=3, help="speakers kept per word or sentence")
    b.add_argument("--min-word", type=float, default=0.18, help="shortest word clip, seconds")
    b.add_argument("--max-word", type=float, default=2.5, help="longest word clip, seconds")
    b.add_argument("--min-db", type=float, default=-42.0, help="quietest mean level kept, dB")
    a = ap.parse_args()
    prepare(a) if a.cmd == "prepare" else build(a)


if __name__ == "__main__":
    main()
