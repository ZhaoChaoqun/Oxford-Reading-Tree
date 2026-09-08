"""
build_books_json.py

Builds src/data/books.json from:
  - transcripts-faster-whisper/*.txt  (title extraction)
  - transcripts-faster-whisper/*.json (durationSeconds)
  - generated/quizzes/*.json          (quiz data)
  - E:/OxfordTree/OxfordTree/books/stage-*/ (file presence check)

Run: python build_books_json.py
"""

import os, re, json

# ── Paths ────────────────────────────────────────────────────────────────────
NAS_BOOKS      = "E:/OxfordTree/OxfordTree/books"
TRANS_DIR      = "E:/OxfordTree/oxford-tree-pwa/book-metadata-tool/generated/transcripts-faster-whisper"
QUIZ_DIR       = "E:/OxfordTree/oxford-tree-pwa/book-metadata-tool/generated/quizzes"
OUT_FILE       = "E:/OxfordTree/oxford-tree-pwa/src/data/books.json"

# ── Title extraction ─────────────────────────────────────────────────────────
# Pattern 1: "This story is called[,] Title" — stop at "written by" or punctuation
TITLE_RE = re.compile(
    r'this story is called[,]?\s+(.+?)(?:\s+written by|\s+by\s|\.|,\s*written|\n|$)',
    re.IGNORECASE
)

def extract_title(text: str) -> str | None:
    m = TITLE_RE.search(text)
    if m:
        raw = m.group(1).strip().rstrip('.,!?')
        # Guard against capturing too much
        if len(raw.split()) <= 8:
            return raw.title()

    # Pattern 2: text starts directly with story (no ORT intro)
    # Take the first "sentence" (up to first period/newline) as the title
    first = text.strip().split('\n')[0]
    first = first.split('.')[0].strip()
    if first and len(first) < 60:
        return first.title()

    return None

# ── Discover all books from NAS ───────────────────────────────────────────────
def discover_books() -> list[dict]:
    books = []
    for stage_dir in sorted(os.listdir(NAS_BOOKS)):
        if not stage_dir.startswith('stage-'):
            continue
        stage_num = int(stage_dir.split('-')[1])
        stage_path = os.path.join(NAS_BOOKS, stage_dir)
        ids_seen = set()
        for fname in sorted(os.listdir(stage_path)):
            stem, ext = os.path.splitext(fname)
            if ext.lower() not in ('.mp3', '.pdf'):
                continue
            if stem in ids_seen:
                continue
            ids_seen.add(stem)
            books.append({'id': stem, 'stage': stage_num})
    return books

# ── Load transcript txt/json ──────────────────────────────────────────────────
def load_transcript(book_id: str) -> tuple[str | None, float | None]:
    """Returns (title, durationSeconds)"""
    title = None
    duration = None

    txt_path = os.path.join(TRANS_DIR, f"{book_id}.txt")
    if os.path.exists(txt_path):
        with open(txt_path, encoding='utf-8') as f:
            text = f.read()
        title = extract_title(text)

    json_path = os.path.join(TRANS_DIR, f"{book_id}.json")
    if os.path.exists(json_path):
        with open(json_path, encoding='utf-8') as f:
            t = json.load(f)
        d = t.get('durationSeconds')
        if d:
            duration = round(d)

    return title, duration

# ── Load quiz ────────────────────────────────────────────────────────────────
def load_quiz(book_id: str) -> dict | None:
    path = os.path.join(QUIZ_DIR, f"{book_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# ── Build ────────────────────────────────────────────────────────────────────
def build():
    books_raw = discover_books()
    print(f"Discovered {len(books_raw)} books from NAS")

    output = []
    missing_title = []
    missing_quiz  = []

    for b in books_raw:
        bid   = b['id']
        stage = b['stage']

        title, duration = load_transcript(bid)
        quiz  = load_quiz(bid)

        if not title:
            missing_title.append(bid)
            title = f"Stage {stage} Book {bid.split('-')[1]}"  # fallback

        if not quiz:
            missing_quiz.append(bid)

        entry = {
            "id":      bid,
            "title":   title,
            "stage":   stage,
            "pdfFile": f"books/stage-{stage}/{bid}.pdf",
            "audioFile": f"books/stage-{stage}/{bid}.mp3",
        }
        if duration:
            entry["durationSeconds"] = duration
        if quiz:
            # hoist keywords/quizType to top level
            keywords  = quiz.pop("keywords", [])
            quiz_type = quiz.pop("quizType", "comprehension")
            # Strip any stray non-question keys (bookId, title, stage, etc.)
            VALID_KEYS = {f"q{i}" for i in range(1, 10)}
            quiz = {k: v for k, v in quiz.items() if k in VALID_KEYS}
            entry["keywords"]  = keywords
            entry["quizType"]  = quiz_type
            entry["quiz"]      = quiz

        output.append(entry)

    result = {"books": output}
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\nWrote {len(output)} books -> {OUT_FILE}")
    if missing_title:
        print(f"\nUsed fallback title for {len(missing_title)} books:")
        for bid in missing_title:
            print(f"  {bid}")
    if missing_quiz:
        print(f"\nNo quiz for {len(missing_quiz)} books:")
        for bid in missing_quiz:
            print(f"  {bid}")

if __name__ == '__main__':
    build()
