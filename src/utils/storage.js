import {predicates, objects} from "friendly-words";

const STORAGE_KEY = "recho-melody-sketches";
const ACTIVE_SKETCH_KEY = "recho-melody-active-sketch";

export const INITIAL_CODE = `p.setup = () => {
  p.createCanvas(200, 200);
};
`;

function generateSketchName() {
  const predicate = predicates[Math.floor(Math.random() * predicates.length)];
  const object = objects[Math.floor(Math.random() * objects.length)];
  return `${predicate}-${object}`;
}

export function generateSketchId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function getAllSketches() {
  try {
    const sketchesJson = localStorage.getItem(STORAGE_KEY);
    if (!sketchesJson) return [];
    return JSON.parse(sketchesJson);
  } catch (error) {
    console.error("Error loading sketches from localStorage:", error);
    return [];
  }
}

export function getSketch(sketchId) {
  const sketches = getAllSketches();
  return sketches.find((s) => s.id === sketchId) || null;
}

export function saveSketch(sketch) {
  const sketches = getAllSketches();
  const existingIndex = sketches.findIndex((s) => s.id === sketch.id);

  if (existingIndex >= 0) {
    sketches[existingIndex] = sketch;
  } else {
    sketches.push(sketch);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sketches));
  } catch (error) {
    console.error("Error saving sketch to localStorage:", error);
  }
}

export function deleteSketch(sketchId) {
  const sketches = getAllSketches();
  const filtered = sketches.filter((s) => s.id !== sketchId);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting sketch from localStorage:", error);
  }
}

export function createNewSketch(files, initialCode = INITIAL_CODE) {
  const sketch = {
    id: generateSketchId(),
    name: generateSketchName(),
    files: files || [],
    activeFileId: null,
    soundProgress: {index: 0, percentage: 0},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // If no files provided, create a default one
  if (!files || files.length === 0) {
    const initialX = typeof window !== "undefined" ? window.innerWidth / 2 : 0;
    const initialY = 0;
    const defaultFileId = generateSketchId();
    sketch.files = [
      {
        id: defaultFileId,
        name: "Canvas 1",
        code: initialCode,
        position: {x: initialX, y: initialY},
      },
    ];
    sketch.activeFileId = defaultFileId;
  } else if (files.length > 0) {
    // Set the first file as active if files are provided
    sketch.activeFileId = files[0].id;
  }

  saveSketch(sketch);
  return sketch;
}

export function getActiveSketchId() {
  try {
    return localStorage.getItem(ACTIVE_SKETCH_KEY);
  } catch (error) {
    console.error("Error getting active sketch ID:", error);
    return null;
  }
}

export function setActiveSketchId(sketchId) {
  try {
    if (sketchId) {
      localStorage.setItem(ACTIVE_SKETCH_KEY, sketchId);
    } else {
      localStorage.removeItem(ACTIVE_SKETCH_KEY);
    }
  } catch (error) {
    console.error("Error setting active sketch ID:", error);
  }
}

export function getLastActiveSketch() {
  const activeSketchId = getActiveSketchId();
  if (activeSketchId) {
    const sketch = getSketch(activeSketchId);
    if (sketch) return sketch;
  }

  // If no active sketch, return the most recently updated one
  const sketches = getAllSketches();
  if (sketches.length === 0) return null;

  return sketches.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
}
