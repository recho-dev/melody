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
  const pianoRef = useRef(null);
  const vizRef = useRef(null);

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

  useEffect(() => {
    if (!pianoRef.current && vizRef.current) {
      pianoRef.current = createPiano({parent: vizRef.current});
    }
  }, []);

  return (
    <div className="min-h-screen">
      <header className="h-[64px] gh-header gh-box-shadow gh-text-primary flex items-center justify-start">
        <h1 className="ml-4 font-bold"> Recho Melody </h1>
      </header>
      <main className="flex h-[calc(100vh-264px)]">
        <div className="h-full w-1/2">
          <Editor code={code} onSave={onSave} onKeyDown={onKeyDown} style={{height: "100%"}} />
        </div>
        <div className="h-full w-1/2">
          <Sketch code={code} />
        </div>
      </main>
      <div className="h-[200px] gh-border-top" ref={vizRef}>
        Viz
      </div>
    </div>
  );
}

export default App;
