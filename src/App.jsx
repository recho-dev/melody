import "./App.css";
import {useState, useEffect, useRef} from "react";
import {Editor} from "./Editor.jsx";
import {Sketch} from "./Sketch.jsx";
import {Maximize} from "lucide-react";
import {cn} from "./utils.js";

const initialCode = `p.setup = () => {
  p.createCanvas(200, 200);
  p.background("#000");
};
`;

function App() {
  const [code, setCode] = useState(initialCode);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  useEffect(() => {
    const onSliderChange = (event) => {
      const {code} = event.detail;
      if (code) setCode(code);
    };
    window.addEventListener("slider-change", onSliderChange);
    return () => window.removeEventListener("slider-change", onSliderChange);
  }, []);

  useEffect(() => {
    const onColorChange = (event) => {
      const {code} = event.detail;
      if (code) setCode(code);
    };
    window.addEventListener("color-change", onColorChange);
    return () => window.removeEventListener("color-change", onColorChange);
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
      <main className={cn("relative h-[calc(100vh-64px)]", isFullscreen && "h-full", "main")}>
        <div className="h-full w-full">
          <Editor code={code} onSave={onSave} style={{height: "100%"}} isFullscreen={isFullscreen} />
        </div>
        <div className="absolute top-0 right-[50%] z-999">
          <Sketch code={code} key={key} />
        </div>
      </main>
    </div>
  );
}

export default App;
