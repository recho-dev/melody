import {useRef, useEffect} from "react";
import {createEditor} from "./createEditor.js";

export function Editor({code, onChange, onSave, onKeyDown, ...props}) {
  const editorRef = useRef(null);
  useEffect(() => {
    if (!editorRef.current) return;
    const {destroy} = createEditor(editorRef.current, {initialCode: code, onChange, onSave, onKeyDown});
    return () => destroy();
  }, []);
  return <div ref={editorRef} {...props} />;
}
