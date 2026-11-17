// RCS — The obstacle generator. For each row of the path it decides which obstacle (if any) the row gets —
// from the region's hazards, how far up the tower you are, and whether the row before had one (a row after
// a hazard is always clear) — and hands it the platforms; each obstacle then positions itself from them
// (js/obstacles/*.js). It also runs them all each frame and checks whether a cube was hit.
'use strict';

// Does a circle (x, y, r) touch this cube?
function circleHit(p, cx, cy, r) {
  const nx = clamp(cx, p.x + 3, p.x + p.w - 3), ny = clamp(cy, p.y + 3, p.y + p.h);
  return (nx - cx) ** 2 + (ny - cy) ** 2 < r * r;
}

// The obstacles for one row of the path. main: the path's platform on this row, prev: the step before it.
// Returns { rowHaz: does this row now have a hazard, blade: its shuriken, if any }
function obstaclesForRow({ main, prev, m, allowHaz, rowHaz, noFly }) {
  let blade = null;
  const onPath = main.type !== 'shaft';
  // A flamethrower on the path's platform (fire region)
  if (onPath && has(m, 'wallflame') && allowHaz && !rowHaz && main.type === 'normal' && main.w >= 110 && R() < lerp(0.3, 0.5, heat(m))) {
    addPlatformFlame(main, prev); rowHaz = true;
  }
  // One flying obstacle in the air above this row: a wall flame, a shuriken or a lightning beam
  if (onPath && allowHaz && !rowHaz && !noFly) {
    const pJet = has(m, 'wallflame') ? lerp(0.25, 0.45, heat(m)) * hz(m) : 0;
    const pBlade = has(m, 'shuriken') ? lerp(0.25, 0.45, heat(m)) * hz(m) : 0;
    const pZap = has(m, 'zapper') ? lerp(0.35, 0.55, heat(m)) * hz(m) : 0;
    const r = R();
    if (r < pJet) { addWallFlame(main); rowHaz = true; }
    else if (r < pJet + pBlade) { blade = addShuriken(main, m); rowHaz = true; }
    else if (r < pJet + pBlade + pZap) { addZapper(main, prev, m); rowHaz = true; }
  }
  // Water columns now and then (helpers)
  if (onPath && has(m, 'bubbles') && R() < 0.18) addBubbles(main);
  return { rowHaz, blade };
}

// Each frame
function updateObstacles(dt) { updateBlades(dt); updateJets(dt); updateZaps(dt); updateBubbles(); }
// What hit this cube, if anything (the reason shown when it's knocked out)
function obstacleHit(p) { return spikeHit(p) || bladeHit(p) || flameHit(p) || fireballHit(p) || zapHit(p); }
