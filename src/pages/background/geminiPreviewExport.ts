import {
  GEMINI_PREVIEW_EXPORT,
  isGeminiPreviewSnapshot,
  isGeminiPreviewUrl,
  type GeminiPreviewSnapshot,
} from '@/core/gemini/previewExport';

import { isTrustedSyncMessageSender } from './runtimeMessageRouting';

const PREVIEW_REPLY_MS = 1800;
const TOTAL_PREVIEW_CHARS = 8_000_000;

export async function readGeminiPreviews(
  request: unknown,
  sender: chrome.runtime.MessageSender,
): Promise<GeminiPreviewSnapshot[]> {
  const tabId = sender.tab?.id;
  if (
    tabId === undefined ||
    sender.frameId !== 0 ||
    !isTrustedSyncMessageSender(sender, 'gemini') ||
    !Array.isArray(request) ||
    !chrome.tabs?.connect
  )
    return [];
  const urls = new Set(request.filter(isGeminiPreviewUrl));
  if (!urls.size) return [];

  // A tabs port without a frameId reaches every matching preview script in this tab.
  const port = chrome.tabs.connect(tabId, { name: GEMINI_PREVIEW_EXPORT });
  return await new Promise((resolve) => {
    const snapshots = new Map<string, GeminiPreviewSnapshot>();
    let total = 0;
    const finish = () => {
      clearTimeout(timer);
      port.disconnect();
      resolve(Array.from(snapshots.values()));
    };
    const timer = setTimeout(finish, PREVIEW_REPLY_MS);
    port.onDisconnect.addListener(() => {
      // Reading lastError avoids an unchecked connection error on tabs with no loaded previews.
      if (chrome.runtime.lastError) finish();
    });
    port.onMessage.addListener((value: unknown) => {
      if (!isGeminiPreviewSnapshot(value) || !urls.delete(value.url)) return;
      if (total + value.html.length <= TOTAL_PREVIEW_CHARS) {
        snapshots.set(value.url, value);
        total += value.html.length;
      }
      if (!urls.size) finish();
    });
    try {
      port.postMessage(Array.from(urls));
    } catch {
      finish();
    }
  });
}
