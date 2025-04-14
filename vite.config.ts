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
})
