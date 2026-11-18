import {
  GEMINI_PREVIEW_EXPORT,
  GEMINI_PREVIEW_FRAME,
  isGeminiPreviewSnapshot,
  isGeminiPreviewUrl,
} from '@/core/gemini/previewExport';
import { escapeHtmlAttribute } from '@/features/export/services/exportDomPolicy';
import type { ChatTurn, ExportOptions } from '@/features/export/types/export';

/** Captures selected response frames, without loading them again or exposing their URLs in the archive. */
export async function attachGeminiWebPreviews(
  turns: ChatTurn[],
  options: Pick<ExportOptions, 'format' | 'markdownTextOnly'>,
): Promise<void> {
  if (options.format !== 'json' && (options.format !== 'markdown' || options.markdownTextOnly))
    return;
  const frameSources = turns.map((turn) =>
    Array.from(
      turn.assistantElement?.querySelectorAll<HTMLIFrameElement>(GEMINI_PREVIEW_FRAME) ?? [],
      (frame) => frame.src,
    ).filter(isGeminiPreviewUrl),
  );
  const urls = [...new Set(frameSources.flat())];
  if (!urls.length) return;
  let response: unknown;
  try {
    response = await chrome.runtime.sendMessage({ type: GEMINI_PREVIEW_EXPORT, payload: urls });
  } catch {
    // Restricted or reloaded extension contexts can still export the report.
  }
  const snapshots = new Map(
    Array.isArray(response)
      ? response.filter(isGeminiPreviewSnapshot).map((entry) => [entry.url, entry])
      : [],
  );
  turns.forEach((turn, index) => {
    const sources = frameSources[index];
    if (!sources?.length) return;
    turn.webPreviews = sources.map((url, i) => {
      const snapshot = snapshots.get(url);
      const title = snapshot?.title || `Gemini web preview ${i + 1}`;
      return snapshot ? { title, html: previewDocument(title, snapshot.html) } : { title };
    });
  });
}

function previewDocument(title: string, html: string): string {
  const label = escapeHtmlAttribute(title);
  // shortcut: replay inline resources only, bundle reviewed dependencies if a preview needs them.
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; form-action 'none'; base-uri 'none'; frame-src about:">
<title>${label}</title><style>body{margin:0}iframe{display:block;border:0;width:100%;height:100vh}</style></head>
<body><iframe title="${label}" sandbox="allow-scripts" srcdoc="${escapeHtmlAttribute(html)}"></iframe></body></html>`;
}
