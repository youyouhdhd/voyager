const FRAME_POLICY =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; form-action 'none'; base-uri 'none'";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

// This function runs inside an opaque iframe and must have no module dependencies.
function rasterizePreview(targetOrigin: string, maxBytes: number): void {
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      window.setTimeout(async () => {
        const reply = (image: ArrayBuffer | null) =>
          window.top?.postMessage(image, targetOrigin, image ? [image] : []);
        try {
          const { body, documentElement: root } = document;
          const width = window.innerWidth;
          const height = Math.min(6000, Math.max(body.scrollHeight, root.scrollHeight));
          const clone = root.cloneNode(true) as HTMLElement;
          const sourceCanvases = root.querySelectorAll('canvas');
          clone.querySelectorAll('canvas').forEach((canvas, index) => {
            const image = document.createElement('img');
            for (const attr of canvas.getAttributeNames())
              image.setAttribute(attr, canvas.getAttribute(attr) ?? '');
            try {
              image.src = sourceCanvases[index].toDataURL();
              canvas.replaceWith(image);
            } catch {
              canvas.remove();
            }
          });
          clone
            .querySelectorAll('meta, link, script, iframe, object, embed, noscript, title')
            .forEach((element) => element.remove());
          const style = document.createElement('style');
          style.textContent =
            'html,body{overflow:visible!important}*,*::before,*::after{animation:none!important;transition:none!important}';
          clone.querySelector('head')?.append(style);
          const markup = new XMLSerializer().serializeToString(clone);
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${markup}</foreignObject></svg>`;
          const image = new Image();
          image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
          await image.decode();
          const scale = Math.min(2, Math.sqrt(10_000_000 / (width * height)));
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(width * scale);
          canvas.height = Math.floor(height * scale);
          const context = canvas.getContext('2d');
          if (!context) return reply(null);
          context.fillStyle = 'white';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          // Canvas.toBlob can defer encoding while Chrome is idle-throttling this offscreen frame.
          const encoded = canvas.toDataURL('image/png').split(',', 2)[1];
          if (!encoded || encoded.length > Math.ceil(maxBytes / 3) * 4) return reply(null);
          const binary = atob(encoded);
          const png = Uint8Array.from(binary, (char) => char.charCodeAt(0));
          reply(png.byteLength <= maxBytes ? png.buffer : null);
        } catch {
          reply(null);
        }
      }, 150);
    },
    { once: true },
  );
}

export function renderGeminiPreviewImage(html: string): Promise<Uint8Array | undefined> {
  return new Promise((resolve) => {
    const outer = document.createElement('iframe');
    outer.setAttribute('sandbox', 'allow-scripts');
    outer.setAttribute('aria-hidden', 'true');
    outer.tabIndex = -1;
    outer.style.cssText =
      'position:fixed;left:-12000px;top:0;width:1120px;height:760px;border:0;pointer-events:none';
    const inner = document.createElement('iframe');
    inner.setAttribute('sandbox', 'allow-scripts');
    inner.style.cssText = 'display:block;width:100%;height:760px;border:0';
    const source = html
      .replace(/^\s*<!doctype[^>]*>/i, '')
      .replace(/<script\b[^>]*\bdata-bard-client-injected\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
    const finish = (image?: Uint8Array) => {
      window.clearTimeout(timer);
      window.removeEventListener('message', receive);
      outer.remove();
      resolve(image);
    };
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== 'null' || event.source !== outer.contentWindow?.[0]) return;
      const data = event.data;
      if (
        !(data instanceof ArrayBuffer) ||
        data.byteLength < 8 ||
        data.byteLength > MAX_IMAGE_BYTES
      )
        return finish();
      const signature = new DataView(data).getBigUint64(0);
      finish(signature === 0x89504e470d0a1a0an ? new Uint8Array(data) : undefined);
    };
    const timer = window.setTimeout(finish, 4500);
    window.addEventListener('message', receive);
    try {
      inner.srcdoc = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${FRAME_POLICY}; frame-src 'none'"><script>(${rasterizePreview.toString()})(${JSON.stringify(location.origin)},${MAX_IMAGE_BYTES});</script>${source}`;
      // The outer policy also blocks navigation attempts from the generated inner document.
      outer.srcdoc = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${FRAME_POLICY}; frame-src about:"><style>body{margin:0}</style>${inner.outerHTML}`;
      document.body.append(outer);
    } catch {
      finish();
    }
  });
}
