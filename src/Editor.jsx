import {useRef, useEffect} from "react";
import {createEditor} from "./createEditor.js";
import "./editor.css";

export function Editor({code, onSave, ...props}) {
  const editorRef = useRef(null);
  useEffect(() => {
    if (!editorRef.current) return;
    const editor = createEditor(editorRef.current, {initialCode: code, onSave});
    const resizeObserver = new ResizeObserver(() => editor.resize());
    resizeObserver.observe(editorRef.current);
    return () => {
      editor.destroy();
    };
  }, []);
  return <div ref={editorRef} {...props} />;
}
