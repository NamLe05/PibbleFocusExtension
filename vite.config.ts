import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        assistant: resolve(__dirname, 'src/content/contentScript.ts'),
        petOverlay: resolve(__dirname, 'src/content/petOverlay.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'assistant') return 'content/assistant.js';
          if (chunkInfo.name === 'petOverlay') return 'content/petOverlay.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  publicDir: 'public',
});