import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const extensionRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: extensionRoot,
  base: "./",
  publicDir: "public",
  plugins: [react()],
  define: {
    "import.meta.env.VITE_ONLINE_BACKEND": JSON.stringify("netlify"),
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify("https://movie-guess-battle.netlify.app")
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        popup: fileURLToPath(new URL("popup.html", import.meta.url)),
        sidepanel: fileURLToPath(new URL("sidepanel.html", import.meta.url))
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
