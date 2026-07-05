'use strict';

const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');

const COLS = 52;
const ROWS = 28;
let CELL = 24;

const COLORS = {
  bg: '#0d1117',
  gridLine: '#21262d',
  wall: '#3d444d',
  start: '#3fb950',
  end: '#f85149',
  visited: 'rgba(56, 139, 253, 0.40)',
  path: '#f0c674',
};

let grid, start, end;
let animating = false;
let mouseMode = null; // 'wall' | 'erase' | 'start' | 'end'

function makeGrid() {
  grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ wall: false, state: null }))
  );
  start = { r: Math.floor(ROWS / 2), c: 6 };
  end = { r: Math.floor(ROWS / 2), c: COLS - 7 };
}

function resize() {
  const width = Math.min(window.innerWidth - 40, COLS * 26);
  CELL = Math.max(10, Math.floor(width / COLS));
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;
  draw();
}

function draw() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      let fill = null;
      if (cell.state === 'visited') fill = COLORS.visited;
      if (cell.state === 'path') fill = COLORS.path;
      if (cell.wall) fill = COLORS.wall;
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
      }
    }
  }

  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= COLS; c++) {
    ctx.moveTo(c * CELL + 0.5, 0);
    ctx.lineTo(c * CELL + 0.5, ROWS * CELL);
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.moveTo(0, r * CELL + 0.5);
    ctx.lineTo(COLS * CELL, r * CELL + 0.5);
  }
  ctx.stroke();

  drawNode(start, COLORS.start);
  drawNode(end, COLORS.end);
}

function drawNode(n, color) {
  const pad = Math.max(2, CELL * 0.16);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(n.c * CELL + CELL / 2, n.r * CELL + CELL / 2, CELL / 2 - pad, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Search algorithms
// ---------------------------------------------------------------------------

const key = (r, c) => r * COLS + c;
const manhattan = (r, c) => Math.abs(r - end.r) + Math.abs(c - end.c);

function neighbors(r, c) {
  const out = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !grid[nr][nc].wall) {
      out.push([nr, nc]);
    }
  }
  return out;
}

function rebuildPath(cameFrom) {
  const path = [];
  let k = key(end.r, end.c);
  while (k !== undefined) {
    path.push([Math.floor(k / COLS), k % COLS]);
    k = cameFrom.get(k);
  }
  return path.reverse();
}

// Returns { visitedOrder: [[r,c], ...], path: [[r,c], ...] | null }
function search(kind) {
  const visitedOrder = [];
  const cameFrom = new Map();
  const startKey = key(start.r, start.c);

  if (kind === 'bfs') {
    const queue = [[start.r, start.c]];
    const seen = new Set([startKey]);
    let head = 0;
    while (head < queue.length) {
      const [r, c] = queue[head++];
      visitedOrder.push([r, c]);
      if (r === end.r && c === end.c) return { visitedOrder, path: rebuildPath(cameFrom) };
      for (const [nr, nc] of neighbors(r, c)) {
        const k = key(nr, nc);
        if (!seen.has(k)) {
          seen.add(k);
          cameFrom.set(k, key(r, c));
          queue.push([nr, nc]);
        }
      }
    }
    return { visitedOrder, path: null };
  }

  // A*, Dijkstra and Greedy Best-First share one loop and differ only in f(n):
  //   dijkstra: f = g,  astar: f = g + h,  greedy: f = h
  const g = new Map([[startKey, 0]]);
  const open = [{ r: start.r, c: start.c, f: kind === 'dijkstra' ? 0 : manhattan(start.r, start.c) }];
  const closed = new Set();

  while (open.length) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const cur = open.splice(best, 1)[0];
    const ck = key(cur.r, cur.c);
    if (closed.has(ck)) continue;
    closed.add(ck);
    visitedOrder.push([cur.r, cur.c]);
    if (cur.r === end.r && cur.c === end.c) return { visitedOrder, path: rebuildPath(cameFrom) };

    for (const [nr, nc] of neighbors(cur.r, cur.c)) {
      const nk = key(nr, nc);
      if (closed.has(nk)) continue;
      const tentative = g.get(ck) + 1;
      if (tentative < (g.get(nk) ?? Infinity)) {
        g.set(nk, tentative);
        cameFrom.set(nk, ck);
        const h = kind === 'dijkstra' ? 0 : manhattan(nr, nc);
        open.push({ r: nr, c: nc, f: kind === 'greedy' ? h : tentative + h });
      }
    }
  }
  return { visitedOrder, path: null };
}

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

function animate(cells, state, perFrame) {
  return new Promise(resolve => {
    let i = 0;
    function frame() {
      for (let n = 0; n < perFrame && i < cells.length; n++, i++) {
        const [r, c] = cells[i];
        const isEndpoint = (r === start.r && c === start.c) || (r === end.r && c === end.c);
        if (!isEndpoint) grid[r][c].state = state;
      }
      draw();
      if (i < cells.length) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

async function run() {
  if (animating) return;
  animating = true;
  document.getElementById('run').disabled = true;
  clearPath();

  const kind = document.getElementById('algorithm').value;
  const speed = Number(document.getElementById('speed').value);

  const t0 = performance.now();
  const { visitedOrder, path } = search(kind);
  const elapsed = (performance.now() - t0).toFixed(1);

  await animate(visitedOrder, 'visited', speed * 4);
  if (path) await animate(path, 'path', 2);

  document.getElementById('stats').textContent = path
    ? `✔ Path found — length ${path.length - 1} · explored ${visitedOrder.length} cells · solved in ${elapsed} ms`
    : `✘ No path exists — explored ${visitedOrder.length} cells in ${elapsed} ms`;

  animating = false;
  document.getElementById('run').disabled = false;
}

// ---------------------------------------------------------------------------
// Board actions
// ---------------------------------------------------------------------------

function clearPath() {
  for (const row of grid) for (const cell of row) cell.state = null;
  document.getElementById('stats').textContent = '';
  draw();
}

function resetBoard() {
  if (animating) return;
  makeGrid();
  document.getElementById('stats').textContent = '';
  draw();
}

function randomMaze() {
  if (animating) return;
  makeGrid();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const isEndpoint = (r === start.r && c === start.c) || (r === end.r && c === end.c);
      if (!isEndpoint && Math.random() < 0.28) grid[r][c].wall = true;
    }
  }
  document.getElementById('stats').textContent = '';
  draw();
}

// ---------------------------------------------------------------------------
// Mouse interaction
// ---------------------------------------------------------------------------

function cellAt(e) {
  const rect = canvas.getBoundingClientRect();
  const c = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
  const r = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
  return { r, c };
}

function applyMouse(p) {
  if (mouseMode === 'start') {
    if (!grid[p.r][p.c].wall && !(p.r === end.r && p.c === end.c)) start = { ...p };
  } else if (mouseMode === 'end') {
    if (!grid[p.r][p.c].wall && !(p.r === start.r && p.c === start.c)) end = { ...p };
  } else {
    const isEndpoint = (p.r === start.r && p.c === start.c) || (p.r === end.r && p.c === end.c);
    if (!isEndpoint) grid[p.r][p.c].wall = mouseMode === 'wall';
  }
  draw();
}

canvas.addEventListener('pointerdown', e => {
  if (animating) return;
  const p = cellAt(e);
  if (!p) return;
  if (p.r === start.r && p.c === start.c) mouseMode = 'start';
  else if (p.r === end.r && p.c === end.c) mouseMode = 'end';
  else mouseMode = grid[p.r][p.c].wall ? 'erase' : 'wall';
  applyMouse(p);
});

canvas.addEventListener('pointermove', e => {
  if (!mouseMode) return;
  const p = cellAt(e);
  if (p) applyMouse(p);
});

window.addEventListener('pointerup', () => (mouseMode = null));

// ---------------------------------------------------------------------------
// Wire up
// ---------------------------------------------------------------------------

document.getElementById('run').addEventListener('click', run);
document.getElementById('maze').addEventListener('click', randomMaze);
document.getElementById('clearPath').addEventListener('click', () => !animating && clearPath());
document.getElementById('reset').addEventListener('click', resetBoard);
window.addEventListener('resize', resize);

makeGrid();
resize();
