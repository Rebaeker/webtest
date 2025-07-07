import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // <-- DIESE ZEILE IST WICHTIG
  // Du kannst hier später weitere Integrationen wie Tailwind CSS hinzufügen
  site: 'https://www.example.com',

  vite: {
    plugins: [tailwindcss()]
  }
});