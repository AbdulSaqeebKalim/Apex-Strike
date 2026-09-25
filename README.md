# Apex Strike — 2D Shooter

A 2D top-down multiplayer/solo shooting game built as a Progressive Web App (PWA). Play on desktop or mobile (landscape mode) with dual joystick controls — move with the left stick, aim and auto-shoot with the right stick.

🎮 **Play now:** [abdulsaqeebkalim.github.io/Apex-Strike](https://abdulsaqeebkalim.github.io/Apex-Strike/)

## Features

- ⚔️ **Solo vs Bots** — battle AI opponents with adjustable difficulty
- 🌐 **Multiplayer** — real-time peer-to-peer matches via PeerJS (WebRTC), no server required
- 🕹️ **Dual joystick controls** — left stick to move, right stick to aim and auto-fire (mouse + keyboard supported on desktop)
- 🔫 **Weapon select** — choose your loadout before entering a match
- 🗺️ **Arena select** — multiple 2D maps to play in
- 📱 **Installable PWA** — add to home screen, works offline via service worker
- 💚 **Minimal in-match HUD** — health bar plus live kill/death counters, nothing else cluttering the screen

## Controls

| Action | Mobile | Desktop |
|---|---|---|
| Move | Left joystick | WASD / Arrow keys |
| Aim & Shoot | Right joystick (drag to aim, auto-fires) | Mouse position + hold to fire |

> The game is designed for **landscape orientation**. On mobile, rotate your device when prompted.

## Tech Stack

- HTML5 Canvas + vanilla JavaScript
- [PeerJS](https://peerjs.com/) for peer-to-peer multiplayer networking (WebRTC)
- Service Worker + Web App Manifest for PWA/offline support
- No build step — pure static site, deployable directly to GitHub Pages

## Project Structure

```
Apex-Strike-2D-Game/
├── index.html          # Entry point (profile screen → play)
├── style.css            # Styling
├── game.js               # Core game logic, rendering, controls, networking
├── manifest.json         # PWA manifest
├── service-worker.js     # Offline caching
└── icons/                # App icons (192x192, 512x512)
```

## Running Locally

Since this is a static PWA with no build step, just serve the folder with any local web server (opening `index.html` directly via `file://` may break service worker registration):

```bash
# using Python
python -m http.server 8000

# or using Node
npx serve .
```

Then open `http://localhost:8000` in your browser.

## Multiplayer

Multiplayer uses PeerJS's public signaling server for connection setup, after which gameplay data flows directly peer-to-peer. To play with a friend:

1. One player selects **Multiplayer → Create Room** and shares the generated room code.
2. The other player selects **Multiplayer → Join Room** and enters that code.

> Note: the free public PeerJS signaling server can occasionally be slow or rate-limited. If matches fail to connect, try again after a moment.

## Deployment

This repo is set up to deploy directly via **GitHub Pages**:

1. Go to **Settings → Pages**
2. Set source to the `main` branch, root folder (`/`)
3. Your game will be live at `https://<username>.github.io/Apex-Strike-2D-Game/`

## Roadmap / Ideas

- [ ] Additional weapons and arenas
- [ ] Player skins/customization
- [ ] Leaderboards
- [ ] More refined bot AI

## Credits

Built by [Abdul Saqeeb Kalim](https://github.com/AbdulSaqeebKalim), generated with Google AI Studio.

## License

This project currently has no license specified — all rights reserved by default. Add a [LICENSE](https://choosealicense.com/) file if you'd like to open it up for contributions or reuse.
