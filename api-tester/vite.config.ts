import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Escucha exclusivamente en la interfaz de loopback (seguridad local estricta)
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    cors: true,
  },
});

