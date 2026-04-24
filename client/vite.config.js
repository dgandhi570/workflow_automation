import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy libraries into separate chunks for better caching
          "vendor-react": ["react", "react-dom"],
          "vendor-markdown": ["react-markdown"],
          "vendor-syntax": ["react-syntax-highlighter"],
        },
      },
    },
  },
});
