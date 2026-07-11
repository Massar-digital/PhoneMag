import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // Production build settings
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    minify: 'terser', // Use terser for better minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true, // Remove debugger statements
      },
    },
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@heroicons/react', 'clsx'],
          query: ['@tanstack/react-query'],
          forms: ['react-hook-form', 'yup', '@hookform/resolvers'],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable'],
          utils: ['axios', 'html2canvas'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  server: {
    // Development server settings
    port: 3000,
    host: true, // Listen on all addresses
    open: true, // Auto-open browser
  },
  preview: {
    // Preview server settings (for testing production build)
    port: 3001,
    host: true,
  },
})
