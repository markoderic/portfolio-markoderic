import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles.css"; // the real vanilla stylesheet, ported verbatim

// No StrictMode: it double-mounts, which makes the WebGL canvases spin up twice.
ReactDOM.createRoot(document.getElementById("root")).render(
  <HashRouter>
    <App />
  </HashRouter>
);
