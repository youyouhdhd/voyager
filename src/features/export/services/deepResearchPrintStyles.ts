import { buildKatexExportStyles } from './katexExportStyles';
import { buildMermaidExportStyles } from './mermaidExportStyles';

export const deepResearchPrintElements = {
  stylesId: 'gv-deep-research-pdf-print-styles',
  containerId: 'gv-deep-research-pdf-print-container',
  bodyClass: 'gv-deep-research-pdf-printing',
  safariBodyClass: 'gv-deep-research-pdf-safari-printing',
} as const;

export function injectDeepResearchPrintStyles(fontSize?: number): void {
  const { stylesId, containerId, bodyClass, safariBodyClass } = deepResearchPrintElements;
  if (document.getElementById(stylesId)) return;

  const basePt = fontSize ?? 11;
  const coverTitlePt = Math.round(basePt * (36 / 11));
  const metaPt = Math.max(basePt + 1, 10);
  const codePt = Math.max(basePt - 2, 8);
  const footerPt = Math.max(basePt - 2, 8);

  const style = document.createElement('style');
  style.id = stylesId;
  style.textContent = `
      .gv-deep-research-print-only {
        display: none;
      }

      @media print {
        body.${bodyClass} > *:not(#${containerId}) {
          display: none !important;
          visibility: hidden !important;
        }

        body.${bodyClass} #${containerId} {
          display: block !important;
          visibility: visible !important;
        }

        body.${bodyClass} #${containerId},
        body.${bodyClass} #${containerId} * {
          visibility: visible !important;
        }

        html,
        body {
          background: #fff !important;
        }

        body.${bodyClass} {
          background: #fff !important;
        }

        body.${bodyClass} #${containerId} * {
          display: revert !important;
        }

        ${buildKatexExportStyles(`body.${bodyClass} #${containerId}`, true)}

        /* Preserve KaTeX layout primitives after the global display override above.
           Without these, sub/sup scripts (e.g. x_1) may become misaligned in PDF print. */
        body.${bodyClass} #${containerId} .katex-display,
        body.${bodyClass} #${containerId} .katex-display > .katex,
        body.${bodyClass} #${containerId} .katex-display > .katex > .katex-html {
          display: block !important;
        }

        body.${bodyClass} #${containerId} .katex .base,
        body.${bodyClass} #${containerId} .katex .strut,
        body.${bodyClass} #${containerId} .katex .vlist > span > span,
        body.${bodyClass} #${containerId} .katex .mspace,
        body.${bodyClass} #${containerId} .katex .mfrac .frac-line,
        body.${bodyClass} #${containerId} .katex .rule,
        body.${bodyClass} #${containerId} .katex .hline,
        body.${bodyClass} #${containerId} .katex .hdashline,
        body.${bodyClass} #${containerId} .katex .overline .overline-line,
        body.${bodyClass} #${containerId} .katex .underline .underline-line,
        body.${bodyClass} #${containerId} .katex .nulldelimiter,
        body.${bodyClass} #${containerId} .katex .clap > .fix,
        body.${bodyClass} #${containerId} .katex .llap > .fix,
        body.${bodyClass} #${containerId} .katex .rlap > .fix,
        body.${bodyClass} #${containerId} .katex .mtable .vertical-separator,
        body.${bodyClass} #${containerId} .katex .mtable .arraycolsep,
        body.${bodyClass} #${containerId} .katex .cd-vert-arrow,
        body.${bodyClass} #${containerId} .katex .cd-label-left,
        body.${bodyClass} #${containerId} .katex .cd-label-right {
          display: inline-block !important;
        }

        body.${bodyClass} #${containerId} .katex .vlist-t {
          display: inline-table !important;
        }

        body.${bodyClass} #${containerId} .katex .vlist-r {
          display: table-row !important;
        }

        body.${bodyClass} #${containerId} .katex .vlist,
        body.${bodyClass} #${containerId} .katex .vlist-s {
          display: table-cell !important;
        }

        body.${bodyClass} #${containerId} .katex .vlist > span,
        body.${bodyClass} #${containerId} .katex .katex-html > .newline,
        body.${bodyClass} #${containerId} .katex .overlay,
        body.${bodyClass} #${containerId} .katex svg,
        body.${bodyClass} #${containerId} .katex .stretchy {
          display: block !important;
        }

        body.${bodyClass} #${containerId} .katex .vbox,
        body.${bodyClass} #${containerId} .katex .hbox,
        body.${bodyClass} #${containerId} .katex .thinbox {
          display: inline-flex !important;
        }

        body.${bodyClass} #${containerId} .gv-dr-print-report .katex {
          line-height: 1.2 !important;
        }

        body.${bodyClass} #${containerId} {
          font-family: Georgia, 'Times New Roman', serif;
          color: #000;
          background: #fff;
        }

        @page {
          margin: 2cm;
          size: A4;
        }

        body.${bodyClass} .gv-dr-print-cover-page {
          min-height: calc(297mm - 4cm);
          position: relative;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          page-break-after: always;
          margin: 0;
          padding: 0;
          border: none;
          text-align: center;
        }

        body.${bodyClass} .gv-dr-print-cover-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          max-width: 80%;
          box-sizing: border-box;
        }

        body.${bodyClass} .gv-dr-print-cover-title {
          font-size: ${coverTitlePt}pt;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 1.5em 0;
          color: oklch(0.7227 0.1920 149.5793);
          line-height: 1.2;
          word-wrap: break-word;
        }

        body.${bodyClass} .gv-dr-print-meta {
          font-size: ${metaPt}pt;
          color: #666;
          line-height: 2;
        }

        body.${bodyClass} .gv-dr-print-meta p {
          margin: 0.3em 0;
        }

        body.${bodyClass} .gv-dr-print-meta a {
          color: #666;
          text-decoration: none;
        }

        body.${bodyClass} .gv-dr-print-meta a:after {
          content: none !important;
        }

        body.${bodyClass} .gv-dr-print-content {
          margin: 2em 0;
          line-height: 1.65;
          font-size: ${basePt}pt;
        }

        body.${bodyClass} .gv-dr-print-report p {
          margin: 0.5em 0;
        }

        body.${bodyClass} .gv-dr-print-report img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0.75em 0;
          page-break-inside: avoid;
        }

        ${buildMermaidExportStyles(`body.${bodyClass} .gv-dr-print-report`, {
          containerMaxWidth: true,
          avoidContainerBreak: true,
          diagramSelector: '> img',
          diagramMargin: '0.75em auto',
          avoidDiagramBreak: true,
          preservePrintBackground: true,
          diagramMaxHeight: '160mm',
        })}

        body.${bodyClass} .gv-dr-print-report pre,
        body.${bodyClass} .gv-dr-print-report code {
          font-family: 'Courier New', monospace;
          font-size: ${codePt}pt;
          background: #f5f5f5;
          border-radius: 3px;
        }

        body.${bodyClass} .gv-dr-print-report pre {
          padding: 0.75em;
          border-left: 3px solid #d1d5db;
          overflow-x: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        body.${bodyClass} .gv-dr-print-report .math-inline,
        body.${bodyClass} .gv-dr-print-report .math-block,
        body.${bodyClass} .gv-dr-print-report [data-math] {
          page-break-inside: avoid;
        }

        body.${bodyClass} .gv-dr-print-footer {
          margin-top: 2em;
          padding-top: 1em;
          border-top: 1px solid #ccc;
          font-size: ${footerPt}pt;
          color: #666;
          text-align: center;
        }

        body.${bodyClass} .gv-dr-print-footer p {
          margin: 0.25em 0;
        }

        body.${bodyClass} .gv-dr-print-report sources-carousel-inline,
        body.${bodyClass} .gv-dr-print-report source-inline-chips,
        body.${bodyClass} .gv-dr-print-report source-inline-chip,
        body.${bodyClass} .gv-dr-print-report .source-inline-chip-container {
          display: none !important;
        }

        body.${bodyClass} .gv-dr-print-report a {
          color: #2563eb;
          text-decoration: none;
        }

        body.${bodyClass} .gv-dr-print-report a[href]:after {
          content: " (" attr(href) ")";
          font-size: 9pt;
          color: #666;
        }

        body.${bodyClass}.${safariBodyClass} .gv-dr-print-cover-page {
          min-height: auto !important;
          position: static !important;
          display: block !important;
          padding: 0 0 1.25em 0 !important;
          border-bottom: 1px solid #e5e7eb !important;
          text-align: left !important;
        }

        body.${bodyClass}.${safariBodyClass} .gv-dr-print-cover-content {
          position: static !important;
          top: auto !important;
          left: auto !important;
          transform: none !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        body.${bodyClass}.${safariBodyClass} .gv-dr-print-content {
          break-before: auto !important;
          page-break-before: auto !important;
        }
      }
    `;

  document.head.appendChild(style);
}
