# RCS

A pastel tower-climbing browser game. Jump up the platforms, stay ahead of the scrolling screen, and dodge spikes, shurikens, wall flames and fireballs.

## Play
- **Online:** open GitHub Pages — `https://3ecas.github.io/RCS/`. Players only ever use this address. Multiplayer connects behind the scenes to the matchmaking server on Render (`SERVER_URL` in `js/net.js`); the page wakes that server up as soon as it opens.
- **On your computer:** double-click `index.html`. Local play works; Multiplayer needs the Render server to be running.

## Starting a game (the lobby)
Platforms and menu buttons share one look — a coloured face, a crisp outline and a solid shadow underneath; the lobby's platforms are white buttons that light up while you stand on them. There are no menu screens: the game opens in a **playable scene** at the bottom of the tower, with player 1 (W A S D) already standing on the floor.
The scene is kept nearly word-free: keys are drawn as keycaps, sound and the wardrobe are icons, and hints only appear when they're needed (little arrows over the mode platforms until you've started a game once, the down key beside a door when you stand at it, the missing cube blinking over a mode platform when only one of two players is on it).
- **Mode platforms** (plain platforms with their name on them): everyone stands on the same one for **2 seconds** to start. One player: **SOLO** or **ONLINE**. Two players: **CO-OP** (if one falls, both lose), **RACE** (last one standing wins, with a leaderboard and win count) or ONLINE (both of you join the online race from this computer). The screen then starts scrolling up this same tower; the mode platforms stay as plain platforms (their names disappear).
- **Sound** platform (speaker icon): land on it to switch sound on or off.
- **Wardrobe door** (the door with a hanger sign, one jump above the mode platforms, on the left): stand at it and press down (**S**, or **↓** for player 2) to go inside. In the wardrobe, land on the **COLOUR**, **FACE**, **HAT** and **PATTERN** platforms — each landing switches that part of your cube to the next option: 10 colours, 7 faces (dots, wide eyes, sleepy, angry, happy, shades, wink), 8 hats (none, cap, crown, top hat, bow, headband, horns, antenna) and 4 patterns (plain, stripes, spots, checks). A big mirror shows your cube(s) and how close your gems are to the next unlock. Press down at the **EXIT** door (or Esc) to come back out. Two players can't share a colour. Your choices are remembered, and each cube is named after its colour.
- **Player 2:** hold any arrow key for 2 seconds (the dashed cube on the floor's right fills up) and player 2 pops up. **Esc** removes them.
- **?** (key or corner icon) shows the instructions.

After a game, **Space** or **PLAY AGAIN** (or **RESTART** in the pause menu) gives a clean tower with a 3-2-1 countdown; **MENU** goes back to the start scene.

**Multiplayer:** everyone who joins goes into **the same room** (a second room only opens when one is full, at 10 cubes). The room is a **scene you walk around in** with everyone else's cubes. In the middle is a green **START** platform: the race starts when **every** player in the room is standing on it (at least 2 computers). One or two players can join from each computer — two players use W A S D and the arrow keys. Everyone races the same tower. If you're knocked out you keep watching. When only one cube is left, the race ends with the winner and a **leaderboard** (ranked by how long each player lasted, with height and wins). Then press **Space** to be ready for a rematch — when everyone is ready (on the results screen, or on START in the room) the next race starts straight away. **ROOM** takes you back to the room scene (jump on START there to be ready for the next round); **LEAVE** quits online play (Esc in the room). In the room, press **Enter** to **chat**: your message shows as a speech bubble over your cube and in the chat log. If you join while a race is on, you wait in the room for the next one. Cubes pass through each other (no standing on heads). Your own cubes are always drawn in front, in your colour; everyone else's show as faded grey ghosts that still wear their face, hat and pattern; names are colours, and repeats get a number ("Blue 2"). If someone leaves mid-race, the rest carry on. If your copy of the game is out of date (e.g. cached by the browser), you're asked to refresh the page.

During a game the **speaker** icon (top right) or **M** turns sound on/off (remembered).

## Controls

| | Jump | Move | Drop through |
|---|---|---|---|
| One player (solo / online) | W or ↑ | A D or ← → | S or ↓ |
| Two players (local or online): player 1 | W | A / D | S |
| Two players: player 2 | ↑ | ← / → | ↓ |

In the lobby player 1 is W A S D only (the arrow keys add player 2).

**R** or **Esc** pauses the game, and again resumes (not online) · **M** sound · **F** full screen.

The tower is **880 wide** for everyone, offline and online, so every race is fair. It is scaled to fit and centred in the window: a wide window shows more of the side walls, a tall one more sky above.

Springs: press jump right as you land on one for a big launch; otherwise it's a normal bounce.

## The tower
- The path is built from **set pieces**, a few rows each, picked at random: loose **scatter** platforms, a zigzag **staircase**, a **chimney** (a floor, a narrow empty shaft between two pillars, and a cap on top — wall-jump up it), a **wall climb** (ledges hugging a side wall, alternating with platforms further out) and a **plaza** (a wide platform, then two routes, one with a gem, that meet again). Every step stays within jumping reach. Now and then an extra platform sits off to the side.
- **Wall jumping:** push into a wall in mid-air (the tower's sides, pillars, the Two Paths wall) to grab it — you hang on it, sliding down slowly, even after letting go of the key. Press the **other way** to jump up and off it toward that side. In a chimney: right, left, right, left…
- **Gems** sit off the main path — at the top of chimneys, on the risky route of a plaza, high up against walls, on a shuriken's track. Gems are counted per computer and unlock **wardrobe items**: more faces, hats and patterns (the wardrobe mirror shows your total and the next unlock).
- A row right after a row with a hazard is always hazard-free.
- **Regions:** the first 100 m are a plain region with just platforms. After that a new region starts every 200 m (`REGION_LEN` in `js/config.js`), picked at random and never the same twice in a row. Each region has its own dangers, background colour, platform style (grass, crystals, planks, rivets, embers, hazard stripes, drips, bricks) and background scenery (clouds, trees, crystals, hills, gears, flames, storm clouds, seaweed, columns):
  - **Garden** (green): springs and moving platforms
  - **Spikes** (pink): spikes on moving and still platforms
  - **Seesaw** (peach): seesaws that tip toward whichever side you stand on, and springs
  - **Blades** (blue): spinning shurikens and moving platforms
  - **Fire** (orange): big flamethrowers on the walls, flamethrowers on the path's platforms (shooting up from one end, or out sideways over the gap) and falling fireballs
  - **Lightning** (lavender): electric beams between two posts — they flicker as a warning, then switch on for a moment
  - **Water** (aqua): a helper region with no dangers — columns of rising bubbles push you up while you're inside them, no jump needed
  - **Two Paths** (olive): a full-width entrance platform, then a wall up the middle with a separate path on each side — you can't cross it, so players split up — and a full-width exit platform where the paths meet again. Moving platforms and spikes inside.
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
js/pieces.js      set pieces (stairs, chimney, wall climb, plaza) and gems
js/effects.js     particles and floating text
js/menu.js        buttons: pause menu, online room, end screens
js/lobby.js       the start scene: mode platforms, sound, joining player 2
js/wardrobe.js    the wardrobe door and room: change your cube's colour, face, hat, pattern
js/room.js        the online room scene: everyone's cubes and the START platform
js/chat.js        chat in the online room: typing box, speech bubbles, chat log
js/game.js        game rules: movement, hazards, deaths
js/render.js      drawing the world
js/hud.js         drawing the score, screens and buttons
js/look.js        how a cube looks: colours, faces, hats, patterns
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
Open <http://localhost:8791> in two or more browser windows, stand on ONLINE in each, then READY.

## Easy tweaks
- `ROW_GAP` (js/config.js) — height between platform rows (120 = 3 m)
- `STAGES` (js/config.js) — the height at which each obstacle first appears
- `JUMP_V`, `GRAV`, `MAX_VX` (js/config.js) — jump strength, gravity, run speed
- `SERVER_URL` (js/net.js) — the online server used outside Render
