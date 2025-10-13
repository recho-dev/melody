import {javascript} from "@codemirror/lang-javascript";
import {EditorView, basicSetup} from "codemirror";
import {keymap} from "@codemirror/view";
import {indentWithTab} from "@codemirror/commands";
import {vim} from "@replit/codemirror-vim";

function createEditor(parent, {initialCode = "", onChange = () => {}, onSave = () => {}} = {}) {
  const editor = new EditorView({
    parent,
    extensions: [
      vim({status: true}),
      basicSetup,
      javascript(),
      EditorView.updateListener.of(handleChange),
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
