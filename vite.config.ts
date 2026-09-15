import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
// `VITE_BASE` lets CI (e.g. GitHub Pages) build the app under a subdirectory.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
