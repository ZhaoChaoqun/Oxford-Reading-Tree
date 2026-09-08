# Python Audio Environment

This directory contains the isolated Python environment for local audio transcription experiments.

## Virtual environment

- Path: `E:\OxfordTree\oxford-tree-pwa\book-metadata-tool\py_tool\.venv`
- Python: `E:\OxfordTree\oxford-tree-pwa\book-metadata-tool\py_tool\.venv\Scripts\python.exe`

## Dependency sets

- `requirements-faster-whisper.txt`: default stack for local English transcription
- `requirements-funasr.txt`: optional comparison stack if we need to evaluate FunASR later

## Install examples

```powershell
E:\OxfordTree\oxford-tree-pwa\book-metadata-tool\py_tool\.venv\Scripts\python.exe -m pip install -r E:\OxfordTree\oxford-tree-pwa\book-metadata-tool\py_tool\requirements-faster-whisper.txt
```

```powershell
E:\OxfordTree\oxford-tree-pwa\book-metadata-tool\py_tool\.venv\Scripts\python.exe -m pip install -r E:\OxfordTree\oxford-tree-pwa\book-metadata-tool\py_tool\requirements-funasr.txt
```