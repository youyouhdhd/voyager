import { isSafari } from '@/core/utils/browser';

import {
  deepResearchPrintElements,
  injectDeepResearchPrintStyles,
} from './deepResearchPrintStyles';
import { isolateMermaidSvgImages } from './mermaidSvgImage';

export interface PrintableDocumentContent {
  title: string;
  url: string;
  exportedAt: string;
  markdown: string;
  html: string;
}

/**
 * Dedicated PDF print path for Deep Research reports.
 * Keeps report printing isolated from the regular conversation PDF flow.
 */
export class DeepResearchPDFPrintService {
  private static CLEANUP_FALLBACK_DELAY_MS = 60_000;
  private static INLINE_FETCH_TIMEOUT_MS = 2_000;
  private static INLINE_DECODE_TIMEOUT_MS = 1_000;
  private static cleanupFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private static originalDocumentTitle: string | null = null;

  static async export(
    content: PrintableDocumentContent,
    options?: { fontSize?: number; filename?: string },
  ): Promise<void> {
    this.cleanup();

    const container = this.createPrintContainer(content);
    document.body.appendChild(container);
    injectDeepResearchPrintStyles(options?.fontSize);
    document.body.classList.add(deepResearchPrintElements.bodyClass);

    this.originalDocumentTitle = document.title;
    const title =
      options?.filename?.replace(/\.pdf$/i, '') ||
      this.normalizeTitle(content.title) ||
      'Deep Research Report';
    document.title = title;

    const safari = isSafari();
    const inlineImagesPromise = this.inlineImages(container).catch(() => {
      /* ignore */
    });

    if (safari) {
      document.body.classList.add(deepResearchPrintElements.safariBodyClass);
      this.forceStyleFlush(container);
      this.triggerPrint();
      this.registerCleanupHandlers();
      void inlineImagesPromise;
      return;
    }

    await inlineImagesPromise;
    await this.delay(100);
    this.triggerPrint();
    this.registerCleanupHandlers();
  }

  private static triggerPrint(): void {
    try {
      window.print();
    } catch {
      /* ignore */
    }
  }

  private static forceStyleFlush(container: HTMLElement): void {
    try {
      container.getBoundingClientRect();
    } catch {
      /* ignore */
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.setTimeoutUnref(resolve, ms);
    });
  }

  private static setTimeoutUnref(callback: () => void, ms: number): ReturnType<typeof setTimeout> {
    const handle = setTimeout(callback, ms);
    if (
      typeof handle === 'object' &&
      handle !== null &&
      'unref' in handle &&
      typeof (handle as { unref?: unknown }).unref === 'function'
    ) {
      (handle as { unref: () => void }).unref();
    }
    return handle;
  }

  private static registerCleanupHandlers(): void {
    const cleanupNow = (): void => {
      this.cleanup();
    };

    try {
      window.addEventListener('afterprint', cleanupNow, { once: true });
    } catch {
      /* ignore */
    }

    if (this.cleanupFallbackTimer !== null) {
      clearTimeout(this.cleanupFallbackTimer);
    }

    this.cleanupFallbackTimer = this.setTimeoutUnref(() => {
      this.cleanup();
    }, this.CLEANUP_FALLBACK_DELAY_MS);
  }

  private static cleanup(): void {
    if (this.cleanupFallbackTimer !== null) {
      clearTimeout(this.cleanupFallbackTimer);
      this.cleanupFallbackTimer = null;
    }

    try {
      document.body.classList.remove(deepResearchPrintElements.bodyClass);
      document.body.classList.remove(deepResearchPrintElements.safariBodyClass);
    } catch {
      /* ignore */
    }

    const container = document.getElementById(deepResearchPrintElements.containerId);
    if (container) {
      container.remove();
    }

    const style = document.getElementById(deepResearchPrintElements.stylesId);
    if (style) {
      style.remove();
    }

    if (this.originalDocumentTitle !== null) {
      try {
        document.title = this.originalDocumentTitle;
      } catch {
        /* ignore */
      }
      this.originalDocumentTitle = null;
    }

    // Notify other UI components that printing ended (mirrors PDFPrintService).
    try {
      window.dispatchEvent(new CustomEvent('gv-print-cleanup'));
    } catch {
      /* ignore */
    }
  }

  private static createPrintContainer(content: PrintableDocumentContent): HTMLElement {
    const container = document.createElement('div');
    container.id = deepResearchPrintElements.containerId;
    container.className = 'gv-print-only gv-deep-research-print-only';

    const sanitizedHtml = this.sanitizePrintableHtml(content.html);
    const fallbackText = this.extractPlainTextFromHtml(content.html) || content.markdown.trim();
    const bodyHtml = sanitizedHtml || this.formatPlainTextAsHtml(fallbackText || 'No content');
    const title = this.normalizeTitle(content.title) || 'Deep Research Report';
    const date = this.formatDate(content.exportedAt);

    container.innerHTML = `
      <div class="gv-dr-print-document">
        <div class="gv-dr-print-cover-page">
          <div class="gv-dr-print-cover-content">
            <h1 class="gv-dr-print-cover-title">${this.escapeHTML(title)}</h1>
            <div class="gv-dr-print-meta">
              <p>${this.escapeHTML(date)}</p>
              <p><a href="${this.escapeAttribute(content.url)}">${this.escapeHTML(content.url)}</a></p>
              <p>Deep Research Report</p>
            </div>
          </div>
        </div>
        <div class="gv-dr-print-content">
          <div class="gv-dr-print-report">${bodyHtml}</div>
        </div>
        <div class="gv-dr-print-footer">
          <p>Exported from <a href="https://github.com/voyager-crew/voyager">Voyager</a></p>
          <p>Generated on ${this.escapeHTML(date)}</p>
        </div>
      </div>
    `;

    return container;
  }

  private static sanitizePrintableHtml(html: string): string {
    const trimmed = html.trim();
    if (!trimmed) return '';

    const container = document.createElement('div');
    container.innerHTML = trimmed;
    isolateMermaidSvgImages(container);
    container.querySelectorAll('script, style, template').forEach((element) => element.remove());

    const elements = Array.from(container.querySelectorAll<HTMLElement>('*'));
    elements.forEach((element) => {
      const attributes = Array.from(element.attributes);
      attributes.forEach((attribute) => {
        if (attribute.name.toLowerCase().startsWith('on')) {
          element.removeAttribute(attribute.name);
        }
      });
    });

    return container.innerHTML.trim();
  }

  private static extractPlainTextFromHtml(html: string): string {
    const trimmed = html.trim();
    if (!trimmed) return '';
    const container = document.createElement('div');
    container.innerHTML = trimmed;
    container.querySelectorAll('script, style, template').forEach((element) => element.remove());
    return this.normalizeWhitespace(container.textContent || '');
  }

  private static normalizeWhitespace(text: string): string {
    return text
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private static formatPlainTextAsHtml(text: string): string {
    if (!text.trim()) return '';
    const escaped = this.escapeHTML(text);
    return escaped
      .split('\n\n')
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  private static normalizeTitle(title: string): string {
    return title
      .trim()
      .replace(/\s+-\s+Gemini$/i, '')
      .replace(/\s+-\s+Google Gemini$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static formatDate(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  private static async inlineImages(container: HTMLElement): Promise<void> {
    const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    if (images.length === 0) return;

    const toDataUrl = async (url: string): Promise<string | null> => {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutHandle = this.setTimeoutUnref(() => {
        try {
          controller?.abort();
        } catch {
          /* ignore */
        }
      }, this.INLINE_FETCH_TIMEOUT_MS);

      try {
        const init: RequestInit = { credentials: 'include', mode: 'cors' as RequestMode };
        if (controller) init.signal = controller.signal;
        const response = await fetch(url, init);
        if (!response.ok) return null;
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          try {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('readAsDataURL failed'));
            reader.onload = () => resolve(String(reader.result || ''));
            reader.readAsDataURL(blob);
          } catch (error) {
            reject(error);
          }
        });
        return dataUrl;
      } catch {
        return null;
      } finally {
        clearTimeout(timeoutHandle);
      }
    };

    await Promise.all(
      images.map(async (image) => {
        const src = image.getAttribute('src') || '';
        if (!/^(https?:\/\/|blob:)/i.test(src)) return;
        const dataUrl = await toDataUrl(src);
        if (dataUrl) {
          try {
            image.src = dataUrl;
          } catch {
            /* ignore */
          }
        }
      }),
    );

    type DecodableImage = HTMLImageElement & { decode?: () => Promise<void> };
    await Promise.all(
      images.map(async (image) => {
        const decode = (image as DecodableImage).decode;
        if (typeof decode !== 'function') return;
        try {
          await Promise.race([
            decode.call(image).catch(() => {
              /* ignore */
            }),
            this.delay(this.INLINE_DECODE_TIMEOUT_MS),
          ]);
        } catch {
          /* ignore */
        }
      }),
    );
  }

  private static escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private static escapeAttribute(text: string): string {
    return this.escapeHTML(text).replace(/"/g, '&quot;');
  }
}
