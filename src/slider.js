import {EditorView, ViewPlugin} from "@codemirror/view";
import {Annotation, Facet} from "@codemirror/state";
import {createRuler} from "./ruler.js";
import {html} from "htl";

// Define a annotation to label the slider change transaction.
export const ANNO_SLIDER_UPDATE = Annotation.define();

// Define a facet to provide the params change callback.
const paramsFacet = Facet.define({combine: (values) => values[0] || (() => {})});

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
      this.params = [];
      this.onParamsChange = view.state.facet(paramsFacet);
      this.mousedown = this.mousedown.bind(this);
      this.mouseup = this.mouseup.bind(this);
      view.dom.addEventListener("mousedown", this.mousedown);
      view.dom.addEventListener("mouseup", this.mouseup);
    }

    update(update) {
      if (update.docChanged) {
        this.updateParamPositions(update);
        const hasSliderUpdate = update.transactions.some((tr) => tr.annotation(ANNO_SLIDER_UPDATE));
        if (this.popup && !hasSliderUpdate) this.closePopup();
      }
    }

    updateParamPositions(update) {
      const newParams = [];

      for (const param of this.params) {
        // Map the old positions through the changes.
        let newFrom = param.from;
        let newTo = param.to;
        for (const tr of update.transactions) {
          newFrom = tr.changes.mapPos(newFrom, -1); // -1 to stick before insertions.
          newTo = tr.changes.mapPos(newTo, 1); // 1 to stick after insertions.
        }

        // Check if the position is still valid. If not, skip this param.
        if (newFrom < 0 || newTo > update.state.doc.length || newFrom >= newTo) continue;

        // Get the text at the new position.
        const text = update.state.doc.sliceString(newFrom, newTo);

        const numberRegex = /-?\d+\.?\d*/g;

        // Check if it's still a valid number.
        if (numberRegex.test(text)) newParams.push({from: newFrom, to: newTo, value: text});

        // Otherwise, the param was deleted or modified, so  skip it
      }

      this.params = newParams;

      this.onParamsChange({
        params: this.params,
        code: update.state.doc.toString(),
        type: "position-update",
      });
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
      };

      const onClose = () => this.closePopup();

      const onCheckboxChange = (checked) => {
        if (checked) {
          const param = {from: number.from, to: number.to, value: number.value};
          this.params.push(param);
        } else {
          this.params = this.params.filter((p) => !(p.from === number.from && p.to === number.to));
        }

        this.params = [...this.params];

        this.onParamsChange({
          params: this.params,
          code: this.view.state.doc.toString(),
          type: "params-update",
        });
      };

      const isChecked = this.params.some((p) => p.from === number.from && p.to === number.to);

      this.popup = createSliderPopup(number, onChange, onClose, onCheckboxChange, isChecked);

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
    backgroundColor: "#ffffff",
    border: "1px solid rgb(61, 68, 77)",
    padding: "6px",
    zIndex: "1000",
    minWidth: "200px",
    backgroundColor: "black",
  },
  ".cm-slider-checkbox-container": {
    paddingLeft: "6px",
    display: "flex",
    gap: "6px",
  },
  ".cm-slider-checkbox-label": {
    fontSize: "12px",
  },
});

export function numberSlider(onParamsChange) {
  return [numberSliderPlugin, sliderStyles, paramsFacet.of(onParamsChange || (() => {}))];
}
