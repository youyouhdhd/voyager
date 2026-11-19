import { escapeHtml, escapeHtmlAttribute } from '@/features/export/services/exportDomPolicy';
import type { ChatTurn } from '@/features/export/types/export';

import { readResearchThinkingSections } from './extractor';

/** Append the research log belonging to the exported answer, including collapsed native panels. */
export function appendGeminiResearchThinking(turns: ChatTurn[]): void {
  for (const turn of turns) {
    const { assistantElement, assistantContent } = turn;
    if (!assistantElement || !assistantContent) continue;
    const owner =
      assistantElement.closest('deep-research-immersive-panel') ??
      assistantElement.closest('response-container, .response-container, model-response') ??
      assistantElement;
    if (!owner.querySelector('thinking-panel')) continue;
    const sections = readResearchThinkingSections(owner);
    if (!sections.length) continue;

    const markdown = ['## Thinking'];
    const html = ['<section><h2>Thinking</h2>'];
    for (const [index, { items }] of sections.entries()) {
      if (sections.length > 1) {
        markdown.push(`### Phase ${index + 1}`);
        html.push(`<h3>Phase ${index + 1}</h3>`);
      }
      for (const item of items) {
        if (item.type === 'thought') {
          if (item.header) {
            markdown.push(`#### ${item.header.replace(/\s+/g, ' ')}`);
            html.push(`<h4>${escapeHtml(item.header)}</h4>`);
          }
          if (item.content) {
            markdown.push(item.content);
            html.push(`<p>${escapeHtml(item.content).replace(/\r?\n/g, '<br>')}</p>`);
          }
          continue;
        }
        const links = item.chips.filter(({ url }) => /^https?:\/\//i.test(url));
        if (!links.length) continue;
        markdown.push(
          '#### Researched websites',
          links
            .map(
              ({ title, domain, url }) =>
                `- [${escapeHtml(title || domain).replace(/[\\`*_[\]|]/g, '\\$&')}](<${url.replace(/[<>|\\\s]/g, encodeURIComponent)}>)`,
            )
            .join('\n'),
        );
        html.push(
          '<h4>Researched websites</h4><ul>',
          ...links.map(
            ({ title, domain, url }) =>
              `<li><a href="${escapeHtmlAttribute(url)}">${escapeHtml(title || domain)}</a></li>`,
          ),
          '</ul>',
        );
      }
    }
    assistantContent.text = [assistantContent.text, ...markdown].join('\n\n');
    assistantContent.html = [assistantContent.html, ...html, '</section>'].join('\n');
  }
}
