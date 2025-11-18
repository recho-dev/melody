import {Decoration, ViewPlugin, EditorView} from "@codemirror/view";

const numberDeco = Decoration.mark({class: "cm-number"});

const numberHighlightPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = this.buildDeco(view);
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDeco(update.view);
      }
    }

    buildDeco(view) {
      const ranges = [];
      const numberRegex = /-?\d+\.?\d*/g;
      for (const {from, to} of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        numberRegex.lastIndex = 0;
        let m;
        while ((m = numberRegex.exec(text))) {
          const start = from + m.index;
          const end = start + m[0].length;
          ranges.push(numberDeco.range(start, end));
        }
      }
      return Decoration.set(ranges, true);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

const numberStyles = EditorView.theme({
  ".cm-number": {
    "border-bottom": "1px dotted #999",
  },
});

export function numberHighlight() {
  return [numberHighlightPlugin, numberStyles];
}
