// import {useEffect, useRef, useState} from "react";

// function ErrorDisplay({error}) {
//   return (
//     <div className="p-4 text-red-700">
//       <h3 className="font-bold mb-2">Error</h3>
//       <pre className="whitespace-pre-wrap font-mono text-sm">{error.toString()}</pre>
//     </div>
//   );
// }

// export function Sketch({code}) {
//   const sketchRef = useRef(null);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     setError(null);
//   }, [code]);

//   useEffect(() => {
//     if (!sketchRef.current) return;

//     sketchRef.current.innerHTML = "";
//     const iframe = document.createElement("iframe");
//     iframe.style.width = "100%";
//     iframe.style.height = "100%";
//     iframe.style.border = "none";
//     sketchRef.current.appendChild(iframe);

//     const doc = iframe.contentDocument || iframe.contentWindow.document;

//     const messageHandler = (event) => {
//       if (event.data?.type === "iframe-error") {
//         setError(new Error(event.data.message || event.data.reason || "Unknown error"));
//         window.dispatchEvent(new CustomEvent("sketch-error", {detail: event.data}));
//       }
//       if (event.data?.type === "iframe-ready") {
//         window.dispatchEvent(new CustomEvent("sketch-ready"));
//       }
//     };
//     window.addEventListener("message", messageHandler);

//     doc.open();
//     doc.write(`
//       <!DOCTYPE html>
//       <html lang="en">
//         <head>
//           <meta charset="UTF-8" />
//           <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//           <script>
//             window.addEventListener('error', (e) => {
//               window.parent.postMessage({
//                 type: 'iframe-error',
//                 message: e.message,
//                 filename: e.filename,
//                 lineno: e.lineno,
//                 colno: e.colno
//               }, '*');
//             });
//             window.addEventListener('unhandledrejection', (e) => {
//               window.parent.postMessage({
//                 type: 'iframe-error',
//                 reason: e.reason
//               }, '*');
//             });
//           </script>
//           <script src="https://cdn.jsdelivr.net/npm/p5@1.11.10/lib/p5.js"></script>
//           <style>
//             * {
//               margin: 0;
//               padding: 0;
//             }
//           </style>
//         </head>
//         <body>
//           <script>
//             try {
//               ${code}
//               window.parent.postMessage({ type: 'iframe-ready' }, '*');
//             } catch (err) {
//               window.parent.postMessage({ type: 'iframe-error', message: err.message }, '*');
//             }
//           </script>
//         </body>
//       </html>
//     `);
//     doc.close();

//     return () => {
//       window.removeEventListener("message", messageHandler);
//       iframe.remove();
//     };
//   }, [code]);

//   return (
//     <>
//       {error && <ErrorDisplay error={error} />}
//       <div ref={sketchRef} className="w-full h-full" />;
//     </>
//   );
// }
import {useEffect, useRef, useState} from "react";
import p5 from "p5";

p5.disableFriendlyErrors = true;

function evalP5Code(parent, code) {
  const sketch = new p5(eval(`(p) => { ${code}}`), parent);
  return sketch;
}

export function Sketch({code}) {
  const sketchRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sketchRef.current) return;
    sketchRef.current.innerHTML = "";
    setError(null);

    try {
      const parent = document.createElement("div");
      sketchRef.current.appendChild(parent);
      p5InstanceRef.current = evalP5Code(parent, code);
    } catch (err) {
      console.error("Error executing sketch code:", err);
      setError(err.message || "An error occurred");
    }

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [code]);

  return (
    <>
      <div ref={sketchRef}></div>
      {error && (
        <div
          style={{
            padding: "16px",
            margin: "16px",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            color: "#c00",
            fontFamily: "monospace",
            fontSize: "14px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
    </>
  );
}
