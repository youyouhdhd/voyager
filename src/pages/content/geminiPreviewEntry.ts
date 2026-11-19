import {
  GEMINI_PREVIEW_EXPORT,
  MAX_PREVIEW_CHARS,
  matchGeminiPreviewDocument,
} from '@/core/gemini/previewExport';

if (window !== window.top) {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== GEMINI_PREVIEW_EXPORT || port.sender?.id !== chrome.runtime.id) return;
    port.onMessage.addListener((urls: unknown) => {
      if (!Array.isArray(urls)) return;
      const url = matchGeminiPreviewDocument(location.href, urls);
      if (
        !url ||
        !document.body?.querySelector(':scope > :not(script, style, link, meta, template)')
      )
        return;
      const root = document.documentElement.cloneNode(true);
      if (!(root instanceof Element)) return;
      root.querySelectorAll('[data-bard-client-injected]').forEach((element) => element.remove());
      root
        .querySelectorAll(
          'meta[http-equiv="refresh" i], meta[http-equiv="content-security-policy" i], base',
        )
        .forEach((element) => element.remove());
      const html = `<!doctype html>\n${root.outerHTML}`;
      if (html.length > MAX_PREVIEW_CHARS) return;
      port.postMessage({
        url,
        title: (document.querySelector('h1')?.textContent?.trim() || document.title).slice(0, 200),
        html,
      });
    });
  });
}
