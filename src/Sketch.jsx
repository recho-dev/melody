import {useEffect, useRef, useState} from "react";

function ErrorDisplay({error}) {
  return (
    <div className="p-4 text-red-700">
      <h3 className="font-bold mb-2">Error</h3>
      <pre className="whitespace-pre-wrap font-mono text-sm">{error.toString()}</pre>
    </div>
  );
}

export function Sketch({code}) {
  const sketchRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sketchRef.current) return;

    // Reset error state
    setError(null);

    sketchRef.current.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    sketchRef.current.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;

    const messageHandler = (event) => {
      if (event.data?.type === "iframe-error") {
        setError(new Error(event.data.message || event.data.reason || "Unknown error"));
      }
    };
    window.addEventListener("message", messageHandler);

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script>
            window.addEventListener('error', (e) => {
              window.parent.postMessage({
                type: 'iframe-error',
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno
              }, '*');
            });
            window.addEventListener('unhandledrejection', (e) => {
              window.parent.postMessage({
                type: 'iframe-error',
                reason: e.reason
              }, '*');
            });
          </script>
          <script src="https://cdn.jsdelivr.net/npm/p5@1.11.10/lib/p5.js"></script>
        </head>
        <body>
          <script>
            try {
              ${code}
            } catch (err) {
              window.parent.postMessage({ type: 'iframe-error', message: err.message }, '*');
            }
          </script>
        </body>
      </html>
    `);
    doc.close();

    return () => {
      window.removeEventListener("message", messageHandler);
      iframe.remove();
    };
  }, [code]);

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return <div ref={sketchRef} className="w-full h-full" />;
}
