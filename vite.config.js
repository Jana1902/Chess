// vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      // Adjust the path if necessary. This example assumes that the file is at node_modules/stockfish/stockfish.js
      stockfish: "stockfish/stockfish.js",
    },
  },
  optimizeDeps: {
    exclude: ["stockfish"],
  },
  base: "./", // Ensures relative paths work
  publicDir: "public", // Ensures assets like Stockfish.js are served
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
