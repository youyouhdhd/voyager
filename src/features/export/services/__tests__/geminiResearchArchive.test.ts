import JSZip from 'jszip';
import { marked } from 'marked';
import { afterEach, expect, it, vi } from 'vitest';

import { matchGeminiPreviewDocument } from '@/core/gemini/previewExport';
import { appendGeminiResearchThinking } from '@/pages/content/deepResearch/appendThinking';
import { attachGeminiWebPreviews } from '@/pages/content/export/geminiWebPreviews';

import { ExportFormat } from '../../types/export';
import { ConversationExportService } from '../ConversationExportService';
import { createContentExtractor, extractTurnContent } from '../DOMContentExtractor';
import { MarkdownFormatter } from '../MarkdownFormatter';
import { domExtractorTestAdapter } from './domExtractorTestAdapter';

const previewUrl = 'https://chart.scf.usercontent.goog/gemini-code-immersive/shim.html?cache=1';
const metadata = {
  title: 'Research',
  url: 'https://gemini.google.com/app/test',
  count: 1,
  exportedAt: '2026-11-18T00:00:00Z',
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it('associates a blob preview with its shim without guessing between two same-origin requests', () => {
  const blob = 'blob:https://chart.scf.usercontent.goog/123';
  expect(
    matchGeminiPreviewDocument(blob, [previewUrl, previewUrl.replace('chart.', 'other.')]),
  ).toBe(previewUrl);
  expect(
    matchGeminiPreviewDocument(blob, [previewUrl, previewUrl.replace('cache=1', 'cache=2')]),
  ).toBeUndefined();
  expect(matchGeminiPreviewDocument('blob:https://example.test/123', [previewUrl])).toBeUndefined();
});

it('keeps references at the original claim and writes the report and matched preview into one ZIP', async () => {
  document.body.innerHTML = `<response-container><div class="response-container-content">
    <message-content><div class="markdown">
      <h1>Research</h1>
      <p>Claim<source-footnote><sup data-turn-source-index="2"></sup></source-footnote>.</p>
      <p>No destination<source-footnote><sup data-turn-source-index="1"></sup></source-footnote>.</p>
      <ul><li>Evidence<sup data-turn-source-index="2"></sup></li></ul>
      <table><tr><th>Finding</th></tr><tr><td>Evidence<sup data-turn-source-index="2"></sup></td></tr></table>
      <p>Before the chart.</p>
      <div class="attachment-container"><response-element><web-preview><iframe src="${previewUrl}"></iframe></web-preview></response-element></div>
      <p>After the chart.</p>
    </div></message-content>
    <deep-research-source-lists>
      <div class="used-sources"><browse-web-item></browse-web-item>
        <browse-web-item><a href="https://example.test/used"><div data-test-id="sub-title">Used (original)</div></a></browse-web-item>
      </div>
      <div class="unused-sources" hidden><browse-web-item><a href="https://example.test/unused">Unused</a></browse-web-item></div>
    </deep-research-source-lists>
    <thinking-panel hidden>
      <div class="item-container"><thought-item><div class="thought-header">Check evidence</div>
        <div class="gds-body-m gds-italic">Reviewed the patent.</div></thought-item></div>
      <div class="item-container"><browse-chip-list><browse-web-chip><a data-test-id="browse-chip-link" href="https://example.test/research"><span data-test-id="domain-name">example.test</span><span data-test-id="title">Research notes</span></a></browse-web-chip></browse-chip-list></div>
    </thinking-panel>
  </div></response-container>`;
  const assistantElement = document.querySelector<HTMLElement>('message-content')!;
  const extractor = createContentExtractor({ ...domExtractorTestAdapter, siteId: 'gemini' });
  const turn = extractTurnContent(
    { user: '', assistant: '', starred: false, assistantElement },
    extractor,
  );
  appendGeminiResearchThinking([turn]);
  const request = vi.fn().mockResolvedValue([
    {
      url: previewUrl,
      title: 'A chart [1]',
      html: '<html><body><button>Change</button></body></html>',
    },
    { url: previewUrl.replace('cache=1', 'cache=2'), title: 'Other turn', html: '<html></html>' },
  ]);
  vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(request);
  await attachGeminiWebPreviews([turn], { format: ExportFormat.MARKDOWN });
  expect(request.mock.calls[0]?.[0]).toMatchObject({ payload: [previewUrl] });

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const download = vi.fn((_: Blob) => 'blob:report');
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL = download;
      static override revokeObjectURL = vi.fn();
    },
  );
  const options = { layout: 'document', format: ExportFormat.MARKDOWN } as const;
  expect(await ConversationExportService.export([turn], metadata, options)).toMatchObject({
    filename: 'Research.zip',
    success: true,
  });
  const zip = await JSZip.loadAsync(download.mock.calls[0]![0]);
  const markdown = await zip.file('Research.md')?.async('string');
  expect(markdown).toContain('Claim[[2]](<https://example.test/used>).');
  const renderedMarkdown = new DOMParser().parseFromString(
    marked.parse(markdown ?? '', { async: false }),
    'text/html',
  );
  expect(renderedMarkdown.querySelector('p a[href="https://example.test/used"]')?.textContent).toBe(
    '[2]',
  );
  expect(
    turn.assistantContent?.html.match(
      /<sup><a href="https:\/\/example\.test\/used">\[2\]<\/a><\/sup>/g,
    ),
  ).toHaveLength(3);
  expect(markdown).toContain('No destination[1].');
  expect(markdown).toContain('Evidence[[2]](<https://example.test/used>)');
  expect(markdown).toContain('2. [Used (original)](<https://example.test/used>)');
  expect(markdown).toContain('https://example.test/unused');
  expect(markdown).toContain('## Thinking\n\n#### Check evidence\n\nReviewed the patent.');
  expect(markdown).toContain('[Research notes](<https://example.test/research>)');
  expect(markdown).toContain('(report.html)');
  const previewFrame = renderedMarkdown.querySelector('iframe[src="previews/web-preview-1.html"]');
  expect(previewFrame?.getAttribute('sandbox')).toBe('allow-scripts');
  expect(previewFrame?.previousElementSibling?.previousElementSibling?.textContent).toBe(
    'Before the chart.',
  );
  expect(previewFrame?.nextElementSibling?.querySelector('a')?.getAttribute('href')).toBe(
    'previews/web-preview-1.html',
  );
  expect(previewFrame?.nextElementSibling?.nextElementSibling?.textContent).toBe(
    'After the chart.',
  );
  expect(markdown).not.toContain('data-gv-export-preview');
  expect(zip.file('previews/web-preview-2.html')).toBeNull();
  expect(await zip.file('previews/web-preview-1.html')?.async('string')).toContain(
    'sandbox="allow-scripts"',
  );
  const htmlReport = await zip.file('report.html')?.async('string');
  expect(htmlReport).toContain('<h2>Thinking</h2>');
  expect(htmlReport).toContain('<a href="https://example.test/used">[2]</a>');
  expect(htmlReport).toContain('sandbox="allow-scripts" srcdoc=');
  expect(htmlReport).toContain('&lt;button&gt;Change&lt;/button&gt;');
  expect(htmlReport).toMatch(
    /<p>Before the chart\.<\/p>\s*<figure[^>]*>.*<\/figure>\s*<p>After the chart\.<\/p>/s,
  );
  expect(htmlReport).not.toContain('data-gv-export-preview');

  const textDownload = vi.spyOn(MarkdownFormatter, 'download').mockImplementation(() => {});
  await ConversationExportService.export([turn], metadata, { ...options, markdownTextOnly: true });
  expect(textDownload.mock.calls[0]?.[0]).toContain('https://example.test/used');
  expect(textDownload.mock.calls[0]?.[0]).not.toContain('previews/');
  expect(textDownload.mock.calls[0]?.[0]).not.toContain('data-gv-export-preview');
});
