# RCS

A pastel tower-climbing browser game. Jump up the platforms, stay ahead of the scrolling screen, and dodge spikes, shurikens, wall flames and fireballs.

## Play
- **Online:** open GitHub Pages — `https://3ecas.github.io/RCS/`. Players only ever use this address. Multiplayer connects behind the scenes to the matchmaking server on Render (`SERVER_URL` in `js/net.js`); the page wakes that server up as soon as it opens.
- **On your computer:** double-click `index.html`. Local play works; Multiplayer needs the Render server to be running.

## Main menu
Use the mouse, or ↑ ↓ + Enter. Esc goes back one step.

**Your cube colour:** at the top of the main menu, pick one of 10 colours with ◀ ▶ (or ← →). The browser remembers it.

- **Local** — play on this computer:
  - **Solo** — *Climb* alone, or *Race the bot*.
  - **Co-op** — two players on one keyboard. Choose *Same team* or *Versus*, then each player picks a colour on the colour screen (player 1 with A D, player 2 with ← →; you can't both pick the same one), then **Play**.
- **Multiplayer** — play online. Choose 1 or 2 players on this computer (so up to 4 in a match, e.g. 2 on each keyboard), then *Co-op* or *Versus*. The game finds another computer that is searching, shows **Match Found!** and loads the level. If you picked different modes you're still matched — the computer that started searching first decides. The server prefers partners whose cube colours don't clash, but never makes you wait because of a colour. On every screen your own cubes are full colour and the other computer's cubes are softer, so you can always tell yours apart (a clashing colour also gets a number, like "Pink 2").

**Same team / Co-op:** climb together. If anyone falls off the bottom or hits a hazard, everyone loses. Your best height is saved in the browser.
**Versus:** a race. The screen follows whoever is in the lead; fall behind the bottom edge (or hit a hazard) and you're out. Last one standing wins.

## Controls

| | Jump | Move | Drop through |
|---|---|---|---|
| Player 1 | W | A / D | S |
| Player 2 | ↑ | ← / → | ↓ |

Solo, and online with 1 player: WASD **or** the arrow keys. Online with 2 players: the first uses WASD, the second the arrow keys.

**R** stops the game (stop menu); press **R** again to start over. Not available online. · M sound · F full screen.

Springs: press jump right as you land on one for a big launch; otherwise it's a normal bounce.

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
3. Open the address Render shows. The live server is `https://rcs-d5wp.onrender.com`; if that ever changes, put the new address in `SERVER_URL` in `js/net.js` (as `wss://…/ws`) so GitHub Pages and local copies connect to it.

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
