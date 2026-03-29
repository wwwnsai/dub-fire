# dub-fire
Smart Fire Detection - senior project

To run software:
cd software
npm install
npm run dev

To run AI detection and live RGB/thermal streams:
cd AI
python main.py

Docker services:
docker compose up --build web

If your environment supports camera + serial passthrough to containers:
docker compose up --build

Services in Docker:
- web: Next.js app on http://127.0.0.1:3000
- ai: detection + ESP32 bridge + separated endpoints on http://127.0.0.1:5001
  - /rgb_feed
  - /thermal_feed
  - /sensor

Recommended on Windows:
- Run `web` in Docker
- Run `AI/main.py` on the host
- Reason: Docker Desktop on Windows does not reliably expose USB cameras and COM ports to Linux containers
