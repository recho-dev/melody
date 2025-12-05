import {Decoration, ViewPlugin, EditorView} from "@codemirror/view";
import * as d3 from "d3";

const colorDeco = (colorValue) =>
  Decoration.mark({
    class: "cm-color",
    attributes: {
      "data-color": colorValue,
      style: `border-bottom: 2px solid ${colorValue}; position: relative;`,
    },
  });

// Regex patterns for various color formats
// Exported so other plugins (like picker.js) can use the same patterns
export const colorPatterns = [
  {regex: /#(?:[0-9a-fA-F]{3}){1,2}\b/g, type: "hex"},
  {regex: /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g, type: "rgba"},
  {regex: /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g, type: "rgb"},
  {regex: /hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)/g, type: "hsla"},
  {regex: /hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)/g, type: "hsl"},
];

// Utility function to find all color ranges in text
// This is exported so other plugins (like number.js) can check if positions are inside colors
export function findColorRanges(text, offset = 0) {
  const colorRanges = [];

  for (const {regex, type} of colorPatterns) {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(text))) {
      const start = offset + m.index;
      const end = start + m[0].length;
      const colorValue = m[0];

      // Validate with d3.color - returns null if invalid
      const parsedColor = d3.color(colorValue);
      if (parsedColor) {
        colorRanges.push({start, end, value: colorValue, type});
      }
    }
  }

  return colorRanges;
}

const colorHighlightPlugin = ViewPlugin.fromClass(
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

      for (const {from, to} of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        const colorRanges = findColorRanges(text, from);

        for (const {start, end, value} of colorRanges) {
          ranges.push(colorDeco(value).range(start, end));
        }
      }

      return Decoration.set(ranges, true);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

const colorStyles = EditorView.theme({
  ".cm-color": {
    cursor: "pointer",
    position: "relative",
  },
});

export function colorHighlight() {
  return [colorHighlightPlugin, colorStyles];
}
