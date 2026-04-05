import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineManifest } from "@crxjs/vite-plugin";
import { readFileSync } from "node:fs";

const packageData = JSON.parse(readFileSync("./package.json", "utf-8"));
//@ts-ignore
const isDev = process.env.NODE_ENV == "development";

const manifest = defineManifest({
  name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ""}`,
  description: packageData.description,
  version: packageData.version,
  manifest_version: 3,
  icons: {
    // 16: 'img/logo-16.png',
    // 48: 'img/logo-48.png',
    // 128: 'img/logo-128.png',
  },
  // action: {
  //   default_popup: 'popup.html',
  //   default_icon: 'img/logo-48.png',
  // },
  options_page: "options.html",
  // devtools_page: 'devtools.html',
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*"],
      js: ["src/content/index.ts"],
    },
  ],
  // web_accessible_resources: [
  //   {
  //     // resources: ['img/logo-16.png', 'img/logo-32.png', 'img/logo-48.png', 'img/logo-128.png'],
  //     matches: [],
  //   },
  // ],
  permissions: ["storage"],
  host_permissions: [
    "http://localhost:*/*",
    "https://localhost:*/*",
    "http://127.0.0.1:*/*",
    "https://generativelanguage.googleapis.com/*",
  ],
});

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    build: {
      emptyOutDir: true,
      outDir: "build",
      rollupOptions: {
        output: {
          chunkFileNames: "assets/chunk-[hash].js",
        },
      },
    },
    plugins: [crx({ manifest }), react()],
    legacy: {
      skipWebSocketTokenCheck: true,
    },
  };
});
