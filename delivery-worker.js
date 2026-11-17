const media = {"path":"assets/videos/habitat.mp4","size":47061890,"chunkSize":8388608,"parts":["assets/videos/324c99f4bfe5260d-0.bin","assets/videos/324c99f4bfe5260d-1.bin","assets/videos/324c99f4bfe5260d-2.bin","assets/videos/324c99f4bfe5260d-3.bin","assets/videos/324c99f4bfe5260d-4.bin","assets/videos/324c99f4bfe5260d-5.bin"],"sha":"324c99f4bfe5260d7879f14e63446dd14efc45b5b148c08349c6474edb1be66e"};
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function rangeFor(header, size) {
  if (!header) return {start: 0, end: size - 1, partial: false};
  const m = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!m || (!m[1] && !m[2])) return null;
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(size - 1, Number(m[2])) : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < size
    ? {start, end, partial: true} : null;
}

async function* readRange(range, signal) {
  const first = Math.floor(range.start / media.chunkSize);
  const last = Math.floor(range.end / media.chunkSize);
  for (let i = first; i <= last; i++) {
    const offset = i * media.chunkSize;
    const lo = Math.max(0, range.start - offset);
    const hi = Math.min(media.size - offset - 1, media.chunkSize - 1, range.end - offset);
    const response = await fetch(new URL(media.parts[i], self.registration.scope), {
      headers: {Range: `bytes=${lo}-${hi}`}, signal
    });
    if (!response.ok || !response.body) throw Error('Video part unavailable.');
    const reader = response.body.getReader();
    let skip = response.status === 206 ? 0 : lo;
    let remaining = hi - lo + 1;
    try {
      while (remaining > 0) {
        const {value, done} = await reader.read();
        if (done) break;
        if (skip >= value.length) {skip -= value.length; continue;}
        const data = value.subarray(skip, Math.min(value.length, skip + remaining));
        skip = 0;
        remaining -= data.length;
        yield data;
      }
      if (remaining) throw Error('Incomplete video part.');
    } finally {await reader.cancel().catch(() => {}); reader.releaseLock();}
  }
}

function deliver(request) {
  const etag = `"${media.sha}"`;
  if (request.headers.get('If-None-Match') === etag) return new Response(null, {status: 304, headers: {ETag: etag}});
  const range = rangeFor(request.headers.get('Range'), media.size);
  if (!range) return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${media.size}`}});
  const headers = new Headers({
    'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', ETag: etag,
    'Content-Length': String(range.end - range.start + 1),
    'Cache-Control': 'public, max-age=0, must-revalidate'
  });
  if (range.partial) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${media.size}`);
  if (request.method === 'HEAD') return new Response(null, {status: range.partial ? 206 : 200, headers});
  const abort = new AbortController();
  const chunks = readRange(range, abort.signal);
  const stream = new ReadableStream({
    async pull(controller) {
      try {const r = await chunks.next(); if (r.done) controller.close(); else controller.enqueue(r.value);}
      catch (e) {controller.error(e);}
    },
    async cancel() {abort.abort(); await chunks.return().catch(() => {});}
  });
  return new Response(stream, {status: range.partial ? 206 : 200, headers});
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.href === new URL(media.path, self.registration.scope).href && ['GET', 'HEAD'].includes(event.request.method)) {
    event.respondWith(deliver(event.request));
  }
});
