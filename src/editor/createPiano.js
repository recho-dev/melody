import * as Tone from "tone";
import * as d3 from "d3";
import * as cm from "charmingjs";
import * as Matter from "matter-js";
import {pieces} from "../data/index.js";

// Convert MIDI note number to frequency
function midiToFrequency(midi) {
  return Tone.Frequency(midi, "midi").toFrequency();
}

export function createPiano({parent, initialProgress = {index: 0, percentage: 0}}) {
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
  });

  const waveform = new Tone.Waveform(256);
  synth.toDestination();
  synth.connect(waveform);

  function calculateAmplitude() {
    const values = waveform.getValue();
    if (!values || values.length === 0) return 0;
    // Calculate RMS (Root Mean Square) amplitude
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i] * values[i];
    }
    const rms = Math.sqrt(sum / values.length);
    return rms;
  }

  const kit = new Tone.Players({
    kick: "/sounds/kick.mp3",
    snare: "/sounds/snare.mp3",
    hh: "/sounds/hh.mp3",
    hho: "/sounds/hho.mp3",
  }).toDestination();

  // The format of the pieceData is [startTime, endTime, midiNote, velocity]
  let notes = [];
  let numScreens = 0;
  let timeNotes = [];
  let X = [];
  let R = [];
  let M = [];

  // Draw the piano
  let width;
  let height;
  let xScale;
  let rScale;
  let colorScale;
  const PANEL_HEIGHT = 20;

  const svg = d3.select(svgParent).append("svg");

  const cursorGroup = svg.append("g").attr("transform", `translate(0, 0)`);

  const notesGroup = cursorGroup.append("g").attr("transform", `translate(0, 0)`);

  let circles = notesGroup.selectAll("circle");

  // Draw a percentage number (must be defined before loadPiece)
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

  // Initialize variables that loadPiece needs (must be declared before loadPiece)
  let ctx;
  let walls;
  const engine = Matter.Engine.create();
  const fallingNotes = [];
  let index = initialProgress.index || 0;
  let t = 0;
  let lastTime = Date.now();
  let currentCoords;
  let initialX = 0;
  let ballsInitialized = false;

  // Function to load piece data
  function loadPiece(pieceKey) {
    const piece = pieces[pieceKey];
    if (!piece) return;

    // Load new piece data
    notes = [];
    const {pieceData} = piece;

    for (let i = 0; i < pieceData.length; i += 4) {
      const startTime = pieceData[i];
      const endTime = pieceData[i + 1];
      const midiNote = pieceData[i + 2];
      const velocity = pieceData[i + 3];
      const durationMs = endTime - startTime;
      notes.push({startTime, endTime, midiNote, velocity, duration: Math.max(0.1, durationMs / 1000)});
    }
    timeNotes = d3.groups(notes, (d) => d.startTime);
    X = notes.map((d) => d.startTime);
    R = notes.map((d) => d.velocity);
    M = notes.map((d) => d.midiNote);

    // Calculate numScreens based on the number of timeNotes
    numScreens = Math.max(1, Math.ceil(timeNotes.length / 5));

    // Reset progress
    index = 0;
    ballsInitialized = false;

    // Clear existing notes
    fallingNotes.forEach((note) => {
      Matter.Composite.remove(engine.world, note);
    });
    fallingNotes.length = 0;

    // Update circles
    circles = notesGroup.selectAll("circle").data(notes).join("circle");

    // Redraw
    if (width && height) {
      resize();
      setTimeout(() => {
        initializeProgress();
      }, 0);
    } else {
      // If width/height not set yet, resize will be called later
      // But we need to call it now to set up the canvas
      resize();
    }
  }

  // Load initial piece (this will call resize internally)
  let currentPiece = "call_of_silence";
  loadPiece(currentPiece);

  // Listen for piece selection changes from Workspace
  const handlePieceChange = (event) => {
    const pieceKey = event.detail?.piece;
    if (pieceKey && pieces[pieceKey]) {
      currentPiece = pieceKey;
      loadPiece(pieceKey);
    }
  };
  window.addEventListener("piece-selection-change", handlePieceChange);

  // Draw the notes
  const timer = d3.interval(update, 1000 / 60);

  function update() {
    Matter.Engine.update(engine);
    ctx.clearRect(0, 0, width, height);
    drawNotes();
    updateMelody();
    // drawWalls();
  }

  function updateMelody() {
    const melody = (window.melody ??= {});
    melody.A = calculateAmplitude();
  }

  function drawNotes() {
    for (const circle of fallingNotes) {
      const {x, y} = circle.position;
      const radius = circle.__radius__;
      const fill = circle.__fill__;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }

  function drawWalls() {
    for (const wall of walls) {
      const {x, y} = wall.position;
      const width = wall.__width__;
      const height = wall.__height__;
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.rect(x - width / 2, y - height / 2, width, height);
      ctx.fill();
    }
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
    if (X.length > 0 && R.length > 0 && M.length > 0) {
      xScale = d3.scaleLinear(d3.extent(X), [0, (width * numScreens) / 10]);
      rScale = d3.scaleRadial(d3.extent(R), [5, 20]);
      colorScale = d3.scaleSequential(d3.interpolateViridis).domain(d3.extent(M));
    }

    // Update the SVG size
    svg.attr("width", width).attr("height", height);

    if (xScale && rScale) {
      circles
        .attr("cx", (d) => xScale(d.startTime))
        .attr("cy", 0)
        .attr("r", (d) => rScale(d.velocity))
        .attr("fill", "#36334280");
    }

    pText.attr("x", width - 20).attr("y", height - PANEL_HEIGHT - 20);

    // Update the canvas size
    if (ctx) ctx.canvas.remove();
    ctx = cm.context2d({width, height, container: canvasParent});

    // Update walls
    if (walls) walls.forEach((wall) => Matter.Composite.remove(engine.world, wall));
    walls = createWalls();
  }

  let start = false;
  let isAutoPlaying = false;
  let inactivityTimer = null;
  let autoPlayInterval = null;
  const INACTIVITY_TIMEOUT = 5000;

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

  // Initialize progress state from stored progress
  function initializeProgress() {
    if (index >= 0 && timeNotes.length > 0) {
      // Update percentage text
      const percentage = Math.floor((index / timeNotes.length) * 100);
      pText.text(`${percentage}%`);

      // Position the notes group at the current progress
      const currentNoteIndex = index % timeNotes.length;
      const currentNote = timeNotes[currentNoteIndex];
      if (currentNote && xScale) {
        const currentStartTime = currentNote[0];
        const transformX = xScale(currentStartTime);
        notesGroup.attr("transform", `translate(${-transformX}, 0)`);
      }

      // Balls will be initialized when cursor is positioned (in moveTo function)
    }
  }

  // Function to initialize balls from cursor position
  function initializeBalls() {
    if (ballsInitialized || index <= 0 || !currentCoords || !xScale || !rScale || !colorScale || !width || !height) {
      return;
    }

    ballsInitialized = true;

    // Clear any existing notes first
    fallingNotes.forEach((note) => {
      Matter.Composite.remove(engine.world, note);
    });
    fallingNotes.length = 0;

    // Get cursor position
    const {left, right, bottom} = currentCoords;
    const startX = (left + right) / 2;
    const startY = bottom + 10;

    // Create balls for all played notes - all falling from cursor position
    const playedCount = Math.min(index, timeNotes.length);

    // Limit the number of balls to avoid performance issues
    const maxBallsToShow = 200;
    const step = Math.max(1, Math.floor(playedCount / maxBallsToShow));

    for (let i = 0; i < playedCount; i += step) {
      const [startTime, noteGroup] = timeNotes[i];

      for (const note of noteGroup) {
        // Create the ball properties
        const radius = rScale(note.velocity);
        const fill = colorScale(note.midiNote);

        // All balls start from cursor position
        const x = startX + (Math.random() - 0.5) * 10; // Small random spread

        // Distribute y positions vertically to show they've been falling
        // Earlier notes (lower index) have fallen further (higher y value)
        const progressRatio = i / playedCount;
        const fallDistance = progressRatio * height * 0.6; // Can fall up to 60% of screen height
        const y = startY + fallDistance + (Math.random() - 0.5) * 20;

        // Make sure balls stay within screen bounds
        const clampedX = Math.max(radius, Math.min(width - radius, x));
        const clampedY = Math.max(radius, Math.min(height - radius - 20, y));

        // Create the ball
        const ball = Matter.Bodies.circle(clampedX, clampedY, radius);
        ball.__radius__ = radius;
        ball.__fill__ = fill;

        // Give it downward velocity to continue falling
        Matter.Body.setVelocity(ball, {
          x: (Math.random() - 0.5) * 0.5,
          y: 0.5 + Math.random() * 0.5,
        });

        fallingNotes.push(ball);
        Matter.Composite.add(engine.world, ball);
      }
    }
  }

  // Initialize progress after resize sets up the scales
  // Use setTimeout to ensure resize completes first
  setTimeout(() => {
    initializeProgress();
  }, 0);

  async function play() {
    start = true;

    t += 0.01;
    const diff = Date.now() - lastTime;
    lastTime = Date.now();

    // Play the piano
    if (Tone.getContext().state !== "running") await Tone.start();
    const i = index % timeNotes.length;
    const [, noteGroup] = timeNotes[i];
    for (const note of noteGroup) {
      const frequency = midiToFrequency(note.midiNote);
      const normalizedVelocity = note.velocity / 127; // Normalize velocity to 0-1
      synth.triggerAttackRelease(frequency, note.duration, Tone.now(), normalizedVelocity);
    }
    index++;

    // Update the percentage text
    const percentage = Math.floor((index / timeNotes.length) * 100);
    pText.text(`${percentage}%`);

    // Emit progress event for storage
    window.dispatchEvent(
      new CustomEvent("sound-progress", {
        detail: {index, percentage},
      })
    );

    // Add falling notes
    for (const note of noteGroup) {
      const {left, right, bottom} = currentCoords;
      const x = (left + right) / 2;
      const y = bottom + 10;
      createNote(x, y, rScale(note.velocity), colorScale(note.midiNote));
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

  async function playSound(name) {
    if (Tone.getContext().state !== "running") await Tone.start();
    kit.player(name).start();
  }

  return {
    resize,
    isStarted: () => start,
    stop() {
      start = false;
      stopAutoPlay();
    },
    resume() {
      start = true;
      resetInactivityTimer();
    },
    async playSaveSound() {
      await playSound("kick");
    },
    async playSuccessSound() {
      await playSound("snare");
    },
    async playFailureSound() {
      await playSound("hho");
    },
    async playMoveSound() {
      await playSound("hh");
    },
    destroy() {
      timer.stop();
      Matter.Engine.clear(engine);
      stopAutoPlay();
      clearTimeout(inactivityTimer);
      window.removeEventListener("piece-selection-change", handlePieceChange);
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

      // Initialize balls from cursor position if not already done
      if (!ballsInitialized && index > 0 && currentCoords) {
        initializeBalls();
      }
    },
    play() {
      resetInactivityTimer();
      return play();
    },
  };
}
