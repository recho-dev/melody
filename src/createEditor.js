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
  const onSketchReady = () => {
    if (!piano) return;
    if (!piano.isStarted()) return;
    setTimeout(() => {
      piano.playSuccessSound();
    }, 1000);
  };

  const onSketchError = () => {
    if (!piano) return;
    if (!piano.isStarted()) return;
    setTimeout(() => {
      piano.playFailureSound();
    }, 1000);
  };

  const onPreviewShow = () => {
    if (!piano) return;
    piano.stop();
  };

  const onPreviewHide = () => {
    if (!piano) return;
    piano.resume();
  };

  // Throttle slider change to prevent too many rapid note plays
  let lastSliderPlayTime = 0;
  const SLIDER_THROTTLE_MS = 150; // Minimum time between plays (in milliseconds)

  const onSliderChange = () => {
    if (!piano) return;
    if (!piano.isStarted()) return;

    const now = Date.now();
    if (now - lastSliderPlayTime >= SLIDER_THROTTLE_MS) {
      lastSliderPlayTime = now;
      piano.play();
    }
  };

  window.addEventListener("preview-show", onPreviewShow);

  window.addEventListener("preview-hide", onPreviewHide);

  window.addEventListener("sketch-ready", onSketchReady);

  window.addEventListener("sketch-error", onSketchError);

  window.addEventListener("slider-change", onSliderChange);

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
    piano.playSaveSound();
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
      window.removeEventListener("preview-show", onPreviewShow);
      window.removeEventListener("preview-hide", onPreviewHide);
      window.removeEventListener("slider-change", onSliderChange);
    },
  };
}

export {createEditor};
