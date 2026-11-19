// Gemini sends the original HTML once, before the shim navigates to a short-lived blob.
(() => {
  const messageType = 'gv.gemini-preview-source';
  const maxLength = 1_000_000;
  const geminiOrigins = ['https://gemini.google.com', 'https://business.gemini.google'];
  const isShim = (url: URL): boolean =>
    url.protocol === 'https:' &&
    !url.port &&
    url.hostname.endsWith('.scf.usercontent.goog') &&
    url.pathname === '/gemini-code-immersive/shim.html';

  if (window !== window.top) {
    if (!isShim(new URL(location.href))) return;
    window.addEventListener('message', (event) => {
      if (event.source !== window.parent || !geminiOrigins.includes(event.origin)) return;
      const data: unknown = event.data;
      if (
        !data ||
        typeof data !== 'object' ||
        !('mimeType' in data) ||
        !('body' in data) ||
        typeof data.mimeType !== 'string' ||
        !/^text\/html(?:;|$)/i.test(data.mimeType)
      )
        return;
      const body = data.body;
      const html =
        typeof body === 'string'
          ? body
          : body instanceof ArrayBuffer && body.byteLength <= maxLength
            ? new TextDecoder().decode(body)
            : '';
      if (html.length && html.length <= maxLength) {
        window.parent.postMessage({ type: messageType, html }, event.origin);
      }
    });
    return;
  }

  if (!geminiOrigins.includes(location.origin)) return;
  const sources = new WeakMap<HTMLIFrameElement, { url: string; html: string }>();
  Object.assign(window, { __gvGeminiPreviewSources: sources });
  window.addEventListener('message', (event) => {
    const data: unknown = event.data;
    if (
      !data ||
      typeof data !== 'object' ||
      !('type' in data) ||
      data.type !== messageType ||
      !('html' in data) ||
      typeof data.html !== 'string' ||
      !data.html.length ||
      data.html.length > maxLength
    )
      return;
    for (const frame of document.querySelectorAll<HTMLIFrameElement>('web-preview iframe[src]')) {
      const url = new URL(frame.src, location.href);
      if (frame.contentWindow !== event.source || !isShim(url) || url.origin !== event.origin)
        continue;
      sources.set(frame, { url: frame.src, html: data.html });
      break;
    }
  });
})();
