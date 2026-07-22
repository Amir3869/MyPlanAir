// vite.config.ts
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],

      // ✅ FIX — Augmente la limite à 4MB pour nos chunks
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,

        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}"],

        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler:    "CacheFirst",
            options: {
              cacheName:  "unsplash-images",
              expiration: {
                maxEntries:    50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler:    "NetworkFirst",
            options: {
              cacheName:             "weather-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries:    10,
                maxAgeSeconds: 60 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\.exchangerate\.host\/.*/i,
            handler:    "NetworkFirst",
            options: {
              cacheName:             "currency-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries:    5,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/mytrip-api\.amirsfr38\.workers\.dev\/.*/i,
            handler:    "NetworkFirst",
            options: {
              cacheName:             "api-cache",
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries:    20,
                maxAgeSeconds: 60 * 60 * 2,
              },
            },
          },
          {
            urlPattern: /^https:\/\/img\.logo\.dev\/.*/i,
            handler:    "CacheFirst",
            options: {
              cacheName: "partner-logos",
              expiration: {
                maxEntries:    80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler:    "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler:    "CacheFirst",
            options: {
              cacheName:  "google-fonts-webfonts",
              expiration: {
                maxEntries:    20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },

      manifest: {
        name:             "My Plan’Air — Carnet de Voyage Premium",
        short_name:       "My Plan’Air",
        description:      "My Plan’Air organise vos voyages avec style et intelligence. Gratuit.",
        theme_color:      "#07070b",
        background_color: "#07070b",
        display:          "standalone",
        orientation:      "portrait",
        scope:            "/",
        start_url:        "/",
        lang:             "fr",
        icons: [
          {
            src:   "/icon-192.png",
            sizes: "192x192",
            type:  "image/png",
          },
          {
            src:     "/icon-512.png",
            sizes:   "512x512",
            type:    "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  server: {
    port: 5173,
    host: true,
  },

  build: {
    outDir:    "dist",
    sourcemap: false,

    // ✅ FIX — Meilleur code splitting pour réduire taille chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          vendor:  ["react", "react-dom", "react-router-dom"],
          // Animations
          motion:  ["framer-motion"],
          // State
          store:   ["zustand"],
          // Carte (gros chunk séparé)
          map:     ["leaflet", "react-leaflet"],
          // Clerk auth
          clerk:   ["@clerk/clerk-react"],
          // Icons
          icons:   ["lucide-react"],
        },
      },
    },
  },

  optimizeDeps: {
    include: ["react", "react-dom", "zustand"],
  },
});
