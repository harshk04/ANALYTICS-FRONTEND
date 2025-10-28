"use client";
import { useEffect, useMemo, useRef } from "react";

export function HTMLRender({ html, className = "", height, isTextContent = false }: { html: string; className?: string; height?: number; isTextContent?: boolean }) {
  // Check if content contains charts, graphs, or interactive elements
  const hasInteractiveContent = useMemo(() => {
    return html.includes('plotly') || 
           html.includes('chart') || 
           html.includes('graph') || 
           html.includes('svg') || 
           html.includes('canvas') ||
           html.includes('script') ||
           html.includes('iframe') ||
           html.includes('table') ||
           html.includes('img');
  }, [html]);

  const srcDoc = useMemo(() => {
    const isLightTheme = document.documentElement.classList.contains('light-theme');
    const textColor = isLightTheme ? '#111827' : '#fff';
    const borderColor = isLightTheme ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';
    const headerBg = isLightTheme ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)';
    
    return `<!doctype html><html><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /><style>
      html,body{margin:0;padding:0;background:transparent;color:${textColor};font-family:system-ui,-apple-system,sans-serif}
      *,*:before,*:after{box-sizing:border-box}
      .plotly{width:100%!important;height:auto!important}
      .js-plotly-plot{width:100%!important;height:auto!important}
      svg{max-width:100%;height:auto}
      img{max-width:100%;height:auto}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid ${borderColor};padding:8px;text-align:left}
      th{background:${headerBg}}
    </style></head><body>${html}</body></html>`;
  }, [html]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    function adjust() {
      try {
        const doc = iframe?.contentDocument;
        const body = doc?.body;
        const root = doc?.documentElement;
        const contentHeight = Math.max(
          body?.scrollHeight || 0,
          body?.offsetHeight || 0,
          root?.clientHeight || 0,
          root?.scrollHeight || 0,
          root?.offsetHeight || 0
        );
        if (contentHeight) {
          const min = typeof height === "number" ? height : 0;
          if (iframe?.style) {
            iframe.style.height = Math.max(contentHeight, min) + "px";
          }
        }
      } catch {}
    }
    const onLoad = () => {
      adjust();
      // Adjust again after render
      setTimeout(adjust, 50);
      setTimeout(adjust, 200);
    };
    iframe.addEventListener("load", onLoad);
    // Try adjust in case it's already loaded via srcDoc
    onLoad();
    return () => {
      iframe.removeEventListener("load", onLoad);
    };
  }, [srcDoc, height]);

  // For text content, render directly without iframe
  if (isTextContent || (!hasInteractiveContent && html.trim().length < 1000)) {
    return (
      <div 
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ minHeight: height || 'auto' }}
      />
    );
  }

  // For interactive content (charts, graphs, etc.), use iframe
  return (
    <iframe
      ref={iframeRef}
      className={"w-full rounded-md border border-white/10 bg-transparent dark:border-white/10 light:border-gray-200/60 " + className}
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-same-origin"
      style={{ minHeight: height || 'auto' }}
    />
  );
}


