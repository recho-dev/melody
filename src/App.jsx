import "./App.css";
import {useState, useEffect, useRef} from "react";
import {Workspace} from "./Workspace.jsx";
import {Maximize} from "lucide-react";
import {cn} from "./utils.js";

function App() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const appRef = useRef(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) appRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

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
        <header className="h-[48px] gh-header gh-text-primary flex items-center justify-between border-b border-dashed border-gray-600">
          <h1 className="ml-3 font-bold"> Recho Melody </h1>
          <button
            onClick={toggleFullscreen}
            className="mr-4 p-2 hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
            aria-label="Toggle fullscreen"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </header>
      )}
      <main className={cn("relative h-[calc(100vh-48px)]", isFullscreen && "h-full", "main overflow-visible")}>
        <Workspace isFullscreen={isFullscreen} />
      </main>
    </div>
  );
}

export default App;
