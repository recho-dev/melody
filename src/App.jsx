import "./App.css";
import {useState, useEffect, useRef} from "react";
import {Editor} from "./Editor.jsx";
import {Sketch} from "./Sketch.jsx";
import {createPiano} from "./createPiano.js";
import {Maximize} from "lucide-react";

const initialCode = `function setup() {
  createCanvas(200, 200);
  background(0);
  circle(100, 100, 50);
}`;

function App() {
  const [code, setCode] = useState(initialCode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pianoRef = useRef(null);
  const vizRef = useRef(null);
  const appRef = useRef(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) appRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

  function onSave(code) {
    setCode(code);
  }

  function onKeyDown(code) {
    pianoRef.current.play();
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
    if (!pianoRef.current && vizRef.current) {
      pianoRef.current = createPiano({parent: vizRef.current});
    }
  }, []);

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
      <header className="h-[64px] gh-header gh-box-shadow gh-text-primary flex items-center justify-between">
        <h1 className="ml-4 font-bold"> Recho Melody </h1>
        {!isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="mr-4 p-2 hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
            aria-label="Toggle fullscreen"
          >
            <Maximize className="w-5 h-5" />
          </button>
        )}
      </header>
      <main className="flex h-[calc(100vh-64px)]">
        <div className="h-full w-1/2">
          <div ref={vizRef} className="h-[50px] gh-border-bottom"></div>
          <div className="py-2 h-full">
            <Editor code={code} onSave={onSave} onKeyDown={onKeyDown} style={{height: "100%"}} />
          </div>
        </div>
        <div className="h-full w-1/2 gh-border-left">
          <Sketch code={code} />
        </div>
      </main>
    </div>
  );
}

export default App;
