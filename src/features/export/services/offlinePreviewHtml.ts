import { escapeHtml, escapeHtmlAttribute } from './exportDomPolicy';

const POLICY =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; form-action 'none'; base-uri 'none'; frame-src about:";
const FRAME_STYLE = '<style>html,body{overflow:auto!important}</style>';

export function offlinePreviewFrame(title: string, html: string): string {
  const source = html.replace(
    /<script\b[^>]*\bdata-bard-client-injected\b[^>]*>[\s\S]*?<\/script\s*>/gi,
    '',
  );
  const headEnd = /<\/head\s*>/i;
  const scrollable = headEnd.test(source)
    ? source.replace(headEnd, `${FRAME_STYLE}</head>`)
    : `<!doctype html>${FRAME_STYLE}${source.replace(/^\s*<!doctype html\s*>/i, '')}`;
  return `<iframe class="preview-frame" title="${escapeHtmlAttribute(title)}" sandbox="allow-scripts" srcdoc="${escapeHtmlAttribute(scrollable)}"></iframe>`;
}

/** The print body is sanitized separately. Only the sandboxed child receives generated scripts. */
export function offlineHtmlPage(title: string, content: string, css: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${POLICY}">
<title>${escapeHtml(title)}</title><style>${css}</style></head>
<body>${content}</body></html>`;
}

export function offlinePreviewPage(title: string, html: string): string {
  return offlineHtmlPage(
    title,
    offlinePreviewFrame(title, html),
    'body{margin:0}.preview-frame{display:block;border:0;width:100%;height:100vh}',
  );
}
