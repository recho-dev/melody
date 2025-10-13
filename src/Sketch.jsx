import {useEffect, useRef} from "react";

export function Sketch({code}) {
  const sketchRef = useRef(null);

  useEffect(() => {
    if (!sketchRef.current) return;
    sketchRef.current.innerHTML = "";
    const iframe = document.createElement("iframe");
    sketchRef.current.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.jsdelivr.net/npm/p5@1.11.10/lib/p5.js"></script>
      </head>
      <style>
        body {
          margin: 0;
          padding: 0;
        }
        canvas {
          margin: 0;
          padding: 0;
        }
      </style>
      <body>
        <script>
      ${code}
        </script>
      </body>
    </html>`);
    doc.close();
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
  }, [code]);

  return <div ref={sketchRef} className="w-full h-full" />;
}
