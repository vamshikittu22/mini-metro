# 🚇 MINI METRO ▲ WEB
### The "Architect Mode" Transit Simulator

> **"Think of your engine like a DVD player. The code is the player; the settings are the DVD. You change the movie without buying a new player."** — Archie, your Friendly Game Dev Mentor.

---

## 🛠️ The Game Plan: How to Build
This project follows the **Architect Mode Pattern**. Instead of burying numbers in code, we keep our systems "dumb" and our data "smart."

1.  **Shared Systems**: Our core logic (like `geometry.ts` and `gameEngine.ts`) works exactly the same in the main game as it does in the technical case study.
2.  **Settings over Code**: All the rules—how fast trains go, how often stations spawn, and line colors—live in `constants.ts`.
3.  **Building Blocks**: Features like the `HybridGreedyRouter` are modular. You can swap the routing logic without breaking the trains!
4.  **Architect Scene**: The `CaseStudyView` is our dedicated "Architect Level." It uses the same building blocks as the game but lets us test new ideas in a controlled environment.

---

## 💎 Design: Swiss Modernism
We follow the **International Typographic Style**:
- **Precision Topology**: SNapping to 45°/90° to keep things clean.
- **Brutalist Utility**: High-contrast, no-nonsense UI.
- **Data over Decoration**: Using a dashboard-inspired grid to manage complexity.

---

## 🚀 Technical "DVDs" (Settings Assets)
To change the game, you don't need to be a coding wizard. Just swap the "DVD" in these files:
- **`constants.ts`**: The Source of Truth. Change `trainSpeed`, `spawnRate`, or `lineColors` here.
- **`data/cities.ts`**: The Map Settings. Define new water boundaries and station locations.
- **`constants/pathfinding.config.ts`**: The Brain Settings. Adjust how long a passenger is willing to wait before getting frustrated.

---

## 🧠 Smart Systems
### ⚡ Performance Core
- **Dirty Rectangle Redraw**: We only paint what's moving. This keeps the game running at a smooth 60 FPS even when the city gets crowded.
- **Object Pooling (Conceptual)**: We recycle our passenger entities to keep memory usage low.

### 🤖 AI Topology Advisor
Powered by **Google Gemini 3 Pro**, our "Strategist" looks at your map and uses heuristic logic to find bottlenecks. It’s like having a senior transit engineer looking over your shoulder.

---

## ⌨️ Operator Controls
| Key | Action |
| :--- | :--- |
| **SPACE** | Toggle Simulation Pause |
| **1 - 4** | Set Simulation Speed |
| **TAB** | Cycle Active Line Focus |
| **Z / Y** | Undo / Redo Topology |
| **ESC** | Return to Hub |
| **DRAG** | Create/Extend Lines |
| **RIGHT CLICK** | Sever Line Segments |

---

**Remember:** Keep your code modular, your settings separate, and your stations connected! Happy building! 🚇▲