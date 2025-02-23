// vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
  root: "public", // Use the "public" folder as the project root
  build: {
    rollupOptions: {
      external: ["jquery"],
    },
    outDir: "../dist", // Output the built files into a "dist" folder at the project root
    emptyOutDir: true,
  },
});
