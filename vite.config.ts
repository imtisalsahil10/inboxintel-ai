import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Support both API_KEY and GEMINI_API_KEY (as mentioned in README)
  const apiKey = env.API_KEY || env.GEMINI_API_KEY || '';
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the Gemini Service
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.BASE_URL': JSON.stringify(env.BASE_URL),
    },
    server: {
      port: 5173,
      proxy: {
        // Proxy API requests to backend during development if needed, 
        // though the current app uses absolute URLs (localhost:3000) in constants.
      }
    }
  };
});