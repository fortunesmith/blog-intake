import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // Use the IPv4 loopback explicitly. On macOS, "localhost" can resolve
      // to the IPv6 loopback (::1) first, which — since Monterey — is where
      // the built-in AirPlay Receiver listens on port 5000, silently
      // intercepting requests meant for the Flask dev server.
      '/api': 'http://127.0.0.1:5000',
    },
  },
})
