import {keymap} from "@codemirror/view";

let webcamState = {
  isActive: false,
  stream: null,
  video: null,
  canvas: null,
  ctx: null,
  animationFrame: null,
  bgParent: null,
  overlay: null,
  tempCanvas: null,
  tempCtx: null,
};

// ASCII character set from dark to light
const ASCII_CHARS = "Ñ@#W$9876543210?!abc;:+=-,._          ".split("").reverse().join("");
const CHAR_COUNT = ASCII_CHARS.length;

function createWebcamManager(bgParent) {
  // Create video element (hidden, used to capture stream)
  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.style.display = "none";
  document.body.appendChild(video);
  webcamState.video = video;

  // Create temporary canvas for capturing video frames
  const tempCanvas = document.createElement("canvas");
  tempCanvas.style.display = "none";
  webcamState.tempCanvas = tempCanvas;
  webcamState.tempCtx = tempCanvas.getContext("2d");

  // Create canvas element for rendering ASCII art
  const canvas = document.createElement("canvas");
  canvas.className = "webcam-canvas";
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.objectFit = "cover";
  canvas.style.zIndex = "-1";
  canvas.style.opacity = "0";
  canvas.style.transition = "opacity 0.3s ease";
  webcamState.canvas = canvas;
  webcamState.ctx = canvas.getContext("2d");
  webcamState.bgParent = bgParent;

  // Set canvas font for ASCII rendering
  webcamState.ctx.font = "12px monospace";
  webcamState.ctx.textAlign = "left";
  webcamState.ctx.textBaseline = "top";

  // Create overlay layer to make webcam less obvious
  const overlay = document.createElement("div");
  overlay.className = "webcam-overlay";
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "#0d1117";
  overlay.style.opacity = "0.7";
  overlay.style.zIndex = "-0.9";
  overlay.style.pointerEvents = "none";
  overlay.style.transition = "opacity 0.3s ease";
  webcamState.overlay = overlay;

  // Add canvas and overlay to bg-parent (insert at the beginning to ensure it's behind other elements)
  bgParent.insertBefore(canvas, bgParent.firstChild);
  bgParent.insertBefore(overlay, canvas.nextSibling);

  // Handle window resize
  const resizeObserver = new ResizeObserver(() => {
    if (webcamState.isActive) {
      resizeCanvas();
    }
  });
  resizeObserver.observe(bgParent);

  async function startWebcam() {
    if (webcamState.isActive) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {width: 1280, height: 720},
      });

      webcamState.stream = stream;
      webcamState.video.srcObject = stream;
      webcamState.isActive = true;

      // Wait for video to be ready
      webcamState.video.addEventListener(
        "loadedmetadata",
        () => {
          resizeCanvas();
          drawFrame();
        },
        {once: true}
      );
    } catch (error) {
      console.error("Error accessing webcam:", error);
      alert("Unable to access webcam. Please check permissions.");
    }
  }

  function stopWebcam() {
    if (!webcamState.isActive) return;

    if (webcamState.stream) {
      webcamState.stream.getTracks().forEach((track) => track.stop());
      webcamState.stream = null;
    }

    if (webcamState.animationFrame) {
      cancelAnimationFrame(webcamState.animationFrame);
      webcamState.animationFrame = null;
    }

    if (webcamState.canvas) {
      webcamState.canvas.style.opacity = "0";
    }
    if (webcamState.overlay) {
      webcamState.overlay.style.opacity = "0";
    }
    setTimeout(() => {
      if (webcamState.ctx) {
        webcamState.ctx.clearRect(0, 0, webcamState.canvas.width, webcamState.canvas.height);
      }
    }, 300);

    webcamState.isActive = false;
  }

  function resizeCanvas() {
    if (!webcamState.canvas || !webcamState.bgParent) return;

    const rect = webcamState.bgParent.getBoundingClientRect();
    webcamState.canvas.width = rect.width;
    webcamState.canvas.height = rect.height;

    // Update font size based on canvas size for better readability
    const fontSize = Math.max(8, Math.floor(rect.width / 120));
    webcamState.ctx.font = `${fontSize}px monospace`;
  }

  function videoToASCII(video, outputCanvas, outputCtx) {
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const tempCanvas = webcamState.tempCanvas;
    const tempCtx = webcamState.tempCtx;

    // Set temp canvas size to video dimensions
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;

    // Draw video frame to temp canvas
    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

    // Get image data
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    // Calculate character size based on canvas dimensions
    const charWidth = parseInt(outputCtx.font.match(/\d+/)?.[0] || "12");
    const charHeight = charWidth * 1.5; // Approximate character height
    const cols = Math.floor(outputCanvas.width / charWidth);
    const rows = Math.floor(outputCanvas.height / charHeight);

    // Sample step size
    const stepX = Math.max(1, Math.floor(tempCanvas.width / cols));
    const stepY = Math.max(1, Math.floor(tempCanvas.height / rows));

    // Clear canvas
    outputCtx.fillStyle = "#0d1117";
    outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    // Render ASCII art
    outputCtx.fillStyle = "#58a6ff";

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = Math.min(col * stepX, tempCanvas.width - 1);
        const y = Math.min(row * stepY, tempCanvas.height - 1);

        const idx = (y * tempCanvas.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Convert to grayscale (luminance formula)
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // Map brightness to ASCII character
        const charIndex = Math.floor((gray / 255) * (CHAR_COUNT - 1));
        const char = ASCII_CHARS[charIndex];

        const xPos = col * charWidth;
        const yPos = row * charHeight;

        outputCtx.fillText(char, xPos, yPos);
      }
    }
  }

  function drawFrame() {
    if (!webcamState.isActive || !webcamState.video || !webcamState.canvas || !webcamState.ctx) {
      return;
    }

    const video = webcamState.video;
    const canvas = webcamState.canvas;
    const ctx = webcamState.ctx;

    // Resize canvas if needed
    const rect = webcamState.bgParent.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      resizeCanvas();
    }

    // Convert video to ASCII art
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      videoToASCII(video, canvas, ctx);
      canvas.style.opacity = "0.6";
      if (webcamState.overlay) {
        webcamState.overlay.style.opacity = "0.5";
      }
    }

    webcamState.animationFrame = requestAnimationFrame(drawFrame);
  }

  function toggleWebcam() {
    if (webcamState.isActive) {
      stopWebcam();
    } else {
      startWebcam();
    }
  }

  function destroy() {
    stopWebcam();
    resizeObserver.disconnect();
    if (webcamState.video && webcamState.video.parentElement) {
      webcamState.video.parentElement.removeChild(webcamState.video);
    }
    if (webcamState.canvas && webcamState.canvas.parentElement) {
      webcamState.canvas.parentElement.removeChild(webcamState.canvas);
    }
    if (webcamState.overlay && webcamState.overlay.parentElement) {
      webcamState.overlay.parentElement.removeChild(webcamState.overlay);
    }
    // tempCanvas doesn't need to be removed from DOM since it's not added
    webcamState = {
      isActive: false,
      stream: null,
      video: null,
      canvas: null,
      ctx: null,
      animationFrame: null,
      bgParent: null,
      overlay: null,
      tempCanvas: null,
      tempCtx: null,
    };
  }

  return {
    toggleWebcam,
    destroy,
  };
}

// Global webcam manager instance
let webcamManager = null;

export function initWebcam(bgParent) {
  if (webcamManager) {
    webcamManager.destroy();
  }
  webcamManager = createWebcamManager(bgParent);
}

export function toggleWebcam() {
  if (webcamManager) {
    webcamManager.toggleWebcam();
  }
}

export function destroyWebcam() {
  if (webcamManager) {
    webcamManager.destroy();
    webcamManager = null;
  }
}

export function webcamExtension() {
  return keymap.of([
    {
      key: "Mod-o",
      run: () => {
        toggleWebcam();
        return true;
      },
      preventDefault: true,
    },
  ]);
}
