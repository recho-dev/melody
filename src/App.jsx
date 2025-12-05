import "./App.css";
import {useState, useEffect, useRef} from "react";
import {Workspace} from "./Workspace.jsx";
import {Toolbar} from "./Toolbar.jsx";
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
      <Toolbar isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />
      <main className={cn("relative h-[calc(100vh-48px)]", isFullscreen && "h-full", "main overflow-visible")}>
        <Workspace isFullscreen={isFullscreen} />
      </main>
    </div>
  );
}

export default App;
