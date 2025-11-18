import {useRef, useEffect} from "react";
import {createEditor} from "./editor/createEditor.js";
import "./editor/editor.css";

export function Editor({code, onSave, isFullscreen, onTogglePreview, ...props}) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    editorRef.current = createEditor(containerRef.current, {initialCode: code, onSave, onTogglePreview});
    const resizeObserver = new ResizeObserver(() => editorRef.current.resize());
    resizeObserver.observe(containerRef.current);
    return () => {
      editorRef.current.destroy();
    };
  }, []);

  useEffect(() => {
    editorRef.current.updateFontSize(isFullscreen ? "16px" : "14px");
  }, [isFullscreen]);

  return <div ref={containerRef} {...props} />;
}
