export const env = {
  backend: import.meta.env.VITE_BACKEND_URL || "",
  timeout: Number(import.meta.env.VITE_TIMEOUT || 90000),
}