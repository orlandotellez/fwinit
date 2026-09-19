import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppBootstrap } from "@/context/AppBootstrap";
import App from "@/App";
import "@/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppBootstrap>
      <App />
    </AppBootstrap>
  </StrictMode>,
);