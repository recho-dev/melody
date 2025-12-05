import "./App.css";
import {useState, useEffect, useRef} from "react";
import {Editor} from "./Editor.jsx";
import {Sketch} from "./Sketch.jsx";
import {Maximize} from "lucide-react";
import {cn} from "./utils.js";
import Draggable from "react-draggable";

const initialCode = `p.setup = () => {
  p.createCanvas(200, 200);
  p.background("#000");
};
`;

function App() {
  const [code, setCode] = useState(initialCode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [key, setKey] = useState(0);
  const [isCmdPressed, setIsCmdPressed] = useState(false);
  const [isHoveringSketch, setIsHoveringSketch] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const appRef = useRef(null);
  const draggableNodeRef = useRef(null);

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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.metaKey || event.key === "Meta") {
        setIsCmdPressed(true);
      }
    };
    const handleKeyUp = (event) => {
      if (!event.metaKey && event.key === "Meta") {
        setIsCmdPressed(false);
      }
    };
    const handleBlur = () => {
      setIsCmdPressed(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
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
        <Draggable
          nodeRef={draggableNodeRef}
          disabled={!isCmdPressed}
          defaultPosition={{x: 0, y: 0}}
          onStart={() => setIsDragging(true)}
          onStop={() => setIsDragging(false)}
          onDrag={() => {
            window.dispatchEvent(new CustomEvent("sketch-drag"));
          }}
        >
          <div
            ref={draggableNodeRef}
            className="absolute top-0 right-[50%] z-999"
            style={{
              cursor: isDragging
                ? "grabbing"
                : isCmdPressed && isHoveringSketch
                ? "grab"
                : "default",
            }}
            onMouseEnter={() => setIsHoveringSketch(true)}
            onMouseLeave={() => setIsHoveringSketch(false)}
          >
            <Sketch code={code} key={key} />
          </div>
        </Draggable>
      </main>
    </div>
  );
}

export default App;
