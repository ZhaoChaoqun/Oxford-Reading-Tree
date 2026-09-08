import argparse
import json
import time
from pathlib import Path

from faster_whisper import WhisperModel


def resolve_mp3(book_id: str, resources_root: Path) -> Path:
    stage = book_id.split('-', 1)[0]
    mp3_path = resources_root / 'books' / f'stage-{stage}' / f'{book_id}.mp3'
    if not mp3_path.exists():
        raise FileNotFoundError(f'MP3 not found for {book_id}: {mp3_path}')
    return mp3_path


def transcribe_book(model: WhisperModel, book_id: str, mp3_path: Path) -> dict:
    started = time.perf_counter()
    segments, info = model.transcribe(str(mp3_path), vad_filter=True, beam_size=5)
    items = []
    full_text_parts = []
    for segment in segments:
        text = segment.text.strip()
        items.append({
            'start': round(segment.start, 2),
            'end': round(segment.end, 2),
            'text': text,
        })
        if text:
            full_text_parts.append(text)
    elapsed = time.perf_counter() - started
    return {
        'id': book_id,
        'mp3File': str(mp3_path),
        'language': info.language,
        'languageProbability': info.language_probability,
        'durationSeconds': round(info.duration, 2),
        'elapsedSeconds': round(elapsed, 2),
        'text': ' '.join(full_text_parts).strip(),
        'segments': items,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='Transcribe sample Oxford Tree MP3 files with faster-whisper.')
    parser.add_argument('--book-ids', required=True, help='Comma-separated book ids, e.g. 1-01,1-31,3-27')
    parser.add_argument('--model-size', default='small.en', help='Whisper model size, default: small.en')
    parser.add_argument('--device', default='cuda', help='Device: cuda or cpu')
    parser.add_argument('--compute-type', default='float16', help='Compute type, default: float16')
    parser.add_argument('--resources-root', default=r'E:\OxfordTree\OxfordTree', help='Organized OxfordTree root')
    parser.add_argument('--output-dir', default=r'E:\OxfordTree\oxford-tree-pwa\book-metadata-tool\generated\transcripts-faster-whisper', help='Output directory')
    args = parser.parse_args()

    resources_root = Path(args.resources_root)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    book_ids = [item.strip() for item in args.book_ids.split(',') if item.strip()]
    model = WhisperModel(args.model_size, device=args.device, compute_type=args.compute_type)

    results = []
    for book_id in book_ids:
        mp3_path = resolve_mp3(book_id, resources_root)
        result = transcribe_book(model, book_id, mp3_path)
        results.append(result)
        (output_dir / f'{book_id}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        (output_dir / f'{book_id}.txt').write_text(result['text'], encoding='utf-8')

    summary = {
        'modelSize': args.model_size,
        'device': args.device,
        'computeType': args.compute_type,
        'bookIds': book_ids,
        'results': results,
    }
    (output_dir / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'outputDir': str(output_dir), 'books': book_ids}, ensure_ascii=False))


if __name__ == '__main__':
    main()