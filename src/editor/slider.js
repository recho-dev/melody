import {EditorView, ViewPlugin} from "@codemirror/view";
import {Annotation} from "@codemirror/state";
import {createRuler} from "./ruler.js";
import {html} from "htl";
import {findColorRanges} from "./color.js";

// Define a annotation to label the slider change transaction.
export const ANNO_SLIDER_UPDATE = Annotation.define();

// Find a number on a specific line in the editor based on a given cursor or
// mouse position.
function findNumberAt(view, pos) {
  const line = view.state.doc.lineAt(pos);
  const text = line.text;
  const offset = pos - line.from;
  let match;
  const numberRegex = /-?\d+\.?\d*/g;
  while ((match = numberRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (offset >= start && offset <= end) {
      return {
        from: line.from + start,
        to: line.from + end,
        value: match[0],
      };
    }
  }
  return null;
}

function createSliderPopup(number, onChange) {
  const currentValue = parseFloat(number.value);
  let [min, max] = [0, currentValue * 2];
  if (currentValue === 0) [min, max] = [-50, 50];
  if (min > max) [min, max] = [max, min];
  const ruler = createRuler({min, max, value: currentValue, width: 200, height: 50, onChange});
  const handleMouseDown = (event) => event.stopPropagation();
  return html`<div class="cm-number-slider-popup" onmousedown=${handleMouseDown}>
    <div>${ruler}</div>
  </div>`;
}

const numberSliderPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.view = view;
      this.popup = null;
      this.activeNumber = null;
      this.mouseDownPos = null;
      this.mousedown = this.mousedown.bind(this);
      this.mouseup = this.mouseup.bind(this);
      view.dom.addEventListener("mousedown", this.mousedown);
      view.dom.addEventListener("mouseup", this.mouseup);
    }

    update(update) {
      if (update.docChanged) {
        const hasSliderUpdate = update.transactions.some((tr) => tr.annotation(ANNO_SLIDER_UPDATE));
        if (this.popup && !hasSliderUpdate) this.closePopup();
      }
    }

    mousedown(event) {
      this.mouseDownPos = {x: event.clientX, y: event.clientY};
    }

    mouseup(event) {
      // Return if the mouse is moved too far
      const currentPos = {x: event.clientX, y: event.clientY};
      const distance = Math.hypot(currentPos.x - this.mouseDownPos.x, currentPos.y - this.mouseDownPos.y);
      if (distance > 5) return;

      this.closePopup();

      // Get the position of the mouse in the editor
      const pos = this.view.posAtCoords(currentPos);
      if (pos === null) return;

      // Check if the position is inside a color - if so, skip showing the slider
      const line = this.view.state.doc.lineAt(pos);
      const text = line.text;
      const colorRanges = findColorRanges(text, line.from);
      const isInsideColor = colorRanges.some((range) => pos >= range.start && pos <= range.end);
      if (isInsideColor) return;

      const number = findNumberAt(this.view, pos);
      if (!number) return;
      event.preventDefault();
      this.showPopup(number);
    }

    showPopup(number) {
      this.closePopup();

      this.activeNumber = number;

      const onChange = (newValue) => {
        // Format the number (remove trailing zeros for decimals)
        let formattedValue = String(newValue);
        if (formattedValue.includes(".")) formattedValue = parseFloat(formattedValue).toString();
        this.view.dispatch({
          changes: {
            from: this.activeNumber.from,
            to: this.activeNumber.to,
            insert: formattedValue,
          },
          annotations: ANNO_SLIDER_UPDATE.of(true),
        });
        const diff = formattedValue.length - this.activeNumber.value.length;
        this.activeNumber.to += diff;
        this.activeNumber.value = formattedValue;

        // Get the updated code
        const updatedCode = this.view.state.doc.toString();

        // Dispatch custom event to trigger Sketch rerender and play note
        window.dispatchEvent(
          new CustomEvent("slider-change", {
            detail: {code: updatedCode},
          })
        );
      };

      this.popup = createSliderPopup(number, onChange);

      const {left, top, right, bottom} = this.view.coordsAtPos(number.from);
      const {left: bboxLeft, top: bboxTop} = this.view.dom.parentElement.getBoundingClientRect();
      const coords = {
        left: left - bboxLeft,
        top: top - bboxTop,
        right: right - bboxLeft,
        bottom: bottom - bboxTop,
      };

      if (coords) {
        this.popup.style.position = "absolute";
        this.popup.style.left = `${coords.left}px`;
        this.popup.style.top = `${coords.bottom + 5}px`;
      }

      this.view.dom.appendChild(this.popup);
    }

    closePopup() {
      if (!this.popup) return;
      this.popup.remove();
      this.popup = null;
      this.activeNumber = null;
    }

    destroy() {
      this.view.dom.removeEventListener("mousedown", this.mousedown);
      this.view.dom.removeEventListener("mouseup", this.mouseup);
      this.closePopup();
    }
  }
);

const sliderStyles = EditorView.theme({
  ".cm-number-slider-popup": {
    position: "absolute",
    border: "1px solid rgb(61, 68, 77)",
    padding: "6px",
    zIndex: "1000",
    minWidth: "200px",
    backgroundColor: "black",
  },
});

export function numberSlider() {
  return [numberSliderPlugin, sliderStyles];
}
