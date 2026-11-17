"""Frequency pass on the Word Garden (Roadmap IV, C5).

Ranks every garden word by how common it is in two corpora that ship with PyThaiNLP:
the Thai National Corpus (TNC, mostly written Thai) and the Thai Textbook Corpus
(TTC, school texts). A word's score is the mean log-rank over both lists. A word
missing from a list (often a compound such as น้ำเปล่า) takes the rank of its
rarest part, doubled.

  node scripts/content/words.mjs > /tmp/words.json
  python3 scripts/content/frequency.py /tmp/words.json            # report only
  python3 scripts/content/frequency.py /tmp/words.json --write    # reorder GARDEN_LAYOUT

The new order inside a box is a 50/50 blend of the hand-picked order and the
corpus order. Only the order of words inside a box changes, and boxes whose order means something
(counting, days, months) are left alone. Ids come from GARDEN_SRC, so no progress moves.
Run --write once: each run blends with the order it finds, so a second run moves
words again. Without --write the report shows the boxes as they are now.
The report also lists common words the app doesn't teach yet, for a human to pick from.
"""
import json, math, os, re, sys
from pythainlp.corpus import get_corpus_path  # noqa: F401 (keeps the dependency explicit)
from pythainlp.tokenize import word_tokenize
import pythainlp

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
APP = os.path.join(ROOT, "SuvarnaKani.jsx")
KEEP_ORDER = {"Count to nine", "Big numbers", "Days of the week", "Months"}
CORPUS = os.path.join(os.path.dirname(pythainlp.__file__), "corpus")


def load_ranks(name):
    ranks = {}
    with open(os.path.join(CORPUS, name), encoding="utf-8") as f:
        for i, line in enumerate(f):
            w = line.split("\t")[0].strip()
            if w and w not in ranks:
                ranks[w] = i + 1
    return ranks


TNC, TTC = load_ranks("tnc_freq.txt"), load_ranks("ttc_freq.txt")


def rank_in(ranks, w):
    if w in ranks:
        return ranks[w], True
    parts = [p for p in word_tokenize(w, engine="newmm") if p.strip()]
    if len(parts) > 1 and all(p in ranks for p in parts):
        return 2 * max(ranks[p] for p in parts), False
    return len(ranks), False


def score(w):
    (a, fa), (b, fb) = rank_in(TNC, w), rank_in(TTC, w)
    return (math.log(a) + math.log(b)) / 2, (fa or fb)


def layout_block(src):
    m = re.search(r"const GARDEN_LAYOUT = `([^`]*)`", src)
    return m


def main():
    words = json.load(open(sys.argv[1], encoding="utf-8"))["words"]
    write = "--write" in sys.argv
    src = open(APP, encoding="utf-8").read()
    m = layout_block(src)
    lines, moved, report = m.group(1).split("\n"), [], []
    out = []
    for line in lines:
        if not line.startswith("+"):
            out.append(line)
            if line.startswith("#"):
                report.append(f"\n### {line.split('|')[1]}\n")
            continue
        title, ws = line[1:].split("|", 1)
        ws = ws.split()
        if title.lstrip("*") in KEEP_ORDER:
            out.append(line)
            report.append(f"- **{title.lstrip('*')}** (order kept): {' '.join(ws)}")
            continue
        # Blend: half the hand-picked order, half the corpus order, so pairs and
        # homographs (หน้า face/next, อา uncle/ah) don't jump around on frequency alone.
        by_freq = sorted(ws, key=lambda w: (score(w)[0], ws.index(w)))
        new = sorted(ws, key=lambda w: (ws.index(w) + by_freq.index(w), by_freq.index(w)))
        if new != ws:
            moved.append(title)
        out.append("+" + title + "|" + " ".join(new))
        report.append(f"- **{title.lstrip('*')}**: {' '.join(new if write else ws)}")
    taught = set(words)
    cand = []
    seen = set()
    for w, r in sorted(TTC.items(), key=lambda kv: kv[1]):
        if w in taught or w in seen or len(w) < 2 or not re.fullmatch(r"[ก-๎]+", w) or w not in TNC:
            continue
        seen.add(w)
        cand.append((w, (math.log(r) + math.log(TNC[w])) / 2))
    cand.sort(key=lambda x: x[1])
    print(f"# Word Garden frequency pass\n\nReordered {len(moved)} boxes: {', '.join(moved)}\n")
    print("\n".join(report))
    print("\n## Common words not taught yet (top 150, TNC + TTC)\n")
    print(" ".join(w for w, _ in cand[:150]))
    if write:
        new_src = src[: m.start(1)] + "\n".join(out) + src[m.end(1):]
        open(APP, "w", encoding="utf-8").write(new_src)


if __name__ == "__main__":
    main()
