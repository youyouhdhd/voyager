import JSZip from 'jszip';
import { afterEach, expect, it, vi } from 'vitest';

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

it('keeps references at the original claim and writes the report and matched preview into one ZIP', async () => {
  document.body.innerHTML = `<response-container><div class="response-container-content">
    <message-content><div class="markdown">
      <h1>Research</h1>
      <p>Claim<source-footnote><sup data-turn-source-index="2"></sup></source-footnote>.</p>
      <p>No destination<source-footnote><sup data-turn-source-index="1"></sup></source-footnote>.</p>
      <ul><li>Evidence<sup data-turn-source-index="2"></sup></li></ul>
      <web-preview><iframe src="${previewUrl}"></iframe></web-preview>
    </div></message-content>
    <deep-research-source-lists>
      <div class="used-sources"><browse-web-item></browse-web-item>
        <browse-web-item><a href="https://example.test/used"><div data-test-id="sub-title">Used (original)</div></a></browse-web-item>
      </div>
      <div class="unused-sources" hidden><browse-web-item><a href="https://example.test/unused">Unused</a></browse-web-item></div>
    </deep-research-source-lists>
  </div></response-container>`;
  const assistantElement = document.querySelector<HTMLElement>('message-content')!;
  const extractor = createContentExtractor({ ...domExtractorTestAdapter, siteId: 'gemini' });
  const turn = extractTurnContent(
    { user: '', assistant: '', starred: false, assistantElement },
    extractor,
  );
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
  expect(markdown).toContain('Claim[2](<https://example.test/used>).');
  expect(markdown).toContain('No destination\\[1\\].');
  expect(markdown).toContain('Evidence[2](<https://example.test/used>)');
  expect(markdown).toContain('2. [Used (original)](<https://example.test/used>)');
  expect(markdown).toContain('https://example.test/unused');
  expect(markdown).toContain('[A chart \\[1\\]](previews/web-preview-1.html)');
  expect(zip.file('previews/web-preview-2.html')).toBeNull();
  expect(await zip.file('previews/web-preview-1.html')?.async('string')).toContain(
    'sandbox="allow-scripts"',
  );

  const textDownload = vi.spyOn(MarkdownFormatter, 'download').mockImplementation(() => {});
  await ConversationExportService.export([turn], metadata, { ...options, markdownTextOnly: true });
  expect(textDownload.mock.calls[0]?.[0]).toContain('https://example.test/used');
  expect(textDownload.mock.calls[0]?.[0]).not.toContain('previews/');
});
