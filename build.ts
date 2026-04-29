import { SolidPlugin } from "bun-plugin-solid";

const result = await Bun.build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  naming: "[name].js",
  plugins: [SolidPlugin()],
  minify: true,
});

if (!result.success) {
  console.error("Build failed", result.logs);
} else {
  console.log("Build successful");
}
