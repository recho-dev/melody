import {javascript, esLint} from "@codemirror/lang-javascript";
import {EditorView, basicSetup} from "codemirror";
import {keymap} from "@codemirror/view";
import {indentWithTab} from "@codemirror/commands";
import {vim, Vim} from "@replit/codemirror-vim";
import {githubDarkInit} from "@uiw/codemirror-theme-github";
import {tags as t} from "@lezer/highlight";
import * as eslint from "eslint-linter-browserify";
import {linter} from "@codemirror/lint";
import {browser} from "globals";
import {createPiano} from "./createPiano.js";
import {numberHighlight} from "./number.js";
import {numberSlider} from "./slider.js";
import {colorHighlight} from "./color.js";
import {colorPicker} from "./picker.js";

function throttle(func, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

const eslintConfig = {
  languageOptions: {
    globals: {
      ...browser,
    },
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
};

Vim.map("jj", "<Esc>", "insert");

function createEditor(parent, {initialCode = "", onSave = () => {}} = {}) {
  parent.style.position = "relative";

  const bgParent = document.createElement("div");
  parent.appendChild(bgParent);
  bgParent.className = "bg-parent";

  const editorParent = document.createElement("div");
  editorParent.className = "editor-parent";
  parent.appendChild(editorParent);

  // Initialize the editor
  const editor = new EditorView({
    parent: editorParent,
    extensions: [
      EditorView.domEventHandlers({keydown: handleKeyDown}),
      vim({status: true}),
      basicSetup,
      javascript(),
      numberHighlight(),
      numberSlider(),
      colorHighlight(),
      colorPicker(),
      githubDarkInit({
        styles: [
          {tag: [t.variableName], color: "#f0f6fc"},
          {tag: [t.function(t.variableName)], color: "#d2a8ff"},
        ],
      }),
      EditorView.updateListener.of(handleCursorChange),
      EditorView.theme({
        "&": {fontSize: "14px", fontFamily: "monospace", height: "100%"},
      }),
      keymap.of([
        {
          key: "Mod-s",
          run: handleModS,
          preventDefault: true,
        },
        {
          key: "Mod-m",
          run: handleModM,
          preventDefault: true,
        },
        indentWithTab,
      ]),
      linter(esLint(new eslint.Linter(), eslintConfig)),
    ],
    doc: initialCode,
  });

  // Listen for sketch ready event
  const onSketchReady = debounce(() => {
    if (!piano) return;
    if (!piano.isStarted()) return;
    // piano.playSuccessSound();
  }, 1000);

  const onSketchError = debounce(() => {
    if (!piano) return;
    if (!piano.isStarted()) return;
    // piano.playFailureSound();
  }, 1000);

  const onSliderChange = throttle(() => {
    if (!piano) return;
    piano.play();
  }, 200);

  const onColorChange = throttle(() => {
    if (!piano) return;
    piano.play();
  }, 200);

  const onSketchDrag = throttle(() => {
    if (!piano) return;
    piano.play();
  }, 200);

  const onFileSwitch = async () => {
    if (!piano) return;
    if (!piano.isStarted()) return;
    await piano.playMoveSound();
  };

  const onFileAdd = async () => {
    if (!piano) return;
    if (!piano.isStarted()) return;
    await piano.playMoveSound();
  };

  window.addEventListener("sketch-ready", onSketchReady);

  window.addEventListener("sketch-error", onSketchError);

  window.addEventListener("slider-change", onSliderChange);

  window.addEventListener("color-change", onColorChange);

  window.addEventListener("sketch-drag", onSketchDrag);

  window.addEventListener("file-switch", onFileSwitch);

  window.addEventListener("file-add", onFileAdd);

  // Initialize the piano
  let piano;
  let gutterWidth;
  let gutterObserver;

  let timeout = setTimeout(() => {
    piano = createPiano({parent: bgParent});
    resize();
    const gutter = editorParent.querySelector(".cm-gutters");
    gutterObserver = new ResizeObserver(() => resize());
    gutterObserver.observe(gutter);
  }, 0);

  function handleKeyDown(e) {
    if (e.metaKey) return;
    piano.play();
  }

  async function handleModS(view) {
    onSave(view.state.doc.toString());
    // piano.playSaveSound();
    return true;
  }

  function handleModM() {
    piano.moveDown();
    piano.playMoveSound();
    return true;
  }

  function movePianoToCursor(cursorPos) {
    piano.moveTo(coordsAtPos(cursorPos));
  }

  function coordsAtPos(cursorPos) {
    const {left, top, right, bottom} = editor.coordsAtPos(cursorPos);
    const bbox = editorParent.getBoundingClientRect();
    const bboxLeft = bbox.left + gutterWidth;
    const bboxTop = bbox.top;
    const coords = {left: left - bboxLeft, top: top - bboxTop, right: right - bboxLeft, bottom: bottom - bboxTop};
    return coords;
  }

  function handleCursorChange(update) {
    if (update.selectionSet) {
      const cursorPos = update.state.selection.main.head;
      movePianoToCursor(cursorPos);
    }
    // Track code changes in real-time
    if (update.docChanged) {
      const currentCode = update.state.doc.toString();
      window.dispatchEvent(
        new CustomEvent("editor-content-change", {
          detail: {code: currentCode},
        })
      );
    }
  }

  function resize() {
    const gutter = editorParent.querySelector(".cm-gutters");
    if (gutter) {
      gutterWidth = gutter.offsetWidth;
      bgParent.style.left = `${gutterWidth}px`;
      bgParent.style.width = `calc(100% - ${gutterWidth}px)`;
    }
    if (piano) {
      piano.resize();
      const cursorPos = editor.state.selection.main.head;
      movePianoToCursor(cursorPos);
    }
  }

  return {
    editor,
    updateFontSize: (fontSize) => {
      editor.dom.style.fontSize = fontSize;
    },
    updateCode: (newCode) => {
      editor.dispatch({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: newCode,
        },
      });
    },
    resize,
    destroy: () => {
      editor.destroy();
      bgParent.remove();
      editorParent.remove();
      piano?.destroy();
      clearTimeout(timeout);
      gutterObserver?.disconnect();
      window.removeEventListener("sketch-ready", onSketchReady);
      window.removeEventListener("sketch-error", onSketchError);
      window.removeEventListener("slider-change", onSliderChange);
      window.removeEventListener("color-change", onColorChange);
      window.removeEventListener("sketch-drag", onSketchDrag);
      window.removeEventListener("file-switch", onFileSwitch);
      window.removeEventListener("file-add", onFileAdd);
    },
  };
}

export {createEditor};
