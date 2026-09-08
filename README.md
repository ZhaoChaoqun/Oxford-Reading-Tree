# Oxford-Reading-Tree

Oxford Reading Tree reading app built with Vite + React, together with media
organized by reading level: **233 PDFs, 244 MP3s,
and 48 MP4s** (525 files, 3,248,514,957 bytes / approximately 3.25 GB).

The application source comes from
[Tomodad/OxfordReadingTree](https://github.com/Tomodad/OxfordReadingTree), with local
media support added for this collection. The app includes a PDF/audio reader,
read-along highlighting, quizzes, speaking practice, a dictionary, rewards, and
PWA support. Source code, tests, metadata tools, dictionary and quiz data,
transcripts, and sticker assets are included at the repository root.

## Browse

- [Resource index](RESOURCE-INDEX.md): links to each available file and its source.
- [Resource manifest](Resource-Status.json): file sizes, SHA-256 checksums, source
  URLs, and availability for all 536 listed resources.
- `L1/` through `L9/`: books and audio, named by book title.
- `Videos/Family-Stage-1/` through `Videos/Family-Stage-6/`: videos, named by episode.

Only the available PDF, MP3, and MP4 files listed in the source manifest are
included as library media. Personal additions and temporary files are excluded.
The manifest omits local machine paths and download error details.

## Download the actual media

Install [Git LFS](https://git-lfs.com/) before cloning. These commands configure
LFS only for this clone and then download the actual media:

```sh
GIT_LFS_SKIP_SMUDGE=1 git clone https://github.com/ZhaoChaoqun/Oxford-Reading-Tree.git
cd Oxford-Reading-Tree
git lfs install --local
git lfs pull
```

The Git history stores small LFS pointers rather than the media bytes. A regular
clone without Git LFS, or a GitHub source ZIP, may contain only these pointers.
Individual files can also be opened through the resource index and downloaded
from GitHub when LFS downloads are available.

GitHub LFS storage and download bandwidth are subject to the repository owner's
plan, quotas, and billing settings. Downloads may be restricted when allowances
are exhausted; this repository does not change or enable paid billing.

## Run the app locally

Requirements: Node.js 18+ (a current LTS release is recommended), npm, and Git LFS.
After cloning and downloading the actual media as above:

```sh
npm ci
cp .env.example .env.local
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173`. If port 5173 is already in use, choose a free port
such as 5174 in the command and browser URL. Keep the server bound to
`127.0.0.1` unless you intentionally want to share access with other devices.

The example sets `OXFORD_MEDIA_DIR=.` to use this repository's `L1/` through
`L9/` and `Videos/` folders. `.env.local` is ignored and must not be committed.
You can instead set an absolute directory or a path relative to the project;
`~` is not expanded. Restart Vite after changing the setting.

In local mode, `/__local-media` maps the catalog's original paths to book-title
and episode filenames. Only catalog media are served, with GET/HEAD and byte
ranges for PDF loading and audio/video seeking. No extra media copies are made,
old NAS settings are ignored, and media requests do not fall back to the NAS.
Git LFS pointers are rejected: run `git lfs pull` if actual files are missing.

Missing PDFs retain audio/subtitle playback where available, including
`L7/The Lost Key`. Unavailable media show errors; connection failures show a
retry button instead of an endless connecting indicator.

Progress, stars, rewards, and learned words are stored in browser storage.
Private/incognito mode does not persist progress after the session ends.

## Production build

```sh
npm run build
npm run preview -- --host 127.0.0.1
```

The build output is written to `dist/`. `OXFORD_MEDIA_DIR` applies **only to
the development server**: production builds and preview retain the original
external-storage/NAS behavior and do not bundle the library media. Removing
the local setting and restarting Vite also restores NAS mode.

Metadata tooling and its optional dependencies are documented in
[book-metadata-tool/README.md](book-metadata-tool/README.md). Generated tooling
artifacts, dependencies, local settings, and build output are ignored by Git.

## Missing PDFs

These 11 PDFs were unavailable in the source collection and are **not included**.
Their MP3 counterparts are included. Expected paths and source links remain in
the resource index and manifest with `missing` status.

| Level | Book |
| --- | --- |
| L6 | The Outing |
| L6 | The Treasure Chest |
| L6 | A Fright In The Night |
| L6 | Rotten Apples |
| L6 | The Go-Kart Race |
| L6 | The Shiny Key |
| L6 | The Stolen Crown Part 1 |
| L6 | The Stolen Crown Part 2 |
| L6 | Ship In Trouble |
| L6 | Homework |
| L7 | The Lost Key |

## Rights

Application source attribution:
[Tomodad/OxfordReadingTree](https://github.com/Tomodad/OxfordReadingTree).
Local adaptations add filesystem media serving and reader/video connection
error handling. No open-source or open-content license is granted by this
repository; code and media rights remain with their respective rights holders.
