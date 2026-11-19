import { GEMINI_PREVIEW_EXPORT, isGeminiPreviewSnapshot } from '@/core/gemini/previewExport';
import { geminiPreviewFrames } from '@/features/export/services/geminiPreviewSlots';
import type { ChatTurn, ExportOptions, ExportWebPreview } from '@/features/export/types/export';

import { renderGeminiPreviewImage } from './renderGeminiPreviewImage';

interface PreviewSource {
  url: string;
  html: string;
}

function previewSource(frame: HTMLIFrameElement): PreviewSource | undefined {
  const sources = (
    window as Window & { __gvGeminiPreviewSources?: WeakMap<HTMLIFrameElement, PreviewSource> }
  ).__gvGeminiPreviewSources;
  const saved = sources?.get(frame);
  return saved?.url === frame.src ? saved : undefined;
}

/** Captures selected response frames, without loading them again or exposing their URLs in the archive. */
export async function attachGeminiWebPreviews(
  turns: ChatTurn[],
  options: Pick<ExportOptions, 'format' | 'markdownTextOnly'>,
): Promise<void> {
  if (options.format !== 'json' && (options.format !== 'markdown' || options.markdownTextOnly))
    return;
  const framesByTurn = turns.map((turn) => geminiPreviewFrames(turn.assistantElement));
  const urls = [
    ...new Set(
      framesByTurn
        .flat()
        .filter((frame) => !previewSource(frame))
        .map((frame) => frame.src),
    ),
  ];
  let response: unknown;
  if (urls.length) {
    try {
      response = await chrome.runtime.sendMessage({ type: GEMINI_PREVIEW_EXPORT, payload: urls });
    } catch {
      // Restricted or reloaded extension contexts can still export the report.
    }
  }
  const snapshots = new Map(
    Array.isArray(response)
      ? response.filter(isGeminiPreviewSnapshot).map((entry) => [entry.url, entry])
      : [],
  );
  const toRender: (ExportWebPreview & { html: string })[] = [];
  let remaining = 8_000_000;
  turns.forEach((turn, index) => {
    const frames = framesByTurn[index];
    if (!frames?.length) return;
    turn.webPreviews = frames.map((frame, i) => {
      const snapshot = snapshots.get(frame.src);
      const source = previewSource(frame);
      const html = source?.html ?? snapshot?.html;
      const title =
        snapshot?.title ||
        source?.html
          .match(/<title\b[^>]*>([^<]*)<\/title>/i)?.[1]
          ?.trim()
          .slice(0, 200) ||
        `Gemini web preview ${i + 1}`;
      if (!html || html.length > remaining) return { title };
      remaining -= html.length;
      const preview = { title, html };
      if (options.format === 'markdown') toRender.push(preview);
      return preview;
    });
  });
  let imageBytes = 16 * 1024 * 1024;
  const deadline = Date.now() + 15_000;
  for (const preview of toRender) {
    if (imageBytes <= 0 || Date.now() >= deadline) break;
    const bytes = await renderGeminiPreviewImage(preview.html);
    if (bytes && bytes.length <= imageBytes) {
      imageBytes -= bytes.length;
      preview.image = bytes;
    }
  }
}
