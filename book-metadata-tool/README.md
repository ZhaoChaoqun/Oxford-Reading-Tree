# Book Metadata Tool

This isolated tool reads selected Oxford Tree PDFs and writes reviewable metadata without mutating `src/data/books.json`.

## Default model

- `deepseek-ai/DeepSeek-OCR`

## Output files

- `generated/books.generated.json`
- `generated/raw/*.json`

## Usage

Prepare local PDF input only:

```bash
node book-metadata-tool/cli.mjs --book-ids 1-01,1-31,3-27 --extract-only
```

Call SiliconFlow with an API key in `SILICONFLOW_API_KEY`:

```bash
node book-metadata-tool/cli.mjs --book-ids 1-01,1-31,3-27 --model deepseek-ai/DeepSeek-OCR
```