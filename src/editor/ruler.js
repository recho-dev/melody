import * as d3 from "d3";

export function createRuler({min, max, value, width, height, onChange}) {
  const paddingX = 10;
  const paddingY = 5;
  const tickSize = height - paddingY - 16;

  const x = d3.scaleLinear([min, max], [paddingX, width - paddingX]).nice();

  const vx = x(value);

  const xAxis = d3.axisBottom(x).ticks(5).tickSize(tickSize);

  const svg = d3.create("svg").attr("class", "ruler").attr("width", width).attr("height", height);

  const gx = svg.append("g").attr("transform", `translate(0, ${paddingY})`).call(xAxis);

  svg
    .append("line")
    .attr("x1", vx)
    .attr("y1", paddingY)
    .attr("x2", vx)
    .attr("y2", paddingY + tickSize)
    .attr("stroke", "red");

  const zoom = d3.zoom().on("zoom", zoomed);

  function zoomed({transform}) {
    gx.call(xAxis.scale(transform.rescaleX(x)));
    const newValue = transform.rescaleX(x).invert(vx);
    onChange(newValue.toFixed(2));
  }

  return svg.call(zoom);
}
