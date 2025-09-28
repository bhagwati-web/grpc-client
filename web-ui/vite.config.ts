import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for assets
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Proxy API calls to the Go backend
      '/grpc': 'http://localhost:50051',
      '/metadata': 'http://localhost:50051',
      '/collection': 'http://localhost:50051',
      '/v2': 'http://localhost:50051',
    },
  },
})
