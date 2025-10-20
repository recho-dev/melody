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
    },
  };
}

export {createEditor};
