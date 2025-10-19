import "./App.css";
import {useState, useEffect, useRef} from "react";
import {Editor} from "./Editor.jsx";
import {Sketch} from "./Sketch.jsx";
import {Maximize} from "lucide-react";
import {cn} from "./utils.js";

const initialCode = `function setup() {
  createCanvas(200, 200);
  background(0);
  circle(100, 100, 50);
}`;

function App() {
  const [code, setCode] = useState(initialCode);
  const [isFullscreen, setIsFullscreen] = useState(false);
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
        <div className="h-full w-1/2 gh-border-left p-2">
          <Sketch code={code} />
        </div>
      </main>
    </div>
  );
}

export default App;
