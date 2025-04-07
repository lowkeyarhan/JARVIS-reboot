import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Import highlight.js with all languages
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/github-dark.css";

// Register common languages - these are the ones most frequently used in GitHub
hljs.registerAliases("jsx", { languageName: "javascript" });
hljs.registerAliases("tsx", { languageName: "typescript" });
hljs.registerAliases("bash", { languageName: "shell" });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
