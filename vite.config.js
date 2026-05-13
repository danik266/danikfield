import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 3000 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        daily: resolve(__dirname, 'daily.html'),
        leaderboard: resolve(__dirname, 'leaderboard.html'),
        stats: resolve(__dirname, 'stats.html'),
        shop: resolve(__dirname, 'shop.html'),
      }
    }
  }
});
