import * as Tone from "tone";
import * as d3 from "d3";
import * as cm from "charmingjs";
import * as Matter from "matter-js";
import BeethovenMoonlight from "./data/beethoven_moonlight.json";

// Convert MIDI note number to frequency
function midiToFrequency(midi) {
  return Tone.Frequency(midi, "midi").toFrequency();
}

export function createPiano({parent}) {
  const canvasParent = document.createElement("div");
  parent.appendChild(canvasParent);
  canvasParent.className = "canvas-parent";

  const svgParent = document.createElement("div");
  parent.appendChild(svgParent);
  svgParent.className = "svg-parent";

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

  const kit = new Tone.Players({
    kick: "/sounds/kick.mp3",
    snare: "/sounds/snare.mp3",
    hh: "/sounds/hh.mp3",
    hho: "/sounds/hho.mp3",
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
  let width;
  let height;
  let xScale;
  let rScale;
  const X = notes.map((d) => d.startTime);
  const R = notes.map((d) => d.velocity);
  const PANEL_HEIGHT = 20;

  const svg = d3.select(svgParent).append("svg");

  const cursorGroup = svg.append("g").attr("transform", `translate(0, 0)`);

  const notesGroup = cursorGroup.append("g").attr("transform", `translate(0, 0)`);

  const circles = notesGroup.selectAll("circle").data(notes).join("circle");

  // Draw a percentage number
  const pText = svg
    .append("text")
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "text-bottom")
    .attr("font-size", "100px")
    .attr("fill", "#21222C")
    .attr("stroke", "#0d1117")
    .attr("stroke-width", 1)
    .attr("font-weight", "bold")
    .attr("font-family", "monospace")
    .text("0%");

  // Draw the notes
  let ctx;
  let walls;
  const engine = Matter.Engine.create();
  const fallingNotes = [];
  const timer = d3.interval(update, 1000 / 60);

  function colorScale(t) {
    return d3.interpolateCool(t % 1);
  }

  function update() {
    Matter.Engine.update(engine);
    ctx.clearRect(0, 0, width, height);
    for (const circle of fallingNotes) {
      const {x, y} = circle.position;
      const radius = circle.__radius__;
      const fill = circle.__fill__;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = fill;
      ctx.fill();
    }
    // for (const wall of walls) {
    //   const {x, y} = wall.position;
    //   const width = wall.__width__;
    //   const height = wall.__height__;
    //   ctx.fillStyle = "red";
    //   ctx.beginPath();
    //   ctx.rect(x - width / 2, y - height / 2, width, height);
    //   ctx.fill();
    // }
  }

  function createNote(x, y, radius, fill) {
    const note = Matter.Bodies.circle(x, y, radius);
    note.__radius__ = radius;
    note.__fill__ = fill;
    Matter.Body.setVelocity(note, {x: 0, y: 1});
    fallingNotes.push(note);
    Matter.Composite.add(engine.world, note);
    return note;
  }

  function createWall(x, y, width, height) {
    const wall = Matter.Bodies.rectangle(x, y, width, height, {isStatic: true});
    Matter.Composite.add(engine.world, wall);
    wall.__width__ = width;
    wall.__height__ = height;
    return wall;
  }

  function createWalls() {
    const scale = 100000;
    const leftWall = createWall(-10 + 1, height / 2, 20, height * scale);
    const rightWall = createWall(width + 10 - 1, height / 2, 20, height * scale);
    const bottomWall = createWall(width / 2, height - 10 - 3, width, 20);
    return [leftWall, rightWall, bottomWall];
  }

  function resize() {
    width = parent.offsetWidth;
    height = parent.offsetHeight;
    xScale = d3.scaleLinear(d3.extent(X), [0, (width * numScreens) / 5]);
    rScale = d3.scaleRadial(d3.extent(R), [5, 20]);

    // Update the SVG size
    svg.attr("width", width).attr("height", height);

    circles
      .attr("cx", (d) => xScale(d.startTime))
      .attr("cy", 0)
      .attr("r", (d) => rScale(d.velocity))
      .attr("fill", "#36334280");

    pText.attr("x", width - 20).attr("y", height - PANEL_HEIGHT - 20);

    // Update the canvas size
    if (ctx) ctx.canvas.remove();
    ctx = cm.context2d({width, height, container: canvasParent});

    // Update walls
    if (walls) walls.forEach((wall) => Matter.Composite.remove(engine.world, wall));
    walls = createWalls();
  }

  let index = 0;
  let t = 0;
  let lastTime = Date.now();
  let currentCoords;
  let initialX = 0;

  let start = false;
  let isAutoPlaying = false;
  let inactivityTimer = null;
  let autoPlayInterval = null;
  const INACTIVITY_TIMEOUT = 4000;

  function startAutoPlay() {
    if (!isAutoPlaying && start) {
      isAutoPlaying = true;
      autoPlayInterval = setInterval(() => {
        play();
      }, 2000);
    }
  }

  function stopAutoPlay() {
    if (isAutoPlaying) {
      isAutoPlaying = false;
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
    }
  }

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    stopAutoPlay();
    inactivityTimer = setTimeout(() => {
      startAutoPlay();
    }, INACTIVITY_TIMEOUT);
  }

  resize();

  async function play() {
    start = true;

    t += 0.01;
    const diff = Date.now() - lastTime;
    lastTime = Date.now();

    // Play the piano
    if (Tone.getContext().state !== "running") await Tone.start();
    const i = index % timeNotes.length;
    const [, notes] = timeNotes[i];
    for (const note of notes) {
      const frequency = midiToFrequency(note.midiNote);
      const normalizedVelocity = note.velocity / 127; // Normalize velocity to 0-1
      synth.triggerAttackRelease(frequency, note.duration, Tone.now(), normalizedVelocity);
    }
    index++;

    // Update the percentage text
    const percentage = Math.floor((index / timeNotes.length) * 100);
    pText.text(`${percentage}%`);

    // Add falling notes
    for (const note of notes) {
      const {left, right, bottom} = currentCoords;
      const x = (left + right) / 2;
      const y = bottom + 10;
      createNote(x, y, rScale(note.velocity), colorScale(t));
    }

    // Translate the notes
    const duration = Math.min(500, diff);
    const nextNote = timeNotes[(i + 1) % timeNotes.length];
    const nextStartTime = nextNote[0];
    const transformX = xScale(nextStartTime);

    notesGroup.transition().duration(duration).ease(d3.easeCubicOut).attr("transform", `translate(${-transformX}, 0)`);

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
  }

  return {
    resize,
    isStarted: () => start,
    async playSaveSound() {
      if (Tone.getContext().state !== "running") await Tone.start();
      kit.player("kick").start();
    },
    async playSuccessSound() {
      if (Tone.getContext().state !== "running") await Tone.start();
      kit.player("snare").start();
    },
    async playFailureSound() {
      if (Tone.getContext().state !== "running") await Tone.start();
      kit.player("hho").start();
    },
    async playMoveSound() {
      if (Tone.getContext().state !== "running") await Tone.start();
      kit.player("hh").start();
    },
    destroy() {
      timer.stop();
      Matter.Engine.clear(engine);
      stopAutoPlay();
      clearTimeout(inactivityTimer);
    },
    moveDown() {
      initialX += 20;
      const [, , bottomWall] = walls;
      Matter.Body.setPosition(bottomWall, {x: bottomWall.position.x, y: bottomWall.position.y + 20});
      resetInactivityTimer();
    },
    moveTo(coords) {
      currentCoords = coords;
      const {top, bottom, right} = coords;
      const middleY = (top - bottom) / 2;
      const currentX = right + 30;
      const currentY = top - middleY;
      cursorGroup
        .transition()
        .duration(200)
        .ease(d3.easeCubicOut)
        .attr("transform", `translate(${currentX}, ${currentY})`);
      resetInactivityTimer();
    },
    play() {
      resetInactivityTimer();
      return play();
    },
  };
}
