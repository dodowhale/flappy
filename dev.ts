import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { SolidPlugin } from "bun-plugin-solid";

const PORT = 3000;

// 빌드 프로세스
console.log("Building project...");
const result = await Bun.build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  naming: "[name].js",
  plugins: [SolidPlugin()],
  minify: false,
});

if (!result.success) {
  console.error("Build failed", result.logs);
} else {
  console.log("Build successful");
}

const app = new Hono();

// 로깅 미들웨어
app.use("*", async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`);
  await next();
});

// 정적 파일 서빙 (dist 폴더 및 루트 에셋)
app.use("/dist/*", serveStatic({ root: "." }));
app.use("/assets/*", serveStatic({ root: "." })); // 향후 이미지/사운드용

// 메인 페이지
app.get("/", async (c) => {
  return c.html(await Bun.file("index.html").text());
});

console.log(`Server running at http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
