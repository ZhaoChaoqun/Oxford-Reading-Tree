# Oxford-Reading-Tree

Oxford Reading Tree media organized by reading level: **233 PDFs, 244 MP3s,
and 48 MP4s** (525 files, 3,248,514,957 bytes / approximately 3.25 GB).

## Browse

- [Resource index](RESOURCE-INDEX.md): links to each available file and its source.
- [Resource manifest](Resource-Status.json): file sizes, SHA-256 checksums, source
  URLs, and availability for all 536 listed resources.
- `L1/` through `L9/`: books and audio, named by book title.
- `Videos/Family-Stage-1/` through `Videos/Family-Stage-6/`: videos, named by episode.

Only the available PDF, MP3, and MP4 files listed in the source manifest are
included. Personal additions, application code, and temporary files are excluded.
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

No open-source or open-content license is granted by this repository. Media
rights remain with their respective rights holders.
