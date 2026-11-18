export const GEMINI_PREVIEW_EXPORT = 'gv.generatedUi.readPreviews';
export const GEMINI_PREVIEW_FRAME = 'web-preview iframe[src*="/gemini-code-immersive/shim.html"]';
export const MAX_PREVIEW_CHARS = 1_000_000;

export interface GeminiPreviewSnapshot {
  url: string;
  title: string;
  html: string;
}

export function isGeminiPreviewUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.hostname.endsWith('.scf.usercontent.goog') &&
      url.pathname === '/gemini-code-immersive/shim.html'
    );
  } catch {
    return false;
  }
}

export function isGeminiPreviewSnapshot(value: unknown): value is GeminiPreviewSnapshot {
  if (!value || typeof value !== 'object') return false;
  return (
    'url' in value &&
    isGeminiPreviewUrl(value.url) &&
    'title' in value &&
    typeof value.title === 'string' &&
    value.title.length <= 200 &&
    'html' in value &&
    typeof value.html === 'string' &&
    value.html.length > 0 &&
    value.html.length <= MAX_PREVIEW_CHARS
  );
}
