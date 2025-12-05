# MIDI Conversion Scripts

## Converting MIDI to Piano Editor Format

To convert a MIDI file (like "Call of Silence") to the piano editor's JSON format:

### Step 1: Get a MIDI File

Find a MIDI file for your piece (e.g., from [Musescore](https://musescore.com) or other MIDI sources)

### Step 2: Install Dependencies

Since the project already uses Tone.js, we use `@tonejs/midi`:

```bash
npm install @tonejs/midi
```

### Step 3: Run the Conversion Script

```bash
node scripts/convert-midi-tone.js <input.mid> <output.json>
```

**Example:**

```bash
node scripts/convert-midi-tone.js call_of_silence.mid src/data/call_of_silence.json
```

The script will:

1. Load the MIDI file
2. Extract note events (noteOn/noteOff) from all tracks
3. Convert to the format: `[startTime, endTime, midiNote, velocity]`
4. Sort notes by start time
5. Calculate `numScreens` based on total duration
6. Generate `ghostData` based on note density

### Data Format

The JSON file should have this structure:

```json
{
  "pieceDataVersion": 1,
  "pieceData": [startTime, endTime, midiNote, velocity, ...],
}
```

Where:

- `startTime` and `endTime` are in **milliseconds**
- `midiNote` is the MIDI note number (0-127)
- `velocity` is the note velocity (0-127)
- `numScreens` is calculated based on the total duration and screen size
