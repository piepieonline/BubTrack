# BubTrack

Installable Preact PWA that reads and writes a single Google Sheet directly from the browser. No backend.

- Production: https://www.piepieonline.com/BubTrack/ (GitHub Pages, behind Cloudflare)
- Dev on phone: https://dev.piepieonline.com/BubTrack/ (Cloudflare Tunnel to this machine)

## Google Cloud setup (one time)

1. Create a project at https://console.cloud.google.com and note its **project number**.
2. Enable **Google Sheets API** and **Google Picker API**.
3. OAuth consent screen: External, leave in **Testing**, add both Google accounts as test users.
4. Credentials → OAuth client ID → **Web application**
   - Authorized JavaScript origins:
     - `https://www.piepieonline.com`
     - `https://dev.piepieonline.com`
     - `http://localhost:5173`
   - Authorized redirect URIs:
     - `https://www.piepieonline.com/BubTrack/`
     - `https://dev.piepieonline.com/BubTrack/`
     - `http://localhost:5173/BubTrack/`
5. Credentials → API key, restricted to:
   - Websites:
     - `https://www.piepieonline.com/BubTrack/*`
     - `https://dev.piepieonline.com/BubTrack/*`
     - `http://localhost:5173/*`
   - APIs: Google Picker API
6. Fill in `src/config.ts` with the client ID, API key and project number.

## GitHub setup

1. Push to `piepieonline/BubTrack` (the name must match the `/BubTrack/` base path).
2. Settings → Pages → Source: **GitHub Actions**.
3. Pushes to `main` deploy automatically.

## Cloudflare Tunnel setup (one time)

Install `cloudflared` (https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/), then:

```sh
cloudflared tunnel login                                        # pick the piepieonline.com zone
cloudflared tunnel create bubtrack-dev
cloudflared tunnel route dns bubtrack-dev dev.piepieonline.com  # creates the proxied CNAME
```

## Development

```sh
npm install
npm run dev       # http://localhost:5173/BubTrack/
npm run tunnel    # in a second terminal: https://dev.piepieonline.com/BubTrack/
```

The service worker is not active under `npm run dev`. To test install/PWA behaviour on a phone:

```sh
npm run build && npm run preview   # serves dist on :4173
npm run tunnel:preview
```

## Phone setup

Open the site in Chrome on Android → menu → **Install app**. Sign in, then pick the spreadsheet once per phone.
