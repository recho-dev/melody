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
          run: (view) => {
            onSave(view.state.doc.toString());
            return true;
          },
          preventDefault: true,
        },
        indentWithTab,
      ]),
      linter(esLint(new eslint.Linter(), eslintConfig)),
    ],
    doc: initialCode,
  });

  const piano = createPiano({parent: bgParent});

  movePianoToCursor(0);

  function handleKeyDown() {
    piano.play();
  }

  function movePianoToCursor(cursorPos) {
    const coords = editor.coordsAtPos(cursorPos);
    const bbox = editorParent.getBoundingClientRect();
    const offset = {offsetX: bbox.left, offsetY: bbox.top};
    piano.moveTo(coords, offset);
  }

  function handleCursorChange(update) {
    if (update.selectionSet) {
      const cursorPos = update.state.selection.main.head;
      movePianoToCursor(cursorPos);
    }
  }

  return {
    editor,
    destroy: () => {
      editor.destroy();
      bgParent.remove();
      editorParent.remove();
    },
  };
}

export {createEditor};
