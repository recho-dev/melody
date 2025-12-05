import {useEffect, useRef, useState} from "react";
import p5 from "p5";

p5.disableFriendlyErrors = true;

function ErrorDisplay({error}) {
  return (
    <div className="absolute top-4 left-4 p-4 text-red-700 rounded pointer-events-auto z-20 max-w-md w-[50vw]">
      <h3 className="font-bold mb-2">Error</h3>
      <pre className="whitespace-pre-wrap font-mono text-sm">{error.toString()}</pre>
    </div>
  );
}

function evalP5Code(parent, code) {
  const sketch = new p5(eval(`(p) => { ${code}}`), parent);
  return sketch;
}

export function Sketch({code}) {
  const sketchRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState({width: 0, height: 0});

  useEffect(() => {
    if (!sketchRef.current) return;
    sketchRef.current.innerHTML = "";
    setError(null);

    try {
      const parent = document.createElement("div");
      sketchRef.current.appendChild(parent);
      p5InstanceRef.current = evalP5Code(parent, code);
      window.dispatchEvent(new CustomEvent("sketch-ready"));

      // Observe canvas size changes
      const observer = new MutationObserver(() => {
        const canvas = parent.querySelector("canvas");
        if (canvas) {
          setDimensions({
            width: canvas.width,
            height: canvas.height,
          });
          observer.disconnect();

          // Watch for canvas resize
          const resizeObserver = new ResizeObserver(() => {
            setDimensions({
              width: canvas.width,
              height: canvas.height,
            });
          });
          resizeObserver.observe(canvas);

          // Store for cleanup
          parent._resizeObserver = resizeObserver;
        }
      });
      observer.observe(parent, {childList: true, subtree: true});

      // Store for cleanup
      parent._mutationObserver = observer;
    } catch (err) {
      console.error("Error executing sketch code:", err);
      setError(err.message || "An error occurred");
      window.dispatchEvent(new CustomEvent("sketch-error", {detail: err}));
    }

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
      // Cleanup observers
      const parent = sketchRef.current?.firstChild;
      if (parent) {
        parent._mutationObserver?.disconnect();
        parent._resizeObserver?.disconnect();
      }
    };
  }, [code]);

  return (
    <>
      <div
        ref={sketchRef}
        className="absolute top-0 left-0"
        style={{
          background: "transparent",
          width: dimensions.width > 0 ? `${dimensions.width}px` : "auto",
          height: dimensions.height > 0 ? `${dimensions.height}px` : "auto",
        }}
      ></div>
      {error && <ErrorDisplay error={error} />}
    </>
  );
}
