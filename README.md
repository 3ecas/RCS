# RCS

A pastel tower-climbing browser game. Jump up the platforms, stay ahead of the scrolling screen, and dodge spikes, shurikens, wall flames and fireballs.

## Play
- **Online:** open GitHub Pages — `https://3ecas.github.io/RCS/`. Players only ever use this address. Multiplayer connects behind the scenes to the matchmaking server on Render (`SERVER_URL` in `js/net.js`); the page wakes that server up as soon as it opens.
- **On your computer:** double-click `index.html`. Local play works; Multiplayer needs the Render server to be running.

## Menus
- **Local** — on this computer:
  - **Solo** — climb alone. How high can you go?
  - **Split screen** — two players on one keyboard, same team (if one falls, both lose).
- **Multiplayer** — online, one player per computer, up to 10 in a room.

After picking a mode you get a **setup screen**: each player types a **name** and picks a **cube colour** (◀ ▶, 10 colours). In split screen both players are side by side — player 1 changes colour with A D, player 2 with ← →, and you can't pick the same colour. Names and colours are remembered. Then **Play** (or **Join** for multiplayer).

**Multiplayer:** everyone who joins goes into **the same room** (a second room only opens when one is full). The room screen lists every player; each one presses **READY**, and the race starts when **everyone** in the room is ready (at least 2). Everyone races the same tower. If you're knocked out you keep watching. When only one player is left, the race ends with the winner and a **leaderboard** (ranked by how long each player lasted, with height and wins). Press **READY** again for the next race, or **LEAVE**. If you join while a race is on, you wait in the room and can get ready for the next one. Your own cube is full colour and everyone else's is softer; repeated names get a number ("Bernie 2"). If someone leaves mid-race, the rest carry on. If your copy of the game is out of date (e.g. cached by the browser), you're asked to refresh the page.

Top-right corner: **?** opens the instructions, the **speaker** turns sound on/off (remembered).

## Controls

| | Jump | Move | Drop through |
|---|---|---|---|
| Solo / online | W or ↑ | A D or ← → | S or ↓ |
| Split screen: player 1 | W | A / D | S |
| Split screen: player 2 | ↑ | ← / → | ↓ |

**R** stops the game (press **R** again to start over; not online) · **M** sound · **F** full screen.

Springs: press jump right as you land on one for a big launch; otherwise it's a normal bounce.

## The tower
- One main path goes up, every step within jumping reach of the last. Now and then an extra platform sticks out to the side.
- A row right after a row with a hazard is always hazard-free.
- Dangers unlock as you climb: springs 15 m · moving 30 m · spikes 50 m · crumbling 90 m · shurikens 120 m · wall flames 160 m · fireballs 230 m.

## Files
```
index.html        the page: loads the stylesheet and the scripts below, in order
css/style.css     page layout
js/config.js      settings: sizes, physics, colours, when obstacles appear
js/utils.js       small maths and colour helpers
js/canvas.js      the canvas, scaled to fit the window
js/input.js       keyboard and mouse
js/audio.js       sound effects (generated, no sound files)
js/state.js       game state, players, starting a new tower
js/net.js         online play (talks to the server)
js/level.js       building the tower and its hazards
js/effects.js     particles and floating text
js/menu.js        menus and buttons
js/game.js        game rules: movement, hazards, deaths
js/render.js      drawing the world
js/hud.js         drawing the score, menus and buttons
js/name.js        the name boxes on the setup screen
js/main.js        starts the game loop
server/server.js  online server: serves the game and pairs up players (no dependencies)
render.yaml       Render setup
package.json      tells Render this is a Node app
```
The scripts are plain `<script>` files (not modules) so the game also runs when `index.html` is opened straight from disk.

## Deploy on Render
1. Push this repository to GitHub (`main` branch).
2. In Render choose **New → Blueprint**, pick the **RCS** repository, leave Blueprint Path as `render.yaml`, and click **Apply**.
3. Open the address Render shows. The live server is `https://rcs-d5wp.onrender.com`; if that ever changes, put the new address in `SERVER_URL` in `js/net.js` (as `wss://…/ws`) so GitHub Pages and local copies connect to it.

Every push to `main` redeploys automatically. Free Render services fall asleep after ~15 minutes without visitors; the first connection then takes up to a minute (the game shows "Connecting to the server…").

### GitHub Pages
In the repository's **Settings → Pages**, deploy from the `main` branch, root folder. The game is then at `https://3ecas.github.io/RCS/`.

### Test online play on your own computer
```
node server/server.js 8791
```
Open <http://localhost:8791> in two or more browser windows, press Multiplayer in each, then READY.

## Easy tweaks
- `ROW_GAP` (js/config.js) — height between platform rows (120 = 3 m)
- `STAGES` (js/config.js) — the height at which each obstacle first appears
- `JUMP_V`, `GRAV`, `MAX_VX` (js/config.js) — jump strength, gravity, run speed
- `SERVER_URL` (js/net.js) — the online server used outside Render
