import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const extensionRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: extensionRoot,
  base: "./",
  publicDir: "public",
  plugins: [
    react(),
    {
      name: "extension-netlify-client",
      enforce: "pre",
      resolveId(source, importer) {
        const normalizedImporter = importer?.replaceAll("\\\\", "/") ?? "";
        if (source === "./client" && normalizedImporter.includes("/src/lib/netlify/")) {
          return fileURLToPath(new URL("src/lib/apiClient.ts", import.meta.url));
        }
      }
    },
    {
      name: "extension-remove-remote-fonts",
      enforce: "pre",
      transform(code, id) {
        if (id.replaceAll("\\\\", "/").endsWith("/src/index.css")) {
          return code.replace(/^@import url\(["']https:\/\/fonts\.googleapis\.com[^\n]+\n/m, "");
        }
      }
    }
  ],
  resolve: {
    alias: [
      { find: /^(?:\.\.\/|\.\/)*lib\/netlify\/client$/, replacement: fileURLToPath(new URL("src/lib/apiClient.ts", import.meta.url)) },
      { find: /^(?:\.\.\/|\.\/)*lib\/supabase\/client$/, replacement: fileURLToPath(new URL("src/lib/supabase/client.ts", import.meta.url)) },
      { find: /^(?:\.\.\/|\.\/)*lib\/supabase\/gameActions$/, replacement: fileURLToPath(new URL("src/lib/supabase/gameActions.ts", import.meta.url)) },
      { find: /^(?:\.\.\/|\.\/)*lib\/supabase\/rooms$/, replacement: fileURLToPath(new URL("src/lib/supabase/rooms.ts", import.meta.url)) },
      { find: /^(?:\.\.\/|\.\/)*lib\/supabase\/realtime$/, replacement: fileURLToPath(new URL("src/lib/supabase/realtime.ts", import.meta.url)) }
    ]
  },
  define: {
    "import.meta.env.VITE_ONLINE_BACKEND": JSON.stringify("netlify"),
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify("https://movie-guess-battle.netlify.app")
  },
  build: {
    sourcemap: false,
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
