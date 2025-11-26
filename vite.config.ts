import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  define: {
    // Vite substitui essas variáveis em tempo de build. 
    // Certifique-se de que elas estão definidas no painel do Vercel.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.NEXT_PUBLIC_FIREBASE_CONFIG': JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_CONFIG),
    'process.env.NEXT_PUBLIC_BASE_URL': JSON.stringify(process.env.NEXT_PUBLIC_BASE_URL),
    'process.env.VERCEL_URL': JSON.stringify(process.env.VERCEL_URL),
  }
});