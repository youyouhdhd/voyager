import { escapeHtml, escapeHtmlAttribute } from './exportDomPolicy';

const SOURCE_GROUPS = [
  ['.used-sources', 'Sources used in the report'],
  ['.unused-sources', 'Sources browsed but not used'],
] as const;

function sourceLinks(list: Element | null | undefined) {
  return Array.from(list?.querySelectorAll('browse-web-item') ?? [], (item) => {
    const link = item.querySelector<HTMLAnchorElement>('a[href]');
    return {
      title: link
        ?.querySelector('[data-test-id="sub-title"]')
        ?.textContent?.trim()
        .replace(/\s+/g, ' '),
      url: link && /^https?:$/.test(link.protocol) ? link.href : '',
    };
  });
}

function markdownLink(title: string, url: string): string {
  const label = escapeHtml(title).replace(/[\\`*_[\]|]/g, '\\$&');
  return `[${label}](<${url.replace(/[<>|\\]/g, encodeURIComponent)}>)`;
}

export function readGeminiResearchSources(root: HTMLElement) {
  const owner = root.closest('response-container, .response-container-content');
  const lists =
    root.querySelector('deep-research-source-lists') ??
    owner?.querySelector('deep-research-source-lists');
  const groups = SOURCE_GROUPS.map(([selector, heading]) => ({
    heading,
    links: sourceLinks(lists?.querySelector(selector)),
  }));

  const citation = (
    element: Element,
  ): { html: string; text: string; plain: string; href?: string } | undefined => {
    if (!element.matches('sup[data-turn-source-index]')) return;
    const index = element.getAttribute('data-turn-source-index') ?? '';
    if (!/^[1-9]\d*$/.test(index)) return;
    // Gemini uses the one-based index in the used-sources list, including slots without a link.
    const url = groups[0]?.links[Number(index) - 1]?.url;
    const plain = `[${index}]`;
    // Backslash brackets are block-math delimiters in Markdown Preview Enhanced.
    const label = `&#91;${index}&#93;`;
    return {
      html: `<sup>${url ? `<a href="${escapeHtmlAttribute(url)}">${plain}</a>` : plain}</sup>`,
      text: url ? `[${label}](<${url.replace(/[<>|\\]/g, encodeURIComponent)}>)` : label,
      plain,
      href: url || undefined,
    };
  };

  const text: string[] = [];
  const html: string[] = [];
  for (const { heading, links } of groups) {
    if (!links.some(({ url }) => url)) continue;
    text.push(`#### ${heading}\n\n`);
    html.push(`<h4>${heading}</h4><ol>`);
    links.forEach(({ title, url }, index) => {
      if (!url) {
        text.push(`${index + 1}. Source unavailable\n`);
        html.push('<li>Source unavailable</li>');
        return;
      }
      const label = title || new URL(url).hostname;
      text.push(`${index + 1}. ${markdownLink(label, url)}\n`);
      html.push(
        `<li value="${index + 1}"><a href="${escapeHtmlAttribute(url)}">${escapeHtml(label)}</a></li>`,
      );
    });
    text.push('\n');
    html.push('</ol>');
  }
  return { citation, text: text.join('').trimEnd(), html: html.join('') };
}
