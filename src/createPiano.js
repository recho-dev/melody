import * as Tone from "tone";
import * as d3 from "d3";
import BeethovenMoonlight from "./data/beethoven_moonlight.json";

// Convert MIDI note number to frequency
function midiToFrequency(midi) {
  return Tone.Frequency(midi, "midi").toFrequency();
}

export function createPiano() {
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
  const {pieceData} = BeethovenMoonlight;
  for (let i = 0; i < pieceData.length; i += 4) {
    const startTime = pieceData[i];
    const endTime = pieceData[i + 1];
    const midiNote = pieceData[i + 2];
    const velocity = pieceData[i + 3];
    const durationMs = endTime - startTime;
    notes.push({startTime, endTime, midiNote, velocity, duration: Math.max(0.1, durationMs / 1000)});
  }

  const timeNotes = d3.groups(notes, (d) => d.startTime);

  let index = 0;

  return {
    async play() {
      if (Tone.getContext().state !== "running") await Tone.start();
      if (index >= timeNotes.length) index = 0;
      const [, notes] = timeNotes[index];
      for (const note of notes) {
        const frequency = midiToFrequency(note.midiNote);
        const normalizedVelocity = note.velocity / 127; // Normalize velocity to 0-1
        synth.triggerAttackRelease(frequency, note.duration, Tone.now(), normalizedVelocity);
      }
      index++;
    },
  };
}
