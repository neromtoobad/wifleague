import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const api = process.env.FS_API ?? "http://localhost:8787";
const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root,
  plugins: [react()],
  server: { proxy: { "/api": api, "/og": api, "^/s/": api }, fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] } },
  build: { outDir: fileURLToPath(new URL("./dist", import.meta.url)), emptyOutDir: true },
});
