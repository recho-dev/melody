import {javascript} from "@codemirror/lang-javascript";
import {EditorView, basicSetup} from "codemirror";
import {keymap} from "@codemirror/view";
import {indentWithTab} from "@codemirror/commands";
import {vim} from "@replit/codemirror-vim";
import {githubDarkInit} from "@uiw/codemirror-theme-github";
import {tags as t} from "@lezer/highlight";

function createEditor(parent, {initialCode = "", onChange = () => {}, onSave = () => {}, onKeyDown = () => {}} = {}) {
  const editor = new EditorView({
    parent,
    extensions: [
      EditorView.domEventHandlers({keydown: onKeyDown}),
      vim({status: true}),
      basicSetup,
      javascript(),
      githubDarkInit({
        styles: [
          {tag: [t.variableName], color: "#f0f6fc"},
          {tag: [t.function(t.variableName)], color: "#d2a8ff"},
        ],
      }),
      EditorView.updateListener.of(handleChange),
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
    ],
    doc: initialCode,
  });
  function handleChange(update) {
    if (update.docChanged) onChange(editor.state.doc.toString());
  }
  return {
    editor,
    destroy: () => editor.destroy(),
  };
}

export {createEditor};
