#!/usr/bin/env node

/**
 * MIDI to Piano Editor JSON Converter using @tonejs/midi
 *
 * First install: npm install @tonejs/midi
 *
 * Usage: node scripts/convert-midi-tone.js <input.mid> <output.json>
 *
 * Example: node scripts/convert-midi-tone.js call_of_silence.mid src/data/call_of_silence.json
 */

import fs from "fs";
import pkg from "@tonejs/midi";
const {Midi} = pkg;

function convertMIDIToJSON(midiPath, outputPath) {
  try {
    console.log(`Reading MIDI file: ${midiPath}`);
    const midiData = fs.readFileSync(midiPath);
    const midi = new Midi(midiData);

    const pieceData = [];

    // Process each track
    midi.tracks.forEach((track, trackIndex) => {
      track.notes.forEach((note) => {
        // Convert time from seconds to milliseconds
        const startTime = Math.round(note.time * 1000);
        const endTime = Math.round((note.time + note.duration) * 1000);
        const midiNote = note.midi;
        const velocity = Math.round(note.velocity * 127); // Convert 0-1 to 0-127

        pieceData.push(startTime, endTime, midiNote, velocity);
      });
    });

    // Sort by start time
    const notes = [];
    for (let i = 0; i < pieceData.length; i += 4) {
      notes.push({
        startTime: pieceData[i],
        endTime: pieceData[i + 1],
        midiNote: pieceData[i + 2],
        velocity: pieceData[i + 3],
      });
    }
    notes.sort((a, b) => a.startTime - b.startTime);

    // Flatten back to array
    const sortedPieceData = [];
    notes.forEach((note) => {
      sortedPieceData.push(note.startTime, note.endTime, note.midiNote, note.velocity);
    });

    const jsonData = {
      pieceDataVersion: 1,
      pieceData: sortedPieceData,
    };

    // Write output
    fs.writeFileSync(outputPath, JSON.stringify(jsonData));
    console.log(`✓ Converted ${midiPath} to ${outputPath}`);
    console.log(`  Notes: ${notes.length}`);
    const totalDuration = Math.max(...notes.map((n) => n.endTime));
    console.log(`  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  } catch (error) {
    if (error.message.includes("Cannot find module")) {
      console.error("Error: @tonejs/midi not installed.");
      console.error("Please run: npm install @tonejs/midi");
    } else {
      console.error("Error converting MIDI:", error.message);
    }
    process.exit(1);
  }
}

// CLI usage
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: node scripts/convert-midi-tone.js <input.mid> <output.json>");
  console.log("\nExample:");
  console.log("  node scripts/convert-midi-tone.js call_of_silence.mid src/data/call_of_silence.json");
  console.log("\nFirst install: npm install @tonejs/midi");
  process.exit(1);
}

convertMIDIToJSON(args[0], args[1]);
