import {EditorView, ViewPlugin} from "@codemirror/view";
import {Annotation} from "@codemirror/state";
import * as d3 from "d3";
import {colorPatterns} from "./color.js";
import iro from "@jaames/iro";

// Define an annotation to label the color picker change transaction.
export const ANNO_PICKER_UPDATE = Annotation.define();

// Find a color at a specific position in the editor
function findColorAt(view, pos) {
  const line = view.state.doc.lineAt(pos);
  const text = line.text;
  const offset = pos - line.from;

  for (const {regex, type} of colorPatterns) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (offset >= start && offset <= end) {
        const colorValue = match[0];
        // Validate with d3.color - returns null if invalid
        const parsedColor = d3.color(colorValue);
        if (parsedColor) {
          return {
            from: line.from + start,
            to: line.from + end,
            value: colorValue,
            type: type,
          };
        }
      }
    }
  }
  return null;
}

function createColorPickerPopup(colorData, onChange) {
  const parsedColor = d3.color(colorData.value);
  const rgbColor = d3.rgb(parsedColor);
  // Convert to hex for the color picker
  const hexValue = rgbColor.formatHex();

  const container = document.createElement("div");
  container.className = "cm-color-picker-popup";
  container.style.position = "absolute";
  container.style.zIndex = "1000";

  const pickerContainer = document.createElement("div");
  container.appendChild(pickerContainer);

  const handleMouseDown = (event) => event.stopPropagation();
  container.addEventListener("mousedown", handleMouseDown);

  const colorPicker = new iro.ColorPicker(pickerContainer, {
    width: 200,
    color: hexValue,
    borderWidth: 1,
    borderColor: "rgb(61, 68, 77)",
    layout: [
      {
        component: iro.ui.Wheel,
        options: {},
      },
      {
        component: iro.ui.Slider,
        options: {
          sliderType: "value",
        },
      },
      {
        component: iro.ui.Slider,
        options: {
          sliderType: "alpha",
        },
      },
    ],
  });

  colorPicker.on("color:change", (color) => {
    const newHexValue = color.hexString;
    const alpha = color.alpha;
    let newColorValue;

    if (alpha < 1) {
      newColorValue = color.rgbaString;
    }
    // Convert back to the original format
    else if (colorData.type === "hex") {
      newColorValue = newHexValue;
    } else if (colorData.type === "rgb" || colorData.type === "rgba") {
      const newColor = d3.color(newHexValue);
      const newRgb = d3.rgb(newColor);
      if (colorData.type === "rgba") {
        // Try to preserve alpha if it was there
        const alphaMatch = colorData.value.match(/,\s*([\d.]+)\s*\)/);
        const alpha = alphaMatch ? alphaMatch[1] : "1";
        newColorValue = `rgba(${newRgb.r}, ${newRgb.g}, ${newRgb.b}, ${alpha})`;
      } else {
        newColorValue = `rgb(${newRgb.r}, ${newRgb.g}, ${newRgb.b})`;
      }
    } else if (colorData.type === "hsl" || colorData.type === "hsla") {
      const newColor = d3.color(newHexValue);
      const hslColor = newColor.formatHsl();
      if (colorData.type === "hsla" && colorData.value.includes("hsla")) {
        newColorValue = hslColor.replace("hsl(", "hsla(").replace(")", ", 1)");
      } else {
        newColorValue = hslColor;
      }
    } else {
      newColorValue = newHexValue;
    }

    onChange(newColorValue);
  });

  return container;
}

const colorPickerPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.view = view;
      this.popup = null;
      this.activeColor = null;
      this.mouseDownPos = null;
      this.mousedown = this.mousedown.bind(this);
      this.mouseup = this.mouseup.bind(this);
      view.dom.addEventListener("mousedown", this.mousedown);
      view.dom.addEventListener("mouseup", this.mouseup);
    }

    update(update) {
      if (update.docChanged) {
        const hasPickerUpdate = update.transactions.some((tr) => tr.annotation(ANNO_PICKER_UPDATE));
        if (this.popup && !hasPickerUpdate) this.closePopup();
      }
    }

    mousedown(event) {
      this.mouseDownPos = {x: event.clientX, y: event.clientY};
    }

    mouseup(event) {
      const currentPos = {x: event.clientX, y: event.clientY};
      const distance = Math.hypot(currentPos.x - this.mouseDownPos.x, currentPos.y - this.mouseDownPos.y);
      if (distance > 5) return;
      this.closePopup();
      const pos = this.view.posAtCoords(currentPos);
      if (pos === null) return;

      const colorData = findColorAt(this.view, pos);
      if (!colorData) return;

      event.preventDefault();
      this.showPopup(colorData);
    }

    showPopup(colorData) {
      this.closePopup();

      this.activeColor = colorData;

      const onChange = (newValue) => {
        this.view.dispatch({
          changes: {
            from: this.activeColor.from,
            to: this.activeColor.to,
            insert: newValue,
          },
          annotations: ANNO_PICKER_UPDATE.of(true),
        });
        const diff = newValue.length - this.activeColor.value.length;
        this.activeColor.to += diff;
        this.activeColor.value = newValue;

        // Get the updated code
        const updatedCode = this.view.state.doc.toString();

        // Dispatch custom event to trigger Sketch rerender
        window.dispatchEvent(
          new CustomEvent("color-change", {
            detail: {code: updatedCode},
          })
        );
      };

      this.popup = createColorPickerPopup(colorData, onChange);

      // Position the popup at the location of the color text
      const {left, bottom} = this.view.coordsAtPos(colorData.from);
      const {left: bboxLeft, top: bboxTop} = this.view.dom.parentElement.getBoundingClientRect();

      this.popup.style.left = `${left - bboxLeft}px`;
      this.popup.style.top = `${bottom - bboxTop + 5}px`;

      this.view.dom.appendChild(this.popup);
    }

    closePopup() {
      if (!this.popup) return;
      this.popup.remove();
      this.popup = null;
      this.activeColor = null;
    }

    destroy() {
      this.view.dom.removeEventListener("mousedown", this.mousedown);
      this.view.dom.removeEventListener("mouseup", this.mouseup);
      this.closePopup();
    }
  }
);

const pickerStyles = EditorView.theme({
  ".cm-color-picker-popup": {
    border: "1px solid rgb(61, 68, 77)",
    padding: "12px",
    backgroundColor: "black",
  },
});

export function colorPicker() {
  return [colorPickerPlugin, pickerStyles];
}
