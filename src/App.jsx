import "./App.css";
import {useState, useEffect, useRef} from "react";
import {Editor} from "./Editor.jsx";
import {Sketch} from "./Sketch.jsx";
import {Maximize} from "lucide-react";
import {cn} from "./utils.js";

const initialCode = `let angle = Math.PI / 6;

p.setup = () => {
  p.createCanvas(200, 200);
  p.background(0);
  p.stroke(255);
  p.translate(p.width / 2, p.height);
  branch(60, 0);
};

function branch(len, rotate) {
  if (len < 10) return;
  p.push();
  p.rotate(rotate);
  p.line(0, -len, 0, 0);
  p.translate(0, -len);
  len *= 0.66;
  branch(len, -angle);
  branch(len, angle);
  p.pop();
}`;

function App() {
  const [code, setCode] = useState(initialCode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [key, setKey] = useState(0);
  const appRef = useRef(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) appRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

  function onSave(code) {
    setCode(code);
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "o" && event.metaKey) {
        event.preventDefault();
        setShowPreview(!showPreview);
        setKey(key + 1);
        if (!showPreview) {
          window.dispatchEvent(new CustomEvent("preview-show"));
        } else {
          window.dispatchEvent(new CustomEvent("preview-hide"));
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showPreview, key]);

  useEffect(() => {
    setKey(key + 1);
  }, [isFullscreen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "s" && event.metaKey) {
        event.preventDefault();
        onSave(code);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [code]);

  useEffect(() => {
    const exitFullscreen = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
      else setIsFullscreen(true);
    };
    window.addEventListener("fullscreenchange", exitFullscreen);
    return () => window.removeEventListener("fullscreenchange", exitFullscreen);
  }, []);

  return (
    <div className="min-h-screen" ref={appRef}>
      {!isFullscreen && (
        <header className="h-[64px] gh-header gh-box-shadow gh-text-primary flex items-center justify-between">
          <h1 className="ml-4 font-bold"> Recho Melody </h1>
          <button
            onClick={toggleFullscreen}
            className="mr-4 p-2 hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
            aria-label="Toggle fullscreen"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </header>
      )}
      <main className={cn("flex h-[calc(100vh-64px)]", isFullscreen && "h-full", "main")}>
        <div className="h-full w-1/2 relative pt-2">
          <Editor code={code} onSave={onSave} style={{height: "100%"}} isFullscreen={isFullscreen} />
        </div>
        <div
          className={cn(
            showPreview
              ? `w-full absolute ${
                  isFullscreen ? "top-0" : "top-[64px]"
                } left-0 bottom-0 right-0 flex gh-bg-secondary z-999`
              : "h-full w-1/2 gh-border-left p-2"
          )}
        >
          <Sketch code={code} key={key} />
        </div>
      </main>
    </div>
  );
}

export default App;
