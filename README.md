# RCS

A pastel tower-climbing browser game. Jump up the platforms, stay ahead of the scrolling screen, and dodge spikes, shurikens, wall flames and fireballs.

## Play
- **Online:** open GitHub Pages — `https://3ecas.github.io/RCS/`. Players only ever use this address. Multiplayer connects behind the scenes to the matchmaking server on Render (`SERVER_URL` in `js/net.js`); the page wakes that server up as soon as it opens.
- **On your computer:** double-click `index.html`. Local play works; Multiplayer needs the Render server to be running.

## Starting a game (the lobby)
There are no menu screens: the game opens in a **playable scene** at the bottom of the tower, with player 1 (W A S D) already standing on the floor.
- **Mode platforms** (plain platforms with their name on them): everyone stands on the same one for **3 seconds** to start. One player: **Solo** or **Multiplayer**. Two players: **Co-op** (if one falls, both lose), **Race** (last one standing wins, with a leaderboard and win count) or Multiplayer (both of you join the online race from this computer). The screen then starts scrolling up this same tower; the mode platforms stay as plain platforms (their names disappear).
- **Sound** platform: land on it to switch sound on or off.
- **Colour column** (10 coloured pads stacked up the left side): climb it — each pad you land on paints your cube that colour — and jump off at the one you want. Two players can't share a colour. Colours are remembered, and each cube is named after its colour.
- **Player 2:** hold any arrow key for 3 seconds and player 2 pops up on the floor. **Esc** removes them.
- **?** (key or corner icon) shows the instructions.

After a game, **PLAY AGAIN** (or **START OVER** in the stop menu) gives a clean tower with a 3-2-1 countdown; **MENU** goes back to the start scene.

**Multiplayer:** everyone who joins goes into **the same room** (a second room only opens when one is full, at 10 cubes). The room is a **scene you walk around in** with everyone else's cubes. In the middle is a green **START** platform: the race starts when **every** player in the room is standing on it or piled up on top of others above it (at least 2 computers). One or two players can join from each computer — two players use W A S D and the arrow keys. Everyone races the same tower. If you're knocked out you keep watching. When only one cube is left, the race ends with the winner and a **leaderboard** (ranked by how long each player lasted, with height and wins). Then **BACK TO ROOM** for the next race, or **LEAVE** (Esc in the room). If you join while a race is on, you wait in the room for the next one. Your own cubes are full colour and everyone else's are softer; names are colours, and repeats get a number ("Blue 2"). If someone leaves mid-race, the rest carry on. If your copy of the game is out of date (e.g. cached by the browser), you're asked to refresh the page.

During a game the **speaker** icon (top right) or **M** turns sound on/off (remembered).

## Controls

| | Jump | Move | Drop through |
|---|---|---|---|
| One player (solo / online) | W or ↑ | A D or ← → | S or ↓ |
| Two players (local or online): player 1 | W | A / D | S |
| Two players: player 2 | ↑ | ← / → | ↓ |

In the lobby player 1 is W A S D only (the arrow keys add player 2).

**R** stops the game (press **R** again to start over; not online) · **M** sound · **F** full screen.

The tower **fills the whole screen**: it is as wide as your window's shape (from 800 up to 2400 wide, at a fixed height), and wider towers get more platforms, spikes, shurikens and fireballs spread across them. On a very tall window the tower stays 800 wide and you see more sky above. **Online**, everyone races one shared 16:9 tower (1600 wide) so the race is fair; on other screen shapes it is scaled to fit.

Springs: press jump right as you land on one for a big launch; otherwise it's a normal bounce.

## The tower
- One main path goes up, every step within jumping reach of the last. Extra platforms stick out to the sides (more of them on wide screens).
- A row right after a row with a hazard is always hazard-free.
- **Regions:** the first 100 m are a plain region with just platforms. After that a new region starts every 200 m (`REGION_LEN` in `js/config.js`), picked at random and never the same twice in a row. Each region has its own dangers and background colour:
  - **Garden** (green): springs and moving platforms
  - **Spikes** (pink): spikes on moving and still platforms
  - **Seesaw** (peach): seesaws that tip toward whichever side you stand on, and springs
  - **Blades** (blue): spinning shurikens and moving platforms
  - **Fire** (orange): flamethrowers on the walls and falling fireballs
  - **Lightning** (lavender): electric beams between two posts — they flicker as a warning, then switch on for a moment
  - **Water** (aqua): a helper region with no dangers — columns of rising bubbles push you up while you're inside them, no jump needed
- The order comes from the tower's seed, so everyone in an online race gets the same regions. Dangers get harder the higher you climb.

## Files
```
index.html        the page: loads the stylesheet and the scripts below, in order
css/style.css     page layout
js/config.js      settings: sizes, physics, colours, when obstacles appear
js/utils.js       small maths and colour helpers
js/canvas.js      the canvas, filling the whole window
js/input.js       keyboard and mouse
js/audio.js       sound effects (generated, no sound files)
js/state.js       game state, players, starting a new tower
js/net.js         online play (talks to the server)
js/level.js       building the tower and its hazards
js/effects.js     particles and floating text
js/menu.js        buttons: stop menu, online room, end screens
js/lobby.js       the start scene: mode platforms, sound, colour pads, joining player 2
js/room.js        the online room scene: everyone's cubes and the START platform
js/game.js        game rules: movement, hazards, deaths
js/render.js      drawing the world
js/hud.js         drawing the score, screens and buttons
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
