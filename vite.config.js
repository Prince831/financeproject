import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate heavy libraries for better caching
          'recharts-vendor': ['recharts'],
          'icons-vendor': ['lucide-react'],
          'react-vendor': ['react', 'react-dom'],
          'axios-vendor': ['axios']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    sourcemap: false
  },
  server: {
    hmr: {
      overlay: false
    }
  }
})
