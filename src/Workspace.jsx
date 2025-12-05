import {useState, useEffect, useRef, useCallback} from "react";
import {Editor} from "./Editor.jsx";
import {Sketch} from "./Sketch.jsx";
import {Plus, X} from "lucide-react";
import {cn} from "./utils.js";
import Draggable from "react-draggable";
import {
  getLastActiveSketch,
  createNewSketch,
  saveSketch,
  setActiveSketchId,
  getSketch,
  generateSketchId,
  INITIAL_CODE,
} from "./utils/storage.js";
import {pieces} from "./data/index.js";

function uid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function Workspace({isFullscreen, currentSketchId, onSketchChange}) {
  const initialX = typeof window !== "undefined" ? window.innerWidth / 2 : 0;
  const initialY = 0;

  // Initialize sketch helper
  const initializeSketch = (sketchId) => {
    let sketch = null;

    if (sketchId) {
      sketch = getSketch(sketchId);
    }

    if (!sketch) {
      sketch = getLastActiveSketch();
    }

    if (!sketch || !sketch.files || sketch.files.length === 0) {
      // Create a new sketch if none exists
      sketch = createNewSketch([
        {
          id: generateSketchId(),
          name: "Canvas 1",
          code: INITIAL_CODE,
          position: {x: initialX, y: initialY},
        },
      ]);
      setActiveSketchId(sketch.id);
    }

    return sketch;
  };

  const [currentSketch, setCurrentSketch] = useState(() => initializeSketch(currentSketchId));
  const [files, setFiles] = useState(() => {
    const sketchFiles = currentSketch.files || [];
    if (sketchFiles.length === 0) {
      return [
        {
          id: generateSketchId(),
          name: "Canvas 1",
          code: INITIAL_CODE,
          position: {x: initialX, y: initialY},
        },
      ];
    }
    return sketchFiles;
  });
  const [activeFileId, setActiveFileId] = useState(() => {
    const sketchFiles = currentSketch.files || [];
    if (sketchFiles.length === 0) return null;

    // Use saved activeFileId if it exists and is valid, otherwise use first file
    const savedActiveFileId = currentSketch.activeFileId;
    if (savedActiveFileId && sketchFiles.find((f) => f.id === savedActiveFileId)) {
      return savedActiveFileId;
    }
    return sketchFiles[0].id;
  });
  const [isCmdPressed, setIsCmdPressed] = useState(false);
  const [hoveringSketchIds, setHoveringSketchIds] = useState(new Set());
  const [draggingSketchIds, setDraggingSketchIds] = useState(new Set());
  const sketchRefs = useRef({});
  const currentEditorContent = useRef(""); // Store current editor content without triggering
  const saveTimeoutRef = useRef(null);
  const activeFileIdRef = useRef(activeFileId); // Track current activeFileId in ref

  // Piece selection state (declared early to be used in keyboard shortcuts)
  const [selectedPiece, setSelectedPiece] = useState(Object.keys(pieces)[0]);

  // Keep ref in sync with activeFileId state
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  // Auto-save function that saves from ref without triggering rerenders
  const autoSaveFromRef = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      // Create updated files array with current editor content from ref
      const updatedFiles = files.map((file) =>
        file.id === activeFileId ? {...file, code: currentEditorContent.current} : file
      );

      const sketchToSave = {
        ...currentSketch,
        files: updatedFiles,
        activeFileId: activeFileId,
        updatedAt: Date.now(),
      };
      saveSketch(sketchToSave);
      // Don't update currentSketch state to avoid rerenders
    }, 300); // Debounce saves by 300ms
  }, [currentSketch, files, activeFileId]);

  // Auto-save function that debounces saves when files state changes
  const autoSaveFromState = useCallback(() => {
    const timeoutId = setTimeout(() => {
      // Merge latest editor content from ref into files array
      const updatedFiles = files.map((file) =>
        file.id === activeFileId ? {...file, code: currentEditorContent.current} : file
      );

      const sketchToSave = {
        ...currentSketch,
        files: updatedFiles,
        activeFileId: activeFileId,
        updatedAt: Date.now(),
      };
      saveSketch(sketchToSave);
      setCurrentSketch(sketchToSave);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [currentSketch, files, activeFileId]);

  // Initialize editor content on mount and notify parent
  useEffect(() => {
    if (files.length > 0 && activeFileId) {
      const activeFile = files.find((f) => f.id === activeFileId);
      if (activeFile) {
        currentEditorContent.current = activeFile.code || "";
        // Update editor with initial code
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("editor-code-update", {
              detail: {code: activeFile.code || ""},
            })
          );
        }, 10);
      }
    }
    // Notify parent of initial sketch
    if (onSketchChange && currentSketch.id) {
      onSketchChange(currentSketch.id);
    }
  }, []); // Only run on mount

  // Load a different sketch when currentSketchId prop changes
  useEffect(() => {
    if (currentSketchId) {
      if (currentSketchId !== currentSketch.id) {
        const sketch = getSketch(currentSketchId);
        if (sketch) {
          setCurrentSketch(sketch);
          const sketchFiles = sketch.files || [];
          setFiles(sketchFiles);
          if (sketchFiles.length > 0) {
            // Restore the active file ID from the sketch, or use the first file
            const savedActiveFileId = sketch.activeFileId;
            const targetFileId =
              savedActiveFileId && sketchFiles.find((f) => f.id === savedActiveFileId)
                ? savedActiveFileId
                : sketchFiles[0].id;

            setActiveFileId(targetFileId);
            const targetFile = sketchFiles.find((f) => f.id === targetFileId) || sketchFiles[0];
            currentEditorContent.current = targetFile.code || "";
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("editor-code-update", {
                  detail: {code: targetFile.code || ""},
                })
              );
            }, 10);
          }
          setActiveSketchId(sketch.id);
        }
      }
    }
  }, [currentSketchId, currentSketch.id]);

  // Auto-save whenever files state changes (only for non-editor changes like slider/color)
  useEffect(() => {
    return autoSaveFromState();
  }, [autoSaveFromState]);

  function onSave(code) {
    // Get the current activeFileId from ref to avoid stale closure
    const currentActiveFileId = activeFileIdRef.current;

    // Update file.code which triggers sketch rerun
    setFiles((prevFiles) => {
      const updatedFiles = prevFiles.map((file) => (file.id === currentActiveFileId ? {...file, code} : file));

      // Get latest sketch from storage to ensure we have current data
      const latestSketch = getSketch(currentSketch.id) || currentSketch;

      // Immediately save to localStorage with the correct activeFileId
      const sketchToSave = {
        ...latestSketch,
        files: updatedFiles,
        activeFileId: currentActiveFileId,
        updatedAt: Date.now(),
      };
      saveSketch(sketchToSave);

      return updatedFiles;
    });
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
      code: INITIAL_CODE,
      position: {x: initialX + offset, y: initialY + offset},
    };
    setFiles((prevFiles) => [...prevFiles, newFile]);

    // Set active file id after files are updated to display the new file
    setTimeout(() => {
      setActiveFileId(newId);
      // Manually update editor with new file's code
      window.dispatchEvent(
        new CustomEvent("editor-code-update", {
          detail: {code: INITIAL_CODE},
        })
      );
      currentEditorContent.current = INITIAL_CODE;
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Cmd + B to create new file
      if ((event.key === "b" || event.key === "B") && event.metaKey) {
        event.preventDefault();
        event.stopPropagation();
        addNewFile();
        // Play sound for adding new file via hotkey
        window.dispatchEvent(new CustomEvent("file-add"));
        return;
      }

      // Cmd + O to switch to next piece
      if ((event.key === "i" || event.key === "I") && event.metaKey) {
        event.preventDefault();
        event.stopPropagation();
        const pieceKeys = Object.keys(pieces);
        const currentIndex = pieceKeys.findIndex((key) => key === selectedPiece);
        if (currentIndex === -1) return;

        // Switch to next piece (cycle to first if at end)
        const nextIndex = (currentIndex + 1) % pieceKeys.length;
        const nextPiece = pieceKeys[nextIndex];
        setSelectedPiece(nextPiece);
        // Notify piano editor of piece change
        window.dispatchEvent(
          new CustomEvent("piece-selection-change", {
            detail: {piece: nextPiece},
          })
        );
        return;
      }

      // Cmd + Left/Right to switch files
      if (event.metaKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        event.stopPropagation();
        const currentIndex = files.findIndex((f) => f.id === activeFileId);
        if (currentIndex === -1) return;

        if (event.key === "ArrowLeft") {
          // Switch to previous file
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1;
          switchFile(files[prevIndex].id);
          // Play sound for switching file via hotkey
          window.dispatchEvent(new CustomEvent("file-switch"));
        } else if (event.key === "ArrowRight") {
          // Switch to next file
          const nextIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0;
          switchFile(files[nextIndex].id);
          // Play sound for switching file via hotkey
          window.dispatchEvent(new CustomEvent("file-switch"));
        }
      }
    };

    // Use capture phase to catch the event before browser handles it
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [files, activeFileId, selectedPiece, pieces]);

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

  // Track editor content changes in real-time and auto-save (without triggering sketch rerun)
  useEffect(() => {
    const onEditorContentChange = (event) => {
      const {code} = event.detail;
      if (code !== undefined) {
        currentEditorContent.current = code; // Store in ref only
        // Auto-save to localStorage without updating files state (no sketch rerun)
        autoSaveFromRef();
      }
    };
    window.addEventListener("editor-content-change", onEditorContentChange);
    return () => window.removeEventListener("editor-content-change", onEditorContentChange);
  }, [autoSaveFromRef]);

  // Track sound progress updates from piano
  useEffect(() => {
    const onSoundProgress = (event) => {
      const {index, percentage} = event.detail;
      if (index !== undefined && percentage !== undefined) {
        // Include latest files and activeFileId when saving sound progress
        const updatedFiles = files.map((file) =>
          file.id === activeFileId ? {...file, code: currentEditorContent.current} : file
        );

        const sketchToSave = {
          ...currentSketch,
          files: updatedFiles,
          activeFileId: activeFileId,
          soundProgress: {index, percentage},
          updatedAt: Date.now(),
        };
        saveSketch(sketchToSave);
        setCurrentSketch(sketchToSave);
      }
    };
    window.addEventListener("sound-progress", onSoundProgress);
    return () => window.removeEventListener("sound-progress", onSoundProgress);
  }, [currentSketch, files, activeFileId]);

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

  const handlePieceChange = (e) => {
    const piece = e.target.value;
    setSelectedPiece(piece);
    // Notify piano editor of piece change
    window.dispatchEvent(
      new CustomEvent("piece-selection-change", {
        detail: {piece},
      })
    );
  };

  return (
    <>
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
        {/* Piece Selector - positioned on the right */}
        <div className="ml-auto mr-2">
          <select
            value={selectedPiece}
            onChange={handlePieceChange}
            className="px-2 py-1  text-[#f0f6fc] border border-[#363342] rounded-md text-sm font-mono cursor-pointer transition-colors hover:border-[#4a4d5a] focus:outline-none focus:border-[#58a6ff]"
          >
            {Object.keys(pieces).map((piece) => (
              <option key={piece} value={piece}>
                {piece}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-[calc(100%-40px)] w-full relative" style={{zIndex: 1}}>
        <Editor
          key={currentSketch.id}
          code={files.find((f) => f.id === activeFileId)?.code || ""}
          onSave={onSave}
          style={{height: "100%"}}
          isFullscreen={isFullscreen}
          initialProgress={currentSketch.soundProgress || {index: 0, percentage: 0}}
        />

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
                <Sketch
                  code={file.code}
                  style={{
                    border: isCmdPressed ? "1px dashed #58a6ff" : "1px dashed transparent",
                    transition: "border 0.1s ease",
                  }}
                />
              </div>
            </Draggable>
          );
        })}
      </div>
    </>
  );
}
