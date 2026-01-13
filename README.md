# 🚇 MINI METRO ▲ WEB
### High-Fidelity Minimalist Transit Simulation Engine

![Project Status](https://img.shields.io/badge/status-stable-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-19.2-61DAFB)
![AI](https://img.shields.io/badge/AI-Gemini_3_Pro-orange)

> **Mini Metro ▲ Web** is a creative technology project that re-imagines the iconic transit strategy game through the lens of Swiss Modernism and advanced frontend systems engineering. Built as a high-performance simulation engine, it challenges players to design efficient subway networks for rapidly growing global metropolises.

---

## 💎 Design Philosophy
The application adheres strictly to the **International Typographic Style** (Swiss Design):
- **Precision Topology**: Clean, geometric lines and abstract station shapes following 45°/90° constraints.
- **Brutalist Utility**: A high-contrast UI that prioritizes information density over decoration.
- **Hierarchical Clarity**: A dashboard-inspired Case Study view utilizing a strictly constrained grid to communicate complex system architecture at a glance.

---

## 🚀 Technical Architecture

### ⚡ Performance Core
- **Dirty Rectangle Redraw**: A sophisticated rendering strategy that identifies modified world segments (moving trains, pulsing timers) and updates only the necessary screen regions, maintaining a steady 60 FPS.
- **Layered Compositing**: Separation of concerns between the **Static Layer** (cached grids/water) and the **Dynamic Layer** (real-time entities) to minimize draw calls.
- **Deterministic Loop**: A decoupled game loop that ensures simulation state remains consistent across varying frame rates.

### 🧠 Strategic Intelligence (Gemini AI)
The "Topology Advisor" leverages **Google Gemini 3 Pro** to act as a system strategist:
- **Heuristic Pathfinding**: Analyzes on-demand snapshots of network topology and station congestion.
- **Engineering Rationale**: Generates structured JSON recommendations for new lines, providing technical justifications for resolving system bottlenecks.

### 🛤️ Routing & Pathfinding
- **Hybrid Greedy Router**: Simulates human commuter behavior by balancing direct-line travel against transfer penalties and directional alignment.
- **Depth-Limited Search (DLS)**: A graph traversal algorithm used to verify destination reachability before a passenger decides to board a train.

---

## 🗺️ Global Simulations
Strategize across seven accurately mapped global hubs, each with unique constraints:
- **London**: Winding Thames topology with limited tunnel resources.
- **Tokyo**: Extreme density requiring high-frequency multi-modal transfers.
- **NYC**: Manhattan grid optimization and island connectivity.
- **Paris, Berlin, Hong Kong, Cairo**: Distinct geographic challenges and difficulty scaling.

---

## ⌨️ Operator Controls
| Key | Action |
| :--- | :--- |
| **SPACE** | Pause / Resume System Time |
| **1 - 4** | Adjust Simulation Speed (1x to 4x) |
| **TAB** | Cycle Active Transit Line focus |
| **Z / Y** | Topology Undo / Redo |
| **ESC** | Return to System Hub |
| **DRAG** | Create or extend transit lines between stations |
| **RIGHT CLICK** | Sever specific line segments |

---

## 🛠️ Tech Stack
- **Framework**: React 19 (Hooks, Reducers, Refs for Engine Synchronization)
- **Engine**: Pure TypeScript 5.8 (Class-based Simulation Logic)
- **Intelligence**: @google/genai (Gemini 3 Pro Preview)
- **Styling**: TailwindCSS (Custom Swiss-Design configuration)

---

**Creative Technologist**: Vamshi Krishna
*Educational project inspired by the original Mini Metro by Dinosaur Polo Club. This clone serves as a demonstration of high-fidelity web simulation and UI architecture.*