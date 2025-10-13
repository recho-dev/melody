import "./App.css";
import {useState, useEffect, useRef} from "react";
import {Editor} from "./Editor.jsx";
import {Sketch} from "./Sketch.jsx";
import {createPiano} from "./createPiano.js";

const initialCode = `function setup() {
  createCanvas(200, 200);
  background(0);
  circle(100, 100, 50);
}`;

function App() {
  const [code, setCode] = useState(initialCode);
  const pianoRef = useRef(createPiano());

  function onSave(code) {
    setCode(code);
  }

  function onKeyDown(code) {
    pianoRef.current.play();
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "s" && event.metaKey) {
        event.preventDefault();
        onSave(code);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [code]);

  return (
    <div className="min-h-screen">
      <header className="h-[64px]">
        <h1> Recho Melody </h1>
      </header>
      <main className="flex h-[calc(100vh-64px)]">
        <div className="h-full">
          <Editor code={code} onSave={onSave} onKeyDown={onKeyDown} />
        </div>
        <div className="h-full">
          <Sketch code={code} />
        </div>
      </main>
    </div>
  );
}

export default App;
