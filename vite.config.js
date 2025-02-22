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
});
