import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Allow deployment to sub-path (GitHub Pages)
  plugins: [vue()],
})
