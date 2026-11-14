import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
export default defineConfig(({ mode }) => {
  const { PUBLIC_BOOKING_URL = '' } = loadEnv(mode, process.cwd(), 'PUBLIC_');
  if (
    PUBLIC_BOOKING_URL &&
    !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(
      PUBLIC_BOOKING_URL,
    )
  )
    throw new Error(
      'PUBLIC_BOOKING_URL must be a Google Apps Script /exec URL.',
    );
  return {
    plugins: [tailwindcss(), sveltekit()],
    define: { __BOOKING_URL__: JSON.stringify(PUBLIC_BOOKING_URL) },
  };
});
