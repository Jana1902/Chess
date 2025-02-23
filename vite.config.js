// vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
  base: "./", // Use relative paths
  publicDir: "public",
  build: {
    rollupOptions: {
      external: ["jquery"],
    },
    outDir: "../dist", // Output the built files into a "dist" folder at the project root
    emptyOutDir: true,
  },
});
