import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";
import react from '@vitejs/plugin-react'
import { VitePluginRadar } from "vite-plugin-radar";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(),  VitePluginRadar({
    // Google Analytics tag injection
    analytics: {
      id: 'G-SEYCYS6JX9',
    },
    // Google Tag Manager
    gtm: {
        id: "GTM-PNBFB2FT",
      },
    }),],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Example: Split react and react-dom into a separate chunk
          'react-vendors': ['react', 'react-dom'],
          // You can add more: 'ui-libs': ['@mui/material', 'react-toastify']
        }
      }
    }
  }
})
