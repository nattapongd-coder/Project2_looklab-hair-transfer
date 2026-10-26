<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/eb833ee0-c7e4-46dc-a288-f939b7dbd3f6

## Run Locally

**Prerequisites:**  Node.js and a RunPod Serverless **Load Balancer** endpoint running the HairFastGAN app
(routes `POST /generate`, `GET /ping`).

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and set:
   - `HAIRFASTGAN_API_URL` – `https://<ENDPOINT_ID>.api.runpod.ai`
   - `RUNPOD_API_KEY` – your RunPod API key (`rpa_...`)
   - `HAIRFASTGAN_API_TOKEN` – app token (may be the same `rpa_...` key)
3. Run the app:
   `npm run dev`
   The terminal prints which RunPod endpoint is used and whether the keys were found.

## Deploy to Vercel

`vercel.json` runs `node scripts/vercel-build.mjs`, which writes Vercel's Build Output (`.vercel/output`):
the Vite frontend as static files, and `server.ts` bundled into **one JavaScript function** that answers every `/api/*` request.
Vercel does not compile any TypeScript itself, so there are no runtime import errors.

1. Push the repo (`scripts/`, `vercel.json`, `server.ts`, `serverImageUtils.ts`) – never commit `.env`.
2. Vercel → Settings → Environment Variables: `HAIRFASTGAN_API_URL`, `RUNPOD_API_KEY`, `HAIRFASTGAN_API_TOKEN`
   (Production and Preview), then **Redeploy**.
3. Open `https://<your-app>.vercel.app/api/hairfastgan/config` → `"runtime":"vercel"` and `"set"` for each variable;
   then `.../api/hairfastgan/health` for the RunPod connection.

Notes: request/response limit 4.5 MB (uploads are compressed and extra images trimmed automatically);
function timeout 300 s – set the env var `VERCEL_MAX_DURATION=60` if your plan does not allow 300.
