import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  envPrefix: ['VITE_', 'SUPABASE_'],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
