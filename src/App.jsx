import "./App.css";
import {useState, useEffect, useRef} from "react";
import {Workspace} from "./Workspace.jsx";
import {Toolbar} from "./Toolbar.jsx";
import {Instructions} from "./Instructions.jsx";
import {cn} from "./utils.js";
import {getAllSketches, getActiveSketchId, getLastActiveSketch} from "./utils/storage.js";

function App() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [currentSketchId, setCurrentSketchId] = useState(() => {
    const activeId = getActiveSketchId();
    if (activeId) return activeId;
    const lastActive = getLastActiveSketch();
    return lastActive?.id || null;
  });
  const [sketches, setSketches] = useState(() => getAllSketches());
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

  // Refresh sketches list when it might have changed
  useEffect(() => {
    const refreshSketches = () => {
      setSketches(getAllSketches());
    };

    // Refresh periodically and on focus
    const interval = setInterval(refreshSketches, 1000);
    window.addEventListener("focus", refreshSketches);
    window.addEventListener("storage", refreshSketches); // Listen for localStorage changes from other tabs

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshSketches);
      window.removeEventListener("storage", refreshSketches);
    };
  }, []);

  const handleSketchChange = (sketchId) => {
    setCurrentSketchId(sketchId);
    setSketches(getAllSketches()); // Refresh list
  };

  const handleNewSketch = (sketchId) => {
    setCurrentSketchId(sketchId);
    setSketches(getAllSketches()); // Refresh list
  };

  const handleSketchesChange = () => {
    setSketches(getAllSketches()); // Refresh list after deletion
  };

  return (
    <div className="min-h-screen" ref={appRef}>
      <Toolbar
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        sketches={sketches}
        currentSketchId={currentSketchId}
        onNewSketch={handleNewSketch}
        onSelectSketch={handleSketchChange}
        onSketchesChange={handleSketchesChange}
        onToggleInstructions={() => setIsInstructionsOpen(!isInstructionsOpen)}
        autoPlay={autoPlay}
        onToggleAutoPlay={() => {
          setAutoPlay(!autoPlay);
          window.dispatchEvent(
            new CustomEvent("auto-play-toggle", {
              detail: {enabled: !autoPlay},
            })
          );
        }}
      />
      <main className={cn("relative h-[calc(100vh-48px)]", isFullscreen && "h-full", "main overflow-visible")}>
        <Workspace isFullscreen={isFullscreen} currentSketchId={currentSketchId} onSketchChange={handleSketchChange} />
      </main>
      <Instructions
        isFullscreen={isFullscreen}
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
      />
    </div>
  );
}

export default App;
