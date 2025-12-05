import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Initialize melody object early so it's available when sketches run
if (typeof window !== "undefined") {
  window.melody = window.melody || {A: 0};
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
