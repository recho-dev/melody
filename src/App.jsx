import "./App.css";
import {useState, useEffect, useRef} from "react";
import {Editor} from "./Editor.jsx";
import {Sketch} from "./Sketch.jsx";
import {Maximize, Plus, X} from "lucide-react";
import {cn} from "./utils.js";
import Draggable from "react-draggable";

const initialCode = `p.setup = () => {
  p.createCanvas(200, 200);
  p.background("#000");
};
`;

function uid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function App() {
  const initialX = window.innerWidth / 2;
  const initialY = 0;
  const [files, setFiles] = useState(() => {
    return [
      {
        id: uid(),
        name: "Canvas 1",
        code: initialCode,
        position: {x: initialX, y: initialY},
      },
    ];
  });
  const [activeFileId, setActiveFileId] = useState(files[0].id);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCmdPressed, setIsCmdPressed] = useState(false);
  const [hoveringSketchIds, setHoveringSketchIds] = useState(new Set());
  const [draggingSketchIds, setDraggingSketchIds] = useState(new Set());
  const appRef = useRef(null);
  const sketchRefs = useRef({});
  const currentEditorContent = useRef(""); // Store current editor content without triggering

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) appRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

  function onSave(code) {
    // Update file.code which triggers sketch rerun
    setFiles((prevFiles) => prevFiles.map((file) => (file.id === activeFileId ? {...file, code} : file)));
    currentEditorContent.current = code; // Also update the ref
  }

  function addNewFile() {
    // Save current editor content before adding new file
    if (currentEditorContent.current) {
      setFiles((prevFiles) =>
        prevFiles.map((file) => (file.id === activeFileId ? {...file, code: currentEditorContent.current} : file))
      );
    }

    // Position new sketches in a staggered pattern
    const newId = uid();
    const offset = files.length * 60;
    const newFile = {
      id: newId,
      name: `Canvas ${files.length + 1}`,
      code: initialCode,
      position: {x: initialX + offset, y: initialY + offset},
    };
    setFiles((prevFiles) => [...prevFiles, newFile]);

    // Set active file id after files are updated to display the new file
    setTimeout(() => {
      setActiveFileId(newId);
      // Manually update editor with new file's code
      window.dispatchEvent(
        new CustomEvent("editor-code-update", {
          detail: {code: initialCode},
        })
      );
      currentEditorContent.current = initialCode;
    }, 10);
  }

  function deleteFile(fileId) {
    if (files.length === 1) return; // Don't delete the last file

    // Confirm deletion
    const fileToDelete = files.find((f) => f.id === fileId);
    const fileName = fileToDelete?.name || "this file";
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    setFiles((prevFiles) => prevFiles.filter((f) => f.id !== fileId));
    // Clean up ref
    delete sketchRefs.current[fileId];
    if (activeFileId === fileId) {
      const remainingFiles = files.filter((f) => f.id !== fileId);
      const newActiveFileId = remainingFiles[0]?.id || "";
      setActiveFileId(newActiveFileId);
      // Manually update editor with new active file's code
      if (newActiveFileId) {
        const newActiveFile = remainingFiles[0];
        window.dispatchEvent(
          new CustomEvent("editor-code-update", {
            detail: {code: newActiveFile.code},
          })
        );
        currentEditorContent.current = newActiveFile.code;
      }
    }
  }

  function updateFilePosition(fileId, position) {
    setFiles((prevFiles) => prevFiles.map((file) => (file.id === fileId ? {...file, position} : file)));
  }

  function switchFile(fileId) {
    // Save current editor content before switching
    if (currentEditorContent.current) {
      setFiles((prevFiles) =>
        prevFiles.map((file) => (file.id === activeFileId ? {...file, code: currentEditorContent.current} : file))
      );
    }
    setActiveFileId(fileId);
    // Manually update editor with new file's code
    const newFile = files.find((f) => f.id === fileId);
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("editor-code-update", {
          detail: {code: newFile.code},
        })
      );
      currentEditorContent.current = newFile.code;
    }, 10);
  }

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
      if (code) {
        setFiles((prevFiles) => prevFiles.map((file) => (file.id === activeFileId ? {...file, code} : file)));
      }
    };
    window.addEventListener("slider-change", onSliderChange);
    return () => window.removeEventListener("slider-change", onSliderChange);
  }, [activeFileId]);

  useEffect(() => {
    const onColorChange = (event) => {
      const {code} = event.detail;
      if (code) {
        setFiles((prevFiles) => prevFiles.map((file) => (file.id === activeFileId ? {...file, code} : file)));
      }
    };
    window.addEventListener("color-change", onColorChange);
    return () => window.removeEventListener("color-change", onColorChange);
  }, [activeFileId]);

  // Track editor content changes in real-time (store in ref, don't update file.code to avoid sketch rerun)
  useEffect(() => {
    const onEditorContentChange = (event) => {
      const {code} = event.detail;
      if (code !== undefined) {
        currentEditorContent.current = code; // Store in ref only, don't update file.code
      }
    };
    window.addEventListener("editor-content-change", onEditorContentChange);
    return () => window.removeEventListener("editor-content-change", onEditorContentChange);
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
        {/* Tab Bar */}
        <div className="flex items-center gap-1 py-1 overflow-x-auto">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-t-md cursor-pointer transition-colors",
                activeFileId === file.id
                  ? "bg-[#0d1117] text-white border-b-1 border-white"
                  : "bg-transparent text-gray-400 hover:text-white hover:bg-gray-800"
              )}
              onClick={() => switchFile(file.id)}
            >
              <span className="text-sm whitespace-nowrap">{file.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFile(file.id);
                }}
                className="ml-1 p-0.5 hover:bg-gray-700 rounded transition-colors"
                disabled={files.length === 1}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={addNewFile}
            className="ml-1 p-1.5 hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
            aria-label="Add new file"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="h-[calc(100%-40px)] w-full relative" style={{zIndex: 1}}>
          <Editor code={activeFile.code} onSave={onSave} style={{height: "100%"}} isFullscreen={isFullscreen} />

          {/* Render all sketches */}
          {files.map((file) => {
            if (!sketchRefs.current[file.id]) {
              sketchRefs.current[file.id] = {current: null};
            }
            const isHovering = hoveringSketchIds.has(file.id);
            const isDragging = draggingSketchIds.has(file.id);
            return (
              <Draggable
                key={file.id}
                nodeRef={sketchRefs.current[file.id]}
                disabled={!isCmdPressed}
                position={file.position}
                onStart={(e, data) => {
                  setDraggingSketchIds((prev) => new Set(prev).add(file.id));
                  // Switch to this file when dragging starts
                  if (activeFileId !== file.id) {
                    switchFile(file.id);
                  }
                }}
                onStop={(e, data) => {
                  setDraggingSketchIds((prev) => {
                    const next = new Set(prev);
                    next.delete(file.id);
                    return next;
                  });
                  updateFilePosition(file.id, {x: data.x, y: data.y});
                }}
                onDrag={() => {
                  window.dispatchEvent(new CustomEvent("sketch-drag"));
                }}
              >
                <div
                  ref={sketchRefs.current[file.id]}
                  className="absolute"
                  style={{
                    left: 0,
                    top: 0,
                    zIndex: 1000,
                    cursor: isDragging ? "grabbing" : isCmdPressed && isHovering ? "grab" : "pointer",
                  }}
                  onClick={(e) => {
                    // Only switch on Cmd+click
                    if (e.metaKey && activeFileId !== file.id) {
                      switchFile(file.id);
                    }
                  }}
                  onMouseEnter={() => {
                    setHoveringSketchIds((prev) => new Set(prev).add(file.id));
                  }}
                  onMouseLeave={() => {
                    setHoveringSketchIds((prev) => {
                      const next = new Set(prev);
                      next.delete(file.id);
                      return next;
                    });
                  }}
                >
                  <Sketch code={file.code} />
                </div>
              </Draggable>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default App;
