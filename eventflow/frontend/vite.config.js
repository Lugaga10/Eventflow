// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    strictPort: true,
    allowedHosts: true, // Specifically for Vite 6+
    cors: true,         // Enable Cross-Origin Resource Sharing
    hmr: {
      clientPort: 443,  // Force HMR to use ngrok's HTTPS port
    },
  },
})