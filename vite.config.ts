import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // increase if you accept larger single files, or reduce after improving splitting
    chunkSizeWarningLimit: 1500, // kB
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          // group core React libs
          if (id.includes("react") || id.includes("react-dom") || id.includes("@tanstack")) {
            return "vendor-react";
          }
          // UI / charts / icons
          if (id.includes("recharts") || id.includes("lucide-react") || id.includes("sonner")) {
            return "vendor-ui";
          }
          // heavy single-file libs used for printing/export
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("file-saver")) {
            return "vendor-print";
          }
          // group remaining node_modules by package name to avoid one huge chunk
          const parts = id.split(`node_modules${path.sep}`);
          if (parts[1]) {
            const pkg = parts[1].split(path.sep)[0];
            return `vendor-${pkg}`;
          }
        }
      }
    },
  },
});