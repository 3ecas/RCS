# RCS

A pastel tower-climbing browser game. Jump up the platforms, stay ahead of the scrolling screen, and dodge spikes, shurikens, wall flames and fireballs.

## Play
- **Online:** open GitHub Pages — `https://3ecas.github.io/RCS/`. Players only ever use this address. Multiplayer connects behind the scenes to the matchmaking server on Render (`SERVER_URL` in `js/net.js`); the page wakes that server up as soon as it opens.
- **On your computer:** double-click `index.html`. Local play works; Multiplayer needs the Render server to be running.

## Starting a game (the lobby)
The art style is **Soft Ascent** (`design/soft-ascent.md`, style sheet `design/soft-ascent.png`): six pastel pairs (rose, apricot, butter, mint, sky, lilac — a soft face and a deeper edge), everything built from circles, squares, triangles and rounded bars, and small shapes rising through the air. All text uses **Fredoka**, a rounded typeface shipped with the game in `fonts/` (SIL Open Font License, see `fonts/Fredoka-LICENSE.txt`) so it works offline. The logo (`js/logo.js`) is drawn in code: R, C and S as thick rounded strokes over a deeper offset layer, standing on a little platform with a cube perched on the C. In the start scene a small one sits **in the middle of the floor**, between the two players' keys, with your best height under it (the floor is a little taller to hold it), so nothing in the tower ever covers it. Platforms, cubes, buttons and panels are softly rounded; hazards share the style too (rose spikes and shurikens, apricot-and-butter flame tongues, butter lightning between lilac posts); the walls, floor and pillars are built of soft rounded blocks in staggered courses; each region has its own colours, and only small shapes rise through the background; moving platforms show their track as a row of dots between two rings; particles (landing puffs, bursts) are little spinning shapes. The lobby's platforms are white with a purple outline and light up while you stand on them. There are no menu screens: the game opens in a **playable scene** at the bottom of the tower, with player 1 (W A S D) already standing on the floor. The floor is a tall strip: player 1's cube and W A S D on the left, player 2's slot and the arrow keys on the right (hold an arrow key to join: the dashed cube fills up; once joined, Esc ✕ removes them), and a small RCS logo in the middle with your best height under it.
The scene is kept nearly word-free: keys are drawn as keycaps, sound and the wardrobe are icons, and hints only appear when they're needed (little arrows over the mode platforms until you've started a game once, the down key beside a door when you stand at it, the missing cube blinking over a mode platform when only one of two players is on it).
- **Starting a game, one player:** just **climb**: start on the first stair (the plain platform on the left, one jump up) and keep going — once you're near the top of the screen, the game starts and the screen scrolls up this same tower. To play online, stand in the **ONLINE portal** (on the floor by the right wall) for a second: it leads to the **online hub**, a low tunnel of portals across the middle of the screen — the wardrobe (left corner), **FIND MATCH** (into a public lobby), **PRIVATE** (a room password, then a private lobby) and **MAIN MENU** (right corner, back here; or Esc). Portals always stand in the same order: the wardrobe on the left, EXIT (where there is one) on the right, the others in between.
- **Two players:** hold an arrow key for 2 seconds to add player 2 (Esc removes them) — the scene stays the same. Climbing starts a **co-op** game (if one falls, both lose). With two players, a portal only takes you through once **both** of you are standing in it. Online, the two of you count as **two players**: two lines in the lobby list, and you can race each other even with nobody else in the lobby.
- **Sound:** the speaker icon next to **?** in the top-right corner (click it, or press **M**) switches sound on or off.
- **Wardrobe** (a hypnotic rainbow portal — rings flowing endlessly into its middle under a slowly turning spiral of light — with a shirt sign on top, on the floor by the left wall): stand in it for **a second** (a little bar fills up) to go inside: the arch glows and a soft circle closes in on it, then opens again inside, at the exit arch. In the wardrobe, land on the **COLOUR**, **FACE**, **HAT** and **PATTERN** platforms — each landing switches that part of your cube to the next option: 18 colours (pink, red, orange, yellow, lime, green, teal, blue, purple, brown, coral, gold, mint, sky, navy, lavender, magenta, charcoal — dark ones get a light face), 12 faces (dots, wide eyes, sleepy, angry, happy, shades, wink, hearts, stars, surprised, blush, glasses), 14 hats (none, cap, crown, top hat, bow, headband, horns, antenna, beanie, party hat, halo, flower, cat ears, propeller) and 8 patterns (plain, stripes, spots, checks, hearts, stars, zigzag, two-tone). A big mirror shows your cube(s). Every item is available (gems, which unlock them, are switched off for now). Stand in the **EXIT** portal for a second (or press Esc) to come back out. Every portal is a rectangle and works the same way: stand in it for a second. The wardrobe always stands in the left corner and the way out (ONLINE in the start scene, EXIT elsewhere) in the right corner, a little in from the walls; no platform ever hangs low over them. In the start scene no platform row sits across the top of the window (rows there are nudged a few pixels clear of the edge). Two players can't share a colour. Your choices are remembered, and each cube is named after its colour.
- **Player 2:** hold any arrow key for 2 seconds (the dashed cube on the floor's right fills up) and player 2 pops up. **Esc** removes them.
- **?** (key or corner icon) shows the instructions.

After a game, **PLAY AGAIN** (selected first: Space presses the selected button; arrows / A D move between them) (or **RESTART** in the pause menu) gives a clean tower with a 3-2-1 countdown (you can walk left and right during it, but not jump); **MENU** goes back to the start scene.

**Multiplayer:** in the online hub, **FIND MATCH** takes you (the circle closes on the portal and opens on you there) into a **public lobby**: everyone who finds a match goes into **the same lobby** (a second room only opens when one is full, at 10 cubes). The room is a **scene you walk around in** with everyone else's cubes. In the middle is a green **START** platform: the race starts when **every** player in the room is standing on it (at least 2 computers). Then START **rises like a lift** with everyone on it, the camera following: the race tower is built right above the room, and its floor is the room's ceiling with a START-shaped hole in it. The platform slots into the hole, flush with the floor, and that's the start line. The room is dropped at that point, so it costs the race nothing. During the 3-2-1 countdown you can walk **left and right** to pick your spot, but not jump. One or two players can join from each computer — two players use W A S D and the arrow keys. Everyone races the same tower. If you're knocked out you keep watching — or press **ROOM** (or Esc) to go back to the room while the others finish (you're in the next race), or **LEAVE** for the main menu. When only one cube is left, the game drops into **slow motion** and the camera **zooms in on the winner** for a moment; then the **winner is revealed** 80s-style — the stripes sweep in band by band from alternating sides (and sweep away again when you leave): equal retro sunset stripes filling the screen, light rays turning behind the winner, confetti falling, and the winner's cube making one of three entrances (picked from the tower, so everyone sees the same one): a **dance**, a coin-like **spin-up** ending in sparkles, or a **bounce** with a ring rippling out on every landing. **YOU WIN!** / **WINNER!** is filled with the portals' moving rainbow, and their name follows in their own colour. The winner stands on a **podium** with depth: 2nd on the left, a little back, and 3rd on the right, further back, each on its own block (labelled 1st, 2nd, 3rd) with a lighter top face and a soft shadow; 4th, 5th… stand along the bottom from right to left. It all has sound: a fanfare and a confetti pop, then sounds for the entrance (bloops and swooshes for the dance, a whoosh and chime for the spin-up, boings for the bounce) and a blip for each pedestal. **Death camera (solo / co-op):** when an obstacle gets you, the game freezes for two seconds with a flash and an impact sound, and the camera zooms in on the moment of contact; then the cube bursts and the camera eases back out (falling off the bottom has no contact moment, so it goes straight on). A cube that's knocked out bursts into shapes and pops up spinning with X eyes before tumbling away — its hat flies off on its own and shades pop off; the body itself goes up as one piece. Then press **READY** for a rematch — Space presses the selected button (move with the arrows / A D); on READY it locks you in or out again (✓ when you're in) — the players still on the results screen decide: once all of them are ready (at least 2) the next race starts straight away (a circle closes on the winner and opens on the new race), without waiting for anyone who went back to the room. **ROOM** takes you back to the room scene (a circle closes on the screen and opens on your cube, from the results or while watching): from there you join the next race only if you're standing on START when it starts, otherwise you wait for the one after (with nobody on the results screen, the race starts when everyone in the room is on START); **LEAVE** quits online play (Esc in the room). The lobby has its own **wardrobe portal** (in the left corner) and an **EXIT portal** (in the right corner: stand in it for a second to go back to the online hub — Esc does the same). **Private lobbies:** stand in the hub's PRIVATE portal and a box asks for a **room password** — everyone who types the same one (capitals and extra spaces don't matter) goes into the same private room, away from the public one (a circle closes on the PRIVATE portal and opens on you in the private room); it shows PRIVATE LOBBY and the password at the top, and works just like the public lobby. Enter joins, Esc cancels.: change your cube there and everyone in the room sees the new look. In the room, press **Enter** to **chat**: your message shows as a speech bubble over your cube and in the chat log. If you join while a race is on, you wait in the room for the next one. Cubes pass through each other (no standing on heads). Your own cubes are always drawn in front, in your colour; everyone else's keep their own colours, face, hat and pattern at 50% opacity, always behind yours; names are colours, and repeats get a number ("Blue 2"). If someone leaves mid-race, the rest carry on. If your copy of the game is out of date (e.g. cached by the browser), you're asked to refresh the page.

During a game the **speaker** icon (top right) or **M** turns sound on/off (remembered).

**Music and sound** (all generated in code with the Web Audio API — no sound files, `js/audio.js` and `js/music.js`): **8-bit chiptune** — pulse waves for the melodies and arpeggios, a triangle bass, noise drums. Every song is a long loop (an A and a B section) that keeps playing for as long as you stay, and changing scene **crossfades** (the old song plays on as it fades out). The **lobby song** (start scene, online rooms, lobbies, wardrobe) is sunny and bouncy, 104 bpm; after a solo run its own easy-going **game-over song** plays; the race results get a **fanfare**. In a run or race the music **rotates between seven game songs** — PASTEL (friendly and cute: a tinkly tune over a hopping bass, the beat coming in as you climb), CLIMB, SPRINT, SKY, NEON, GROOVE and STORM, each in its own key, tempo, bass line, arpeggio and beat — the next one each run; each is driving from the start and builds as you climb (faster, a snare, busier hats and bass, a second arpeggio, the tune, a counter-melody). During the slow-motion finale the music fades away and the fanfare comes in with the results. **New best:** in a solo or co-op run, the moment you pass your best height a happy jingle plays, NEW BEST! pops up and the height counter turns green and bounces bigger and smaller (a big bounce, then a gentle one for the rest of the run). **Ambience** follows what's near your cube: a soft, clean rush of air while a water current carries you up, a hum near moving platforms, bubbling near water columns, a whirr near shurikens, crackling near burning flames. Effects: standing in a portal plays a **loading tone** climbing step by step from low to high over the second (it stops if you step out), then a bright **pling** as you go through; a springy **boing**, a flame bursting out, a landing thud as hard as the landing, and the race start — **three beeps and a horn** on GO. Jumping stretches the cube with a puff of little shapes under it; landing squashes it and sprays shapes along the floor, both by how hard you came down.

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
- The path is built from **set pieces**, a few rows each, picked at random: loose **scatter** platforms, a zigzag **staircase**, a **chimney** (3–10 rows tall: a floor, a narrow empty shaft between two pillars that start about three cubes above it (room to walk in underneath), and a way out at the top — wall-jump up it; there's always a second route up the outside too, with obstacles of its own (spikes, and higher up a shuriken sweeping across it); late in the climb some shaft rows get a flamethrower firing across from a pillar on a timer; the way out at the top is either a cap over the shaft or a ledge beside it, level with the pillars' tops), a **wall climb** (ledges hugging a side wall, alternating with platforms further out) a **plaza** (a wide platform, then two routes that meet again) and now and then a **fork** — the climb splits into two routes side by side for a few rows (one of them with the obstacles) and meets again — or, sometimes, leads straight into a chimney: one route into its shaft, the other on up its outside route. It works the other way too: a chimney's cap and the top of its outside route can lead straight on into a fork, one route each. Every step stays within jumping reach. Now and then an extra platform sits beside the path (mostly right next to it — another way through the same route). Obstacles always sit on a way up: wall flamethrowers fire from the wall next to the path (and only where the flame reaches over it), sideways platform flames point back the way you come from, lightning spans the path. Every tower is checked by a pathfinding test: from the floor you can always reach the top. **Solo and co-op runs get more obstacles**, coming in gradually: a little fewer than an online race in the first 250 m, then each region also mixes in a hazard borrowed from another region (two from about 700 m), and hazards get more frequent the higher you go (up to about 1.45x) — online races keep the plain mix, so every racer gets the same tower.
- **Wall jumping:** touch a wall in mid-air to grab it — no key needed — and you hang on it, sliding down slowly. Press **jump and the other way** (e.g. W + D off a left wall) to jump up and off it toward that side; pressing only the other way just lets go, and you drop. You have to actually touch the wall; the timing is forgiving: jumping a moment after leaving it works, and either key pressed a moment before the other is remembered. You can't jump off the same wall twice in a row without landing. In a chimney: right, left, right, left…
- **Gems** are **switched off for now** (`GEMS_ON` in `js/config.js`). When on, they sit off the main path — at the top of chimneys, on the risky route of a plaza, high up against walls, on a shuriken's track. Gems are counted per computer and unlock **wardrobe items**: more faces, hats and patterns (the wardrobe mirror shows your total and the next unlock).
- A row right after a row with a hazard is always hazard-free.
- **Regions:** the first 100 m are a plain region with just platforms. After that a new region starts every 200 m (`REGION_LEN` in `js/config.js`), picked at random and never the same twice in a row. Each region has its own dangers, background colour, platform style (grass, crystals, planks, rivets, embers, hazard stripes, drips, bricks) and background scenery (clouds, trees, crystals, hills, gears, flames, storm clouds, seaweed, columns):
  - **Garden** (green): springs and moving platforms
  - **Spikes** (pink): spikes on moving and still platforms
  - **Seesaw** (peach): seesaws that tip toward whichever side you stand on, and springs
  - **Blades** (blue): spinning shurikens and moving platforms
  - **Fire** (orange): big flamethrowers on the walls, flamethrowers on the path's platforms (shooting up from one end, or out sideways over the gap) and falling fireballs
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
js/obstacles.js   the obstacle generator: which obstacle a row gets; each one places itself from the platforms
js/obstacles/     one script per obstacle (spikes, shuriken, flame, zapper, fireball, bubbles): placing, updating, drawing, hitting
js/music.js       the music (gets faster and busier as you climb) and the ambience
js/state.js       game state, players, starting a new tower
js/net.js         online play (talks to the server)
js/level.js       building the tower and its hazards
js/pieces.js      set pieces (stairs, chimney, wall climb, plaza) and gems
js/effects.js     particles and floating text
js/logo.js        the logo and the style's shapes (Soft Ascent)
js/menu.js        buttons: pause menu, online room, end screens
js/lobby.js       the start scene: mode platforms, sound, joining player 2
js/wardrobe.js    the wardrobe door and room: change your cube's colour, face, hat, pattern
js/room.js        the online room scene: everyone's cubes and the START platform
js/lift.js        START rising from the room into the race (the lift)
js/hub.js         the online hub: a low tunnel of portals (FIND MATCH, PRIVATE, EXIT)
js/private.js     private rooms: the online room's PRIVATE portal and its password box
js/chat.js        chat in the online room: typing box, speech bubbles, chat log
js/game.js        game rules: movement, hazards, deaths
js/render.js      drawing the world
js/hud.js         drawing the height, screens and buttons (no score in the corner during races)
js/look.js        how a cube looks: colours, faces, hats, patterns
js/main.js        the game loop: each frame advances the game by exactly the time that passed, in small equal steps (smooth on 60/120/144 Hz screens)
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

## Performance
The walls and floor are drawn once into off-screen pictures/patterns and copied each frame; the background
gradient only covers the inside of the tower; text uses a cheap outline instead of a blurred shadow; the canvas
never uses more pixels than a 2560×1440 screen; background shapes that have scrolled away are thrown out.
