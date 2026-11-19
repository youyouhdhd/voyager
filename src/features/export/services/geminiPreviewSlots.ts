import { GEMINI_PREVIEW_FRAME, isGeminiPreviewUrl } from '@/core/gemini/previewExport';

export function geminiPreviewFrames(root?: HTMLElement): HTMLIFrameElement[] {
  return Array.from(root?.querySelectorAll<HTMLIFrameElement>(GEMINI_PREVIEW_FRAME) ?? []).filter(
    (frame) => isGeminiPreviewUrl(frame.src),
  );
}

export function readGeminiPreviewSlots(root: HTMLElement) {
  const frames = geminiPreviewFrames(root);
  if (!frames.length) return;
  const id = crypto.randomUUID();
  const placements = new Map<Element, string[]>();
  const slots = frames.map((frame, index) => {
    const host = frame.closest('web-preview')!;
    const marker = `<span data-gv-export-preview="${id}-${index}"></span>`;
    const existing = placements.get(host);
    if (existing) existing.push(marker);
    else placements.set(host, [marker]);
    return marker;
  });
  return { slots, markersFor: (element: Element) => placements.get(element) };
}
