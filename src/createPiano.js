import * as Tone from "tone";
import * as d3 from "d3";
import BeethovenMoonlight from "./data/beethoven_moonlight.json";

// Convert MIDI note number to frequency
function midiToFrequency(midi) {
  return Tone.Frequency(midi, "midi").toFrequency();
}

export function createPiano({parent}) {
  // @ref https://tonejs.github.io/examples/polySynth
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "triangle",
      phase: 0,
      partialCount: 0,
    },
    envelope: {
      attack: 0.005,
      decay: 0.1,
      sustain: 0.3,
      release: 1,
      attackCurve: "linear",
      decayCurve: "exponential",
      releaseCurve: "exponential",
    },
  }).toDestination();

  // The format of the pieceData is [startTime, endTime, midiNote, velocity]
  const notes = [];
  const {pieceData, numScreens} = BeethovenMoonlight;
  for (let i = 0; i < pieceData.length; i += 4) {
    const startTime = pieceData[i];
    const endTime = pieceData[i + 1];
    const midiNote = pieceData[i + 2];
    const velocity = pieceData[i + 3];
    const durationMs = endTime - startTime;
    notes.push({startTime, endTime, midiNote, velocity, duration: Math.max(0.1, durationMs / 1000)});
  }
  const timeNotes = d3.groups(notes, (d) => d.startTime);

  // Draw the piano
  const width = parent.offsetWidth;
  const height = parent.offsetHeight;
  const X = notes.map((d) => d.startTime);
  const R = notes.map((d) => d.velocity);
  const xScale = d3.scaleLinear(d3.extent(X), [0, (width * numScreens) / 5]);
  const rScale = d3.scaleRadial(d3.extent(R), [5, 20]);

  const svg = d3.select(parent).append("svg").attr("width", width).attr("height", height);
  const g = svg.append("g").attr("transform", `translate(0, 0)`);
  const g2 = g.append("g").attr("transform", `translate(0, 0)`);

  const circles = g2
    .selectAll("circle")
    .data(notes)
    .join("circle")
    .attr("cx", (d) => xScale(d.startTime))
    .attr("cy", 0)
    .attr("r", (d) => rScale(d.velocity))
    .attr("fill", "#36334280");

  let index = 0;
  let lastTime = Date.now();

  return {
    moveTo(coords, offset) {
      const {offsetX, offsetY} = offset;
      const {top, bottom, right} = coords;
      const middleY = (top - bottom) / 2;
      g.transition()
        .duration(200)
        .ease(d3.easeCubicOut)
        .attr("transform", `translate(${right - offsetX + 30}, ${top - offsetY - middleY})`);
    },
    async play() {
      const diff = Date.now() - lastTime;
      lastTime = Date.now();

      // Play the piano
      if (Tone.getContext().state !== "running") await Tone.start();
      if (index >= timeNotes.length) index = 0;
      const [startTime, notes] = timeNotes[index];
      for (const note of notes) {
        const frequency = midiToFrequency(note.midiNote);
        const normalizedVelocity = note.velocity / 127; // Normalize velocity to 0-1
        synth.triggerAttackRelease(frequency, note.duration, Tone.now(), normalizedVelocity);
      }
      index++;

      // Translate the notes
      const duration = Math.min(500, diff);
      const transformX = xScale(startTime);

      g2.transition().duration(duration).ease(d3.easeCubicOut).attr("transform", `translate(${-transformX}, 0)`);

      // Scale animation
      circles
        .filter((d) => {
          const cx = xScale(d.startTime);
          const x = cx - transformX;
          return x >= 0 && x <= width;
        })
        .transition()
        .duration(100)
        .ease(d3.easeCubicOut)
        .attr("r", (d) => {
          const cx = xScale(d.startTime);
          const x = cx - transformX;
          const t = 1 - x / width;
          return rScale(d.velocity) * (1 + t ** 2);
        })
        .transition()
        .duration(100)
        .ease(d3.easeCubicOut)
        .attr("r", (d) => rScale(d.velocity));

      // Fade out animation
      circles
        .filter((d) => {
          const cx = xScale(d.startTime);
          const x = cx - transformX;
          if (d.startTime < startTime && x >= -width / 2) return true;
          return false;
        })
        .transition()
        .duration(100)
        .ease(d3.easeCubicOut)
        .attr("r", 0);
    },
  };
}
