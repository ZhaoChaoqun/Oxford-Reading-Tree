import { open, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';

export const LOCAL_MEDIA_BASE = '/__local-media';
const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

export function createMediaMap(books, videos) {
  const files = new Map();
  for (const book of books) {
    if (book.pdfFile) files.set(book.pdfFile, `L${book.stage}/${book.title}.pdf`);
    if (book.audioFile) files.set(book.audioFile, `L${book.stage}/${book.title}.mp3`);
  }
  for (const video of videos) {
    files.set(
      video.videoFile,
      `Videos/Family-Stage-${video.familyStage}/${video.title}.mp4`
    );
  }
  return files;
}

function isInside(root, path) {
  const child = relative(root, path);
  return child !== '' && child !== '..' && !child.startsWith('../') && !isAbsolute(child);
}

function byteRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size === 0) return false;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return false;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return false;
    if (start >= size || start > end) return false;
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

export function createLocalMediaMiddleware({ directory, files, logger = console }) {
  const configuredRoot = resolve(directory);

  return async function localMedia(req, res, next) {
    const pathname = (req.url || '').split('?')[0];
    if (pathname !== LOCAL_MEDIA_BASE && !pathname.startsWith(`${LOCAL_MEDIA_BASE}/`)) {
      return next();
    }

    const reply = (status, message) => {
      res.writeHead(status, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': Buffer.byteLength(message),
        'Cache-Control': 'no-store',
      });
      res.end(req.method === 'HEAD' ? undefined : message);
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return reply(405, 'Only GET and HEAD are supported.');
    }

    let key;
    try {
      key = decodeURIComponent(pathname.slice(LOCAL_MEDIA_BASE.length + 1));
    } catch (error) {
      if (!(error instanceof URIError)) throw error;
      return reply(400, 'Invalid media URL.');
    }

    if (key !== 'probe.txt' && !files.has(key)) {
      return reply(404, 'Media is not in the library catalog.');
    }

    let handle;
    try {
      const root = await realpath(configuredRoot);
      if (key === 'probe.txt') {
        if (!(await stat(root)).isDirectory()) {
          return reply(503, 'Local media directory is unavailable.');
        }
        return reply(200, 'ok');
      }

      const candidate = resolve(root, files.get(key));
      if (!isInside(root, candidate)) return reply(403, 'Media path is outside the library.');
      const actual = await realpath(candidate);
      if (!isInside(root, actual)) return reply(403, 'Media path is outside the library.');
      handle = await open(actual, 'r');
      const info = await handle.stat();
      if (!info.isFile()) return reply(404, 'Media file is unavailable.');

      const header = Buffer.alloc(128);
      const { bytesRead } = await handle.read(header, 0, header.length, 0);
      if (header.subarray(0, bytesRead).toString().startsWith('version https://git-lfs.github.com/spec/v1')) {
        return reply(409, 'Media is a Git LFS pointer. Run git lfs pull in the media repository.');
      }

      const range = byteRange(req.headers.range, info.size);
      if (range === false) {
        res.setHeader('Content-Range', `bytes */${info.size}`);
        return reply(416, 'Requested byte range is unavailable.');
      }
      const headers = {
        'Content-Type': CONTENT_TYPES[key.slice(-4)],
        'Content-Length': range ? range.end - range.start + 1 : info.size,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      };
      if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${info.size}`;
      res.writeHead(range ? 206 : 200, headers);
      if (req.method === 'HEAD') return res.end();
      // Stream only the requested bytes; videos are never buffered into memory.
      const stream = handle.createReadStream({
        start: range?.start ?? 0,
        ...(range ? { end: range.end } : {}),
        autoClose: false,
      });
      await pipeline(stream, res);
    } catch (error) {
      if (error.code === 'ERR_STREAM_PREMATURE_CLOSE' && res.destroyed) return;
      if (res.headersSent) {
        logger.error(`[local-media] ${error.message}`);
        res.destroy(error);
      } else if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        reply(key === 'probe.txt' ? 503 : 404, 'Local media is missing. Check OXFORD_MEDIA_DIR and the downloaded files.');
      } else {
        logger.error(`[local-media] ${error.message}`);
        reply(500, 'Unable to read local media. Check the media server log.');
      }
    } finally {
      await handle?.close();
    }
  };
}

export function localMediaPlugin(directory, files) {
  return {
    name: 'oxford-local-media',
    configureServer(server) {
      server.middlewares.use(createLocalMediaMiddleware({
        directory, files, logger: server.config.logger,
      }));
    },
  };
}
