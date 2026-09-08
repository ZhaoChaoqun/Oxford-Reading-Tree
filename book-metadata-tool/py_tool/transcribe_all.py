"""
transcribe_all.py  鈥? Batch transcribe all Oxford Tree MP3s with faster-whisper.

Features:
  - Scans all stage-* directories automatically
  - Skips already-processed books (resume-safe)
  - Extracts book title from intro narration
  - Strips intro segments (publisher info / "turn the page" instructions)
  - Detects page boundaries from silence gaps
  - Generates a books.json skeleton ready for Claude quiz generation
  - Optional word-level timestamps for Karaoke feature

Usage examples:
  # Dry run 鈥?show what would be processed
  python transcribe_all.py --dry-run

  # Process all books, CPU (recommended for first run)
  python transcribe_all.py --device cpu --compute-type int8

  # Process only stage 1-2
  python transcribe_all.py --stages 1,2 --device cpu --compute-type int8

  # Include word-level timestamps (Karaoke mode, ~2x slower)
  python transcribe_all.py --word-timestamps --device cpu --compute-type int8

  # Use medium model for better accuracy (Stage 5+)
  python transcribe_all.py --stages 5,6,7,8,9 --model-size medium.en
"""

import argparse
import json
import re
import time
from pathlib import Path

from faster_whisper import WhisperModel


# 鈹€鈹€ Constants 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

RESOURCES_ROOT = Path(r"E:\OxfordTree\OxfordTree\books")
OUTPUT_DIR = Path(r"E:\OxfordTree\oxford-tree-pwa\book-metadata-tool\generated\transcripts-faster-whisper")
BOOKS_JSON_OUT = Path(r"E:\OxfordTree\oxford-tree-pwa\src\data\books.json")

# Gap (seconds) between segments that signals a page turn
PAGE_GAP_THRESHOLD = 1.5

# Intro ends after one of these phrases (case-insensitive)
INTRO_END_PHRASES = [
    "now open the book",
    "let's read the story together",
    "let's look at the pictures together",
    "let's read together",
    "open the book",
]

# Regex to extract book title from intro narration
# e.g. "This story is called At School written by..."
# e.g. "This story is called What Dogs Like?"
TITLE_PATTERN = re.compile(
    r"(?:this story is called|called)\s+([A-Z][^.?!]+?)(?:\s+written|\s+by|\s*[.?!]|$)",
    re.IGNORECASE,
)


# 鈹€鈹€ Helpers 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

def scan_books(resources_root: Path, stages: list[int] | None = None) -> list[dict]:
    """Return sorted list of {id, stage, mp3_path, pdf_path} for all found books."""
    books = []
    for stage_dir in sorted(resources_root.glob("stage-*")):
        if not stage_dir.is_dir():
            continue
        try:
            stage_num = int(stage_dir.name.split("-")[1])
        except (IndexError, ValueError):
            continue
        if stages and stage_num not in stages:
            continue
        for mp3 in sorted(stage_dir.glob("*.mp3")):
            book_id = mp3.stem
            pdf = mp3.with_suffix(".pdf")
            books.append({
                "id": book_id,
                "stage": stage_num,
                "mp3Path": mp3,
                "pdfPath": pdf if pdf.exists() else None,
            })
    return books


def extract_title(full_text: str) -> str | None:
    """Try to extract book title from the intro narration."""
    match = TITLE_PATTERN.search(full_text)
    if match:
        return match.group(1).strip().rstrip(".,!?")
    return None


def is_intro_segment(text: str) -> bool:
    """Return True if this segment is part of the publisher intro (not story content)."""
    lower = text.lower()
    return any(phrase in lower for phrase in INTRO_END_PHRASES)


def strip_intro(segments: list[dict]) -> tuple[list[dict], bool]:
    """
    Remove publisher intro segments.
    Returns (story_segments, intro_was_found).
    Intro ends at (and includes) the segment containing an INTRO_END_PHRASE.
    """
    for i, seg in enumerate(segments):
        if is_intro_segment(seg["text"]):
            return segments[i + 1:], True
    # Fallback: skip the first 2 segments (title + "when you hear this sound")
    return segments[2:] if len(segments) > 2 else segments, False


def assign_pages(segments: list[dict], gap_threshold: float = PAGE_GAP_THRESHOLD) -> list[dict]:
    """
    Add a 'page' field to each segment using silence gaps as page-turn signals.
    Gap > threshold between previous segment's end and this segment's start 鈫?new page.
    """
    if not segments:
        return segments
    paged = []
    page = 1
    for i, seg in enumerate(segments):
        if i > 0:
            gap = seg["start"] - segments[i - 1]["end"]
            if gap >= gap_threshold:
                page += 1
        paged.append({**seg, "page": page})
    return paged


# 鈹€鈹€ Core transcription 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

def transcribe_book(
    model: WhisperModel,
    book: dict,
    word_timestamps: bool = False,
) -> dict:
    book_id = book["id"]
    mp3_path = book["mp3Path"]

    started = time.perf_counter()
    segments_gen, info = model.transcribe(
        str(mp3_path),
        vad_filter=True,
        beam_size=5,
        word_timestamps=word_timestamps,
    )

    raw_segments = []
    full_text_parts = []

    for seg in segments_gen:
        text = seg.text.strip()
        if not text:
            continue
        entry = {
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": text,
        }
        if word_timestamps and seg.words:
            entry["words"] = [
                {
                    "word": w.word.strip(),
                    "start": round(w.start, 2),
                    "end": round(w.end, 2),
                }
                for w in seg.words
            ]
        raw_segments.append(entry)
        full_text_parts.append(text)

    elapsed = round(time.perf_counter() - started, 2)
    full_text = " ".join(full_text_parts)

    # Extract title before stripping intro
    title = extract_title(full_text)

    # Strip intro, detect pages
    story_segments, intro_found = strip_intro(raw_segments)
    paged_segments = assign_pages(story_segments)
    estimated_pages = paged_segments[-1]["page"] if paged_segments else 0

    return {
        "id": book_id,
        "stage": book["stage"],
        "title": title,
        "mp3File": str(mp3_path),
        "language": info.language,
        "languageProbability": round(info.language_probability, 3),
        "durationSeconds": round(info.duration, 2),
        "elapsedSeconds": elapsed,
        "introStripped": intro_found,
        "estimatedPages": estimated_pages,
        "fullText": full_text,
        "segments": paged_segments,
    }


# 鈹€鈹€ books.json generation 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

def build_books_json(all_results: list[dict], resources_root: Path) -> dict:
    """
    Build the books.json data structure from transcription results.
    Merges with existing books.json if it exists (preserves manual quiz edits).
    """
    existing = {}
    if BOOKS_JSON_OUT.exists():
        try:
            data = json.loads(BOOKS_JSON_OUT.read_text(encoding="utf-8"))
            for b in data.get("books", []):
                existing[b["id"]] = b
        except Exception:
            pass

    books = []
    for r in all_results:
        book_id = r["id"]
        stage = r["stage"]
        stage_dir = f"stage-{stage}"

        # Use existing entry as base (preserves quiz data), then update metadata
        base = existing.get(book_id, {})

        entry = {
            "id": book_id,
            "title": r["title"] or base.get("title") or book_id,
            "stage": stage,
            "pdfFile": f"books/{stage_dir}/{book_id}.pdf",
            "audioFile": f"books/{stage_dir}/{book_id}.mp3",
            "durationSeconds": r["durationSeconds"],
            "estimatedPages": r["estimatedPages"],
            # Quiz fields 鈥?preserve if already filled, otherwise mark pending
            "quiz": base.get("quiz", None),
            "quizType": base.get("quizType", "pending"),
        }
        books.append(entry)

    # Include any existing books not in this run (e.g. stages skipped)
    processed_ids = {r["id"] for r in all_results}
    for book_id, entry in existing.items():
        if book_id not in processed_ids:
            books.append(entry)

    books.sort(key=lambda b: (b["stage"], b["id"]))
    return {"books": books}


# 鈹€鈹€ Main 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Batch transcribe all Oxford Tree MP3s and build books.json skeleton.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--stages", default=None,
                        help="Comma-separated stage numbers to process, e.g. '1,2,3'. Default: all.")
    parser.add_argument("--model-size", default="small.en",
                        help="Whisper model size (default: small.en). Use medium.en for Stage 5+.")
    parser.add_argument("--device", default="cpu",
                        help="Device: cpu or cuda (default: cpu).")
    parser.add_argument("--compute-type", default="int8",
                        help="Compute type (default: int8 for cpu; use float16 for cuda).")
    parser.add_argument("--word-timestamps", action="store_true",
                        help="Include word-level timestamps (needed for Karaoke feature, ~2x slower).")
    parser.add_argument("--resources-root", default=str(RESOURCES_ROOT),
                        help=f"Root directory containing stage-* folders. Default: {RESOURCES_ROOT}")
    parser.add_argument("--output-dir", default=str(OUTPUT_DIR),
                        help=f"Where to write per-book JSON files. Default: {OUTPUT_DIR}")
    parser.add_argument("--skip-existing", action="store_true", default=True,
                        help="Skip books that already have a transcript JSON (default: True).")
    parser.add_argument("--no-skip-existing", action="store_false", dest="skip_existing",
                        help="Re-process all books even if already transcribed.")
    books_json_group = parser.add_mutually_exclusive_group()
    books_json_group.add_argument("--write-books-json", action="store_true", dest="write_books_json",
                                  help=f"Generate/update books.json at the end. Default: off ({BOOKS_JSON_OUT}).")
    books_json_group.add_argument("--no-books-json", action="store_false", dest="write_books_json",
                                  help=argparse.SUPPRESS)
    parser.set_defaults(write_books_json=False)
    parser.add_argument("--dry-run", action="store_true",
                        help="List books that would be processed without running transcription.")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    resources_root = Path(args.resources_root)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    stages = [int(s.strip()) for s in args.stages.split(",")] if args.stages else None
    all_books = scan_books(resources_root, stages)

    if not all_books:
        print("No books found. Check --resources-root and --stages.")
        return

    # Filter already-processed
    if args.skip_existing:
        pending = [b for b in all_books if not (output_dir / f"{b['id']}.json").exists()]
        skipped = len(all_books) - len(pending)
    else:
        pending = all_books
        skipped = 0

    print(f"Found {len(all_books)} books total | {skipped} already done | {len(pending)} to process")

    if args.dry_run:
        print("\n--- DRY RUN: books to process ---")
        for b in pending:
            print(f"  Stage {b['stage']:2d}  {b['id']}")
        return

    if not pending:
        print("Nothing to do. Use --no-skip-existing to re-process.")
        if args.write_books_json:
            _rebuild_books_json(output_dir, resources_root)
        return

    # Load model once
    print(f"\nLoading model: {args.model_size} on {args.device} ({args.compute_type})...")
    model = WhisperModel(args.model_size, device=args.device, compute_type=args.compute_type)
    print("Model loaded.\n")

    all_results = []
    total = len(pending)
    total_audio = sum(0 for _ in pending)  # placeholder
    run_start = time.perf_counter()

    for idx, book in enumerate(pending, 1):
        book_id = book["id"]
        print(f"[{idx:3d}/{total}] {book_id}  ", end="", flush=True)

        try:
            result = transcribe_book(model, book, word_timestamps=args.word_timestamps)

            # Write per-book files
            out_json = output_dir / f"{book_id}.json"
            out_txt = output_dir / f"{book_id}.txt"
            out_json.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
            out_txt.write_text(result["fullText"], encoding="utf-8")

            all_results.append(result)

            elapsed = result["elapsedSeconds"]
            pages = result["estimatedPages"]
            title = result["title"] or "(title not found)"
            print(f"{elapsed:5.1f}s  ~{pages:2d} pages  \"{title}\"")

        except FileNotFoundError as e:
            print(f"SKIP 鈥?{e}")
        except Exception as e:
            print(f"ERROR 鈥?{e}")

    run_elapsed = time.perf_counter() - run_start
    print(f"\nDone. Processed {len(all_results)}/{total} books in {run_elapsed:.0f}s.")

    if args.write_books_json:
        _rebuild_books_json(output_dir, resources_root)


def _rebuild_books_json(output_dir: Path, resources_root: Path) -> None:
    """Load all per-book transcripts and regenerate books.json."""
    print("\nBuilding books.json...")
    all_results = []
    for json_file in sorted(output_dir.glob("*.json")):
        if json_file.stem == "summary":
            continue
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            # Only include files that look like book transcripts
            if "id" in data and "stage" in data:
                all_results.append(data)
        except Exception:
            pass

    if not all_results:
        print("No transcripts found, skipping books.json generation.")
        return

    books_data = build_books_json(all_results, resources_root)
    BOOKS_JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
    BOOKS_JSON_OUT.write_text(
        json.dumps(books_data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"books.json written: {len(books_data['books'])} books 鈫?{BOOKS_JSON_OUT}")


if __name__ == "__main__":
    main()
