/**
 * Vercel Function entry: every /api/* request is rewritten here (see vercel.json)
 * and handled by the same Express app that `npm run dev` uses locally.
 * RunPod settings come from Vercel → Settings → Environment Variables:
 *   HAIRFASTGAN_API_URL, RUNPOD_API_KEY, HAIRFASTGAN_API_TOKEN
 */
import app from "../server.js";

export default app;
