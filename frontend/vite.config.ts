import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "VITE_");
  return {
    plugins: [react()],
    server: {
      host: env.VITE_FRONTEND_HOST || "0.0.0.0",
      port: Number(env.VITE_FRONTEND_PORT) || 8080,
    },
    preview: {
      host: env.VITE_FRONTEND_HOST || "0.0.0.0",
      port: Number(env.VITE_FRONTEND_PORT) || 8080,
    },
    envDir: path.resolve(__dirname, ".."),
  };
});
