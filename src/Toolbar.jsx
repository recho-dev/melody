import {useState, useEffect, useRef} from "react";
import {Maximize, Trash2, Github, HelpCircle} from "lucide-react";
import {Tooltip} from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import {
  getAllSketches,
  createNewSketch,
  generateSketchId,
  setActiveSketchId,
  deleteSketch,
  INITIAL_CODE,
} from "./utils/storage.js";
import {cn} from "./utils.js";

export function Toolbar({
  isFullscreen,
  onToggleFullscreen,
  sketches,
  currentSketchId,
  onNewSketch,
  onSelectSketch,
  onSketchesChange,
  onToggleInstructions,
  autoPlay,
  onToggleAutoPlay,
  vimMode,
  onToggleVimMode,
}) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const popupRef = useRef(null);
  const buttonRef = useRef(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isPopupOpen &&
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsPopupOpen(false);
      }
    };

    if (isPopupOpen && !isFullscreen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isPopupOpen, isFullscreen]);

  const handleNewSketch = () => {
    const initialX = typeof window !== "undefined" ? window.innerWidth / 2 : 0;
    const initialY = 0;
    const newSketch = createNewSketch([
      {
        id: generateSketchId(),
        name: "Canvas 1",
        code: INITIAL_CODE,
        position: {x: initialX, y: initialY},
      },
    ]);
    setActiveSketchId(newSketch.id);
    if (onNewSketch) {
      onNewSketch(newSketch.id);
    }
    if (onSketchesChange) {
      onSketchesChange();
    }
  };

  const handleOpenClick = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  const handleSketchClick = (sketchId) => {
    if (sketchId && onSelectSketch) {
      setActiveSketchId(sketchId);
      onSelectSketch(sketchId);
    }
    setIsPopupOpen(false);
  };

  const handleDeleteSketch = (e, sketchId) => {
    e.stopPropagation();
    const sketchToDelete = sketches.find((s) => s.id === sketchId);
    const sketchName = sketchToDelete?.name || "this sketch";
    if (!window.confirm(`Are you sure you want to delete "${sketchName}"?`)) return;

    deleteSketch(sketchId);

    // If we deleted the current sketch, switch to another one
    if (sketchId === currentSketchId) {
      const remainingSketches = getAllSketches();
      if (remainingSketches.length > 0) {
        const newActiveId = remainingSketches[0].id;
        setActiveSketchId(newActiveId);
        if (onSelectSketch) {
          onSelectSketch(newActiveId);
        }
      }
    }

    if (onSketchesChange) {
      onSketchesChange();
    }
    setIsPopupOpen(false);
  };

  if (isFullscreen) return null;

  // Get current sketch name
  const currentSketch = sketches?.find((s) => s.id === currentSketchId);
  const currentSketchName = currentSketch?.name || "";

  return (
    <>
      <header className="h-[48px] gh-header gh-text-primary flex items-center justify-between border-b border-dashed border-gray-600">
        <div className="flex items-center gap-3 ml-3 relative">
          <h1 className="font-bold">Recho Melody</h1>
          <div className="flex items-center ml-2 gap-2">
            <button
              onClick={handleNewSketch}
              className="px-2 py-1.5 hover:bg-gray-800 rounded-md transition-colors cursor-pointer text-sm"
              aria-label="New sketch"
            >
              New
            </button>
            <button
              ref={buttonRef}
              onClick={handleOpenClick}
              className="px-2 py-1.5 hover:bg-gray-800 rounded-md transition-colors cursor-pointer text-sm"
              aria-label="Open sketch"
            >
              Open
            </button>
            {currentSketchName && <span className="text-sm text-gray-400 px-2">{currentSketchName}</span>}

            {/* Popup for sketches list */}
            {isPopupOpen && (
              <div
                ref={popupRef}
                className="absolute top-full left-0 mt-2 bg-[#0d1117] border border-gray-600 rounded-md shadow-lg z-50 min-w-[300px] max-w-[400px] max-h-[400px] overflow-y-auto"
              >
                {sketches && sketches.length > 0 ? (
                  <div className="py-2">
                    {sketches.map((sketch) => (
                      <div
                        key={sketch.id}
                        onClick={() => handleSketchClick(sketch.id)}
                        className={cn(
                          "flex items-center justify-between px-4 py-2 hover:bg-gray-800 cursor-pointer transition-colors",
                          currentSketchId === sketch.id && "bg-gray-800"
                        )}
                      >
                        <span className="text-sm truncate flex-1">{sketch.name}</span>
                        <button
                          onClick={(e) => handleDeleteSketch(e, sketch.id)}
                          className="ml-2 p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                          aria-label={`Delete ${sketch.name}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">No sketches</div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mr-4">
          {/* Auto-play toggle */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-gray-400">Auto</span>
            <button
              onClick={onToggleAutoPlay}
              data-tooltip-id="auto-play-tooltip"
              data-tooltip-content="Auto-play piano notes while typing or interacting"
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:ring-offset-2 focus:ring-offset-[#0d1117]",
                autoPlay ? "bg-[#58a6ff]" : "bg-gray-600"
              )}
              aria-label="Toggle auto-play"
              role="switch"
              aria-checked={autoPlay}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  autoPlay ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
            <Tooltip id="auto-play-tooltip" place="bottom" style={{zIndex: 10000}} />
          </div>
          {/* Vim mode toggle */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-gray-400">Vim</span>
            <button
              onClick={onToggleVimMode}
              data-tooltip-id="vim-mode-tooltip"
              data-tooltip-content="Enable Vim key bindings in the editor"
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:ring-offset-2 focus:ring-offset-[#0d1117]",
                vimMode ? "bg-[#58a6ff]" : "bg-gray-600"
              )}
              aria-label="Toggle vim mode"
              role="switch"
              aria-checked={vimMode}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  vimMode ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
            <Tooltip id="vim-mode-tooltip" place="bottom" style={{zIndex: 10000}} />
          </div>
          <button
            onClick={onToggleInstructions}
            className="p-2 hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
            aria-label="Open instructions"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleFullscreen}
            className="p-2 hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
            aria-label="Toggle fullscreen"
          >
            <Maximize className="w-5 h-5" />
          </button>
          <a
            href="https://github.com/recho-dev/melody"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
            aria-label="GitHub repository"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </header>
    </>
  );
}
