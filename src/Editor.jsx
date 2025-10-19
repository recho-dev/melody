import {useRef, useEffect} from "react";
import {createEditor} from "./createEditor.js";
import "./editor.css";

export function Editor({code, onSave, ...props}) {
  const editorRef = useRef(null);
  useEffect(() => {
    if (!editorRef.current) return;
    const {destroy} = createEditor(editorRef.current, {initialCode: code, onSave});
    return () => destroy();
  }, []);
  return <div ref={editorRef} {...props} />;
}
