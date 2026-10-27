# RCS

A pastel tower-climbing browser game. Jump up the platforms, stay ahead of the scrolling screen, and dodge spikes, shurikens, wall flames and fireballs.

## Play
- **Online:** open the game's Render address (e.g. `https://rcs.onrender.com`) or GitHub Pages (`https://3ecas.github.io/RCS/`). Everything works on Render; on GitHub Pages, Multiplayer connects to the Render server.
- **On your computer:** double-click `index.html`. Solo and Split screen work; Multiplayer needs the Render server to be running.

## Main menu
Use the mouse, or the arrow keys + Enter. Esc goes back.

- **Solo** — *Climb* alone, or *Race the bot*.
- **Split screen** — 2–4 players on one keyboard, all on the same screen. Pick *Co-op* or *Versus*, then the number of players.
- **Multiplayer** — play online with a friend, one player on each computer. Pick *Co-op* or *Versus*; the game searches for another player who is searching too, shows **Match Found!** and loads the level. If you picked different modes you're still matched — the player who started searching first decides.

**Co-op:** climb together. If anyone falls off the bottom or hits a hazard, everyone loses. Your best height is saved in the browser.
**Versus:** a race. The screen follows whoever is in the lead; fall behind the bottom edge (or hit a hazard) and you're out. Last one standing wins.

## Controls

| | Jump | Move | Drop through |
|---|---|---|---|
| Player 1 | W | A / D | S |
| Player 2 | ↑ | ← / → | ↓ |
| Player 3 | I | J / L | K |
| Player 4 | T | F / H | G |

Solo and online: WASD **or** the arrow keys. P pause (not online) · M sound · F full screen.

Springs: press jump right as you land on one for a big launch; otherwise it's a normal bounce.

Some keyboards can't register many keys at once, so with 3–4 players a key press may occasionally be missed.

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
js/bot.js         the computer opponent
js/effects.js     particles and floating text
js/menu.js        menus and buttons
js/game.js        game rules: movement, hazards, deaths
js/render.js      drawing the world
js/hud.js         drawing the score, menus and buttons
js/main.js        starts the game loop
server/server.js  online server: serves the game and pairs up players (no dependencies)
render.yaml       Render setup
package.json      tells Render this is a Node app
```
The scripts are plain `<script>` files (not modules) so the game also runs when `index.html` is opened straight from disk.

## Deploy on Render
1. Push this repository to GitHub (`main` branch).
2. In Render choose **New → Blueprint**, pick the **RCS** repository, leave Blueprint Path as `render.yaml`, and click **Apply**.
3. Open the address Render shows. If it isn't `https://rcs.onrender.com`, put your address in `SERVER_URL` in `js/net.js` (as `wss://…/ws`) so GitHub Pages and local copies connect to it.

Every push to `main` redeploys automatically. Free Render services fall asleep after ~15 minutes without visitors; the first connection then takes up to a minute (the game shows "Connecting to the server…").

### GitHub Pages
In the repository's **Settings → Pages**, deploy from the `main` branch, root folder. The game is then at `https://3ecas.github.io/RCS/`.

### Test online play on your own computer
```
node server/server.js 8791
```
Open <http://localhost:8791> in two browser windows and press Multiplayer in both.

## Easy tweaks
- `ROW_GAP` (js/config.js) — height between platform rows (120 = 3 m)
- `STAGES` (js/config.js) — the height at which each obstacle first appears
- `JUMP_V`, `GRAV`, `MAX_VX` (js/config.js) — jump strength, gravity, run speed
- `BOT` (js/bot.js) — the bot's speed (share of a human's) and its pause before each jump
- `SERVER_URL` (js/net.js) — the online server used outside Render
