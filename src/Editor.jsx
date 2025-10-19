import {useRef, useEffect} from "react";
import {createEditor} from "./createEditor.js";
import "./editor.css";

export function Editor({code, onSave, isFullscreen, ...props}) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    editorRef.current = createEditor(containerRef.current, {initialCode: code, onSave});
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
