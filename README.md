# RCS

A pastel tower climber. Jump up the platforms, keep ahead of the scrolling screen, dodge spikes, shurikens, wall flames and fireballs.

## Main menu
Use the mouse, or the arrow keys + Enter. Esc goes back.

- **Solo** — *Climb* alone, or *Race the bot*.
- **Split screen** — 2–4 players on one keyboard, all on the same screen. Pick *Co-op* or *Versus*, then the number of players.
- **Multiplayer** — play online with a friend, one player on each computer. Pick *Co-op* or *Versus*; the game searches for another player who is searching too, shows **Match Found!** and loads the level. If you two picked different modes you're still matched — the player who started searching first decides.

**Co-op:** climb together. If anyone falls off the bottom or hits a hazard, everyone loses. Your best height is saved.
**Versus:** a race. The screen follows whoever is in the lead; fall behind the bottom edge (or hit a hazard) and you're out. Last one standing wins.

## Controls

| | Jump | Move | Drop through |
|---|---|---|---|
| Player 1 | W | A / D | S |
| Player 2 | ↑ | ← / → | ↓ |
| Player 3 | I | J / L | K |
| Player 4 | T | F / H | G |

Solo and online: WASD **or** the arrow keys. P pause (not online) · M sound · F full screen (in a browser) · Ctrl+Cmd+F full screen (Mac app).

Springs: press jump right as you land on one for a big launch; otherwise it's a normal bounce.

Some keyboards can't register many keys at once, so with 3–4 players a key press may occasionally be missed.

## Ways to play
- **Mac app** — double-click **RCS.app** (on another Mac, the first time: right-click → **Open**). Online play in the app connects to the address in `SERVER_URL` at the top of the online section of `game/index.html`.
- **Browser** — once the server is on Render, just open its address (e.g. `https://rcs.onrender.com`). Send the same link to your friend.

## Put it online (GitHub + Render)
The server (`server/server.js`) serves the game page and does the matchmaking. It has no dependencies.

1. **Create the GitHub repository**: go to <https://github.com/new>, name it `RCS`, leave "Add a README" unticked, and create it.
2. **Push this folder** (Terminal, in this folder — replace `YOUR-NAME`):
   ```
   git remote add origin https://github.com/YOUR-NAME/RCS.git
   git push -u origin main
   ```
3. **Deploy on Render**: in the Render dashboard choose **New → Blueprint**, connect your GitHub account, pick the `RCS` repository and click **Apply**. `render.yaml` sets everything up (free plan, `node server/server.js`).
4. When it's live, open the address Render shows. If it isn't exactly `https://rcs.onrender.com`, put your address in `SERVER_URL` in `game/index.html` (as `wss://…/ws`), run `./build.sh` to rebuild the Mac app, then commit and push.

Every push to GitHub redeploys the game on Render automatically.

Free Render services fall asleep after ~15 minutes without visitors; the first connection then takes up to a minute while it wakes up (the game shows "Connecting to the server…").

### Test online play on your own computer
```
node server/server.js 8791
```
Then open <http://localhost:8791> in two browser windows and press Multiplayer in both.

## The tower
- One main path goes up, every step within jumping reach of the last. Now and then an extra platform sticks out to the side.
- A row right after a row with a hazard is always hazard-free.
- Dangers unlock as you climb: springs 15 m · moving 30 m · spikes 50 m · crumbling 90 m · shurikens 120 m · wall flames 160 m · fireballs 230 m.

## Files
- `game/index.html` — the whole game (HTML5 + JavaScript).
- `server/server.js` — online server: serves the game and pairs up players.
- `render.yaml`, `package.json` — Render setup.
- `mac/` — the small Swift window that wraps the game, and the icon generator.
- `build.sh` — rebuilds `RCS.app` after you change the game.
- `backup/` — earlier versions of the game.

## Easy tweaks (in `game/index.html`)
- `ROW_GAP` — height between platform rows (120 = 3 m)
- `STAGES` — the height at which each obstacle first appears
- `JUMP_V`, `GRAV`, `MAX_VX` — jump strength, gravity, run speed
- `BOT` — the bot's speed (share of a human's) and its pause before each jump; raise `speed` / lower `think` to make it tougher
- `SERVER_URL` — the online server the Mac app connects to
