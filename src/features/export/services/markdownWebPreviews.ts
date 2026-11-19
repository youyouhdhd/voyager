import DOMPurify from 'dompurify';

import type { ChatTurn, ExportWebPreview } from '../types/export';
import { escapeHtml } from './exportDomPolicy';
import { offlineHtmlPage, offlinePreviewFrame, offlinePreviewPage } from './offlinePreviewHtml';

export interface MarkdownWebPreviewFile {
  path: string;
  content: string | Uint8Array;
}

function fillPreviewSlots(value: string, slots: string[], replacements: string[]): string {
  return slots.reduce(
    (result, marker, index) => result.replaceAll(marker, () => replacements[index] ?? ''),
    value,
  );
}

export function removeMarkdownWebPreviewSlots(turns: ChatTurn[]): ChatTurn[] {
  if (!turns.some((turn) => turn.assistantContent?.webPreviewSlots?.length)) return turns;
  return turns.map((turn) => {
    const content = turn.assistantContent;
    const slots = content?.webPreviewSlots;
    if (!content || !slots?.length) return turn;
    return {
      ...turn,
      assistantContent: {
        ...content,
        text: fillPreviewSlots(content.text, slots, []),
        html: fillPreviewSlots(content.html, slots, []),
      },
    };
  });
}

/** Keep the clickable screenshot at the original preview position. */
export function prepareMarkdownWebPreviews(turns: ChatTurn[], title?: string) {
  const files: MarkdownWebPreviewFile[] = [];
  let nextPreview = 1;
  const linkedTurns = turns.map((turn) => {
    const content = turn.assistantContent;
    const slots = content?.webPreviewSlots;
    if (!content || !slots?.length) return turn;
    const links = slots.map((marker, index) => {
      const preview = turn.webPreviews?.[index];
      if (!preview || !content.text.includes(marker)) return '';
      const { title, html, screenshot } = preview;
      const label = escapeHtml(title.replace(/\s+/g, ' '))
        .replace(/[\\`*_]/g, '\\$&')
        .replace(/\[/g, '&#91;')
        .replace(/\]/g, '&#93;');
      if (!html) return `${label} (web preview unavailable)`;
      const base = `previews/web-preview-${nextPreview++}`;
      files.push({ path: `${base}.html`, content: offlinePreviewPage(title, html) });
      if (!screenshot?.byteLength) return `[${label}](${base}.html)`;
      // Linked screenshots must pass the pointer to the anchor instead of the reader's image lightbox.
      const style = files.some((file) => file.path.endsWith('.png'))
        ? ''
        : '<style>a[href*="previews/web-preview-"][href$=".html"]{display:inline-block}a[href*="previews/web-preview-"][href$=".html"]>img{pointer-events:none}</style>\n\n';
      files.push({ path: `${base}.png`, content: screenshot });
      return `${style}[![${label}](${base}.png)](${base}.html)`;
    });
    return {
      ...turn,
      assistantContent: { ...content, text: fillPreviewSlots(content.text, slots, links) },
    };
  });
  if (files.length)
    files.push({
      path: 'report.html',
      content: renderArchiveReport(turns, title || 'Gemini report'),
    });
  return { turns: linkedTurns, files };
}

export function serializeJsonWebPreviews(
  previews?: ExportWebPreview[],
): ExportWebPreview[] | undefined {
  return previews?.map(({ title, html }) =>
    html ? { title, html: offlinePreviewPage(title, html) } : { title },
  );
}

function renderArchiveReport(turns: ChatTurn[], title: string): string {
  const report = turns
    .map((turn) => {
      const user = turn.userContent?.html || (turn.user ? `<p>${escapeHtml(turn.user)}</p>` : '');
      const answer =
        turn.assistantContent?.html ||
        (turn.assistant ? `<p>${escapeHtml(turn.assistant)}</p>` : '');
      const slots = turn.assistantContent?.webPreviewSlots ?? [];
      const frames = slots.map((_, index) => {
        const preview = turn.webPreviews?.[index];
        if (!preview) return '';
        const label = escapeHtml(preview.title);
        return preview.html
          ? `<figure class="web-preview"><figcaption>${label}</figcaption>${offlinePreviewFrame(preview.title, preview.html)}</figure>`
          : `<p>${label} (web preview unavailable)</p>`;
      });
      const content = fillPreviewSlots(DOMPurify.sanitize(`${user}${answer}`), slots, frames);
      return `<article>${content}</article>`;
    })
    .join('\n');
  return offlineHtmlPage(
    title,
    `<main>${report}</main>`,
    `
    :root{color-scheme:light dark;font:16px/1.65 system-ui,sans-serif}
    main{max-width:1120px;margin:auto;padding:1.5rem}a{overflow-wrap:anywhere}img{max-width:100%}
    pre,table{display:block;overflow:auto}td,th{padding:.35rem;border:1px solid #8886}
    .web-preview{margin:1.5rem 0}.web-preview figcaption{margin-bottom:.4rem;font-weight:600}
    .preview-frame{display:block;width:100%;height:80vh;border:1px solid #8886;background:white}`,
  );
}
