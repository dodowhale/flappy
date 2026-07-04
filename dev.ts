import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { SolidPlugin } from "bun-plugin-solid";

const PORT = 3000;

console.log("Building project...");
await Bun.build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  naming: "[name].js",
  plugins: [SolidPlugin()],
  minify: false,
});

const app = new Hono();

const LEADERBOARD_FILE = "./leaderboard.json";

async function loadLeaderboard() {
  try {
    const file = Bun.file(LEADERBOARD_FILE);
    if (await file.exists()) {
      return await file.json();
    }
  } catch (e) {
    console.error("Failed to load leaderboard, using default.", e);
  }
  return [
    { name: "ACE", score: 10 },
    { name: "BIRD", score: 5 },
    { name: "FLY", score: 3 }
  ];
}

async function saveLeaderboard(data: { name: string, score: number }[]) {
  try {
    await Bun.write(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to save leaderboard.", e);
  }
}

let leaderboard: { name: string, score: number }[] = await loadLeaderboard();

app.use("*", async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`);
  await next();
});

// API Routes
app.get("/api/leaderboard", (c) => c.json(leaderboard));
app.post("/api/leaderboard", async (c) => {
    const { name, score } = await c.req.json();
    leaderboard.push({ name, score });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5); // Top 5
    await saveLeaderboard(leaderboard);
    return c.json({ success: true, leaderboard });
});

app.use("/dist/*", serveStatic({ root: "." }));
app.use("/assets/*", serveStatic({ root: "." }));

app.get("/manifest.json", async (c) => {
  return c.body(await Bun.file("./manifest.json").text(), 200, {
    "Content-Type": "application/manifest+json; charset=UTF-8"
  });
});

app.get("/sw.js", async (c) => {
  return c.body(await Bun.file("./sw.js").text(), 200, {
    "Content-Type": "application/javascript; charset=UTF-8"
  });
});

app.get("/", async (c) => {
  return c.html(await Bun.file("index.html").text());
});

console.log(`Server running at http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
