import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pendoTrack } from "./pendo";

const app = express();

// Allow all origins by default; restrict via CORS_ORIGIN (comma-separated)
// for deployed environments where the web origin is known.
const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim());
app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));
app.use(express.json());

// In-memory state — intentionally simple so tests can assert exact values.
let counter = 0;
let lastAction = "none";

const state = () => ({ counter, lastAction });

app.get("/api/state", (_req, res) => {
  res.json(state());
});

app.post("/api/increment", (req, res) => {
  const previousValue = counter;
  counter += 1;
  lastAction = "increment";
  res.json(state());
  // Fires after the server applies the change. Not awaited so the response isn't delayed.
  void pendoTrack(req, "Counter incremented", { counter_value: counter, previous_value: previousValue });
});

app.post("/api/decrement", (req, res) => {
  const previousValue = counter;
  counter -= 1;
  lastAction = "decrement";
  res.json(state());
  // Fires after the server applies the change. Not awaited so the response isn't delayed.
  void pendoTrack(req, "Counter decremented", { counter_value: counter, previous_value: previousValue });
});

app.post("/api/reset", (req, res) => {
  const previousValue = counter;
  counter = 0;
  lastAction = "reset";
  res.json(state());
  // Fires after the server applies the change. Not awaited so the response isn't delayed.
  void pendoTrack(req, "Counter reset", { counter_value: counter, previous_value: previousValue });
});

// Serve the built SPA (after the API routes so it doesn't shadow /api/*).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(__dirname, "../../web/dist");
app.use(express.static(webDist));
app.get("*", (_req, res) => res.sendFile(path.join(webDist, "index.html")));

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
