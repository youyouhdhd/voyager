import DOMPurify from 'dompurify';

import type { ChatTurn, ExportWebPreview } from '../types/export';
import { escapeHtml } from './exportDomPolicy';
import { offlineHtmlPage, offlinePreviewFrame, offlinePreviewPage } from './offlinePreviewHtml';

export interface MarkdownWebPreviewFile {
  path: string;
  html: string;
}

/** Append links beside each selected turn and collect a single set of ZIP entries. */
export function prepareMarkdownWebPreviews(turns: ChatTurn[], title?: string) {
  const files: MarkdownWebPreviewFile[] = [];
  const linkedTurns = turns.map((turn) => {
    if (!turn.webPreviews?.length) return turn;
    const links = turn.webPreviews.map(({ title, html }) => {
      const label = escapeHtml(title.replace(/\s+/g, ' ')).replace(/[\\`*_[\]]/g, '\\$&');
      if (!html) return `- ${label} (web preview unavailable)`;
      const path = `previews/web-preview-${files.length + 1}.html`;
      files.push({ path, html: offlinePreviewPage(title, html) });
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
  if (files.length)
    files.push({ path: 'report.html', html: renderArchiveReport(turns, title || 'Gemini report') });
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
      const content = DOMPurify.sanitize(`${user}${answer}`);
      const frames = turn.webPreviews
        ?.map(({ title: label, html }) => {
          const heading = `<h3>${escapeHtml(label)}</h3>`;
          return html ? `<section>${heading}${offlinePreviewFrame(label, html)}</section>` : '';
        })
        .join('');
      return `<article>${content}${frames ? `<section><h2>Generated webpages</h2>${frames}</section>` : ''}</article>`;
    })
    .join('\n');
  return offlineHtmlPage(
    title,
    `<main>${report}</main>`,
    `
    :root{color-scheme:light dark;font:16px/1.65 system-ui,sans-serif}
    main{max-width:1120px;margin:auto;padding:1.5rem}a{overflow-wrap:anywhere}img{max-width:100%}
    pre,table{display:block;overflow:auto}td,th{padding:.35rem;border:1px solid #8886}
    .preview-frame{display:block;width:100%;height:80vh;border:1px solid #8886;background:white}`,
  );
}
