import type { ChatTurn } from '../types/export';
import { escapeHtml } from './exportDomPolicy';

export interface MarkdownWebPreviewFile {
  path: string;
  html: string;
}

/** Append links beside each selected turn and collect a single set of ZIP entries. */
export function prepareMarkdownWebPreviews(turns: ChatTurn[]) {
  const files: MarkdownWebPreviewFile[] = [];
  const linkedTurns = turns.map((turn) => {
    if (!turn.webPreviews?.length) return turn;
    const links = turn.webPreviews.map(({ title, html }) => {
      const label = escapeHtml(title.replace(/\s+/g, ' ')).replace(/[\\`*_[\]]/g, '\\$&');
      if (!html) return `- ${label} (web preview unavailable)`;
      const path = `previews/web-preview-${files.length + 1}.html`;
      files.push({ path, html });
      return `- [${label}](${path})`;
    });
    const content = turn.assistantContent?.text || turn.assistant;
    const text = [content, `#### Generated webpages\n\n${links.join('\n')}`]
      .filter(Boolean)
      .join('\n\n');
    return {
      ...turn,
      assistant: text,
      assistantContent: turn.assistantContent ? { ...turn.assistantContent, text } : undefined,
    };
  });
  return { turns: linkedTurns, files };
}
