import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // Three.js в отдельном vendor-чанке стабильно около 500 kB.
    // Поднимаем порог предупреждения, чтобы не получать ложный шум в CI.
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/three/")) return "vendor-three";
          if (id.includes("/simplex-noise/")) return "vendor-noise";
          return "vendor";
        },
      },
    },
  },
});
