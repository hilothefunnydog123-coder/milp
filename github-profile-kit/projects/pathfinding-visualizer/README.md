# 🧭 Pathfinding Visualizer

Watch **A\***, **Dijkstra**, **Breadth-First Search** and **Greedy Best-First** race across a grid you draw — in real time, at 60fps, with **zero dependencies**. One HTML file, one stylesheet, one script. No build step, no framework.

## ✨ Features

- **4 algorithms** — A* (Manhattan heuristic), Dijkstra, BFS, and Greedy Best-First, all sharing a clean, readable core loop
- **Draw your own mazes** — click and drag to paint walls, drag again to erase
- **Movable endpoints** — grab the start or end node and drop it anywhere
- **Random maze generator** — one click for a fresh challenge
- **Live stats** — path length, cells explored, and solve time in milliseconds
- **Buttery animation** — batched `requestAnimationFrame` rendering on a single `<canvas>`
- **Works on touch** — pointer events throughout

## 🚀 Run it

No install. No build. Just:

```bash
git clone https://github.com/hilothefunnydog123-coder/pathfinding-visualizer.git
cd pathfinding-visualizer
open index.html        # or double-click it, or `python3 -m http.server`
```

## 🧠 How it works

All three weighted/heuristic searches share one loop and differ only in their priority function:

| Algorithm | Priority `f(n)` | Behaviour |
|---|---|---|
| Dijkstra | `g(n)` | Explores uniformly — guaranteed shortest path |
| A* | `g(n) + h(n)` | Directed toward the goal — guaranteed shortest path with an admissible heuristic |
| Greedy Best-First | `h(n)` | Beelines for the goal — fast, but no optimality guarantee |
| BFS | FIFO queue | Uniform expansion — shortest path on unweighted grids |

where `g(n)` is the cost from the start and `h(n)` is the Manhattan distance to the goal.

Try running Greedy and A* on the same maze — watching Greedy dive into a dead end while A* calmly routes around it is the whole point of this project.

## 📄 License

MIT
