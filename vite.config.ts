import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    strictPort: true,
    hmr: false, // Disable HMR completely - use manual refresh instead
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'recharts', 'lucide-react', 'decimal.js', 'dexie'],
  },
})
