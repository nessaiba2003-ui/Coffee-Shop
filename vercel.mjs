import { createVercelConfig } from './scripts/vercel-config.mjs';

// Evaluated by Vercel before the build. Never expose credentials here.
export const config = createVercelConfig(process.env.BACKEND_URL);
