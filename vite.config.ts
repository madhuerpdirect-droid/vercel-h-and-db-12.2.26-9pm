
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Base removed for Vercel root-level deployment
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  },
  optimizeDeps: {
    include: ['@vercel/blob', 'react', 'react-dom']
  },
  define: {
    // Vite provides these to the browser during build/runtime
    'process.env.BLOB_READ_WRITE_TOKEN': JSON.stringify(process.env.BLOB_READ_WRITE_TOKEN || ''),
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});
