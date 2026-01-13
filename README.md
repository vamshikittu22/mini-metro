# 🚇 MINI METRO ▲ WEB
### High-Fidelity Minimalist Transit Simulation Engine

![Project Status](https://img.shields.io/badge/status-stable-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-19.2-61DAFB)
![AI](https://img.shields.io/badge/AI-Gemini_3_Pro-orange)

> **Mini Metro ▲ Web** is a creative technology project that re-imagines the iconic transit strategy game through the lens of Swiss Modernism and futuristic UI/UX. Built as a high-performance simulation engine, it challenges players to design efficient subway networks for rapidly growing global metropolises.

---

## 💎 Design Philosophy
The application adheres to the **International Typographic Style** (Swiss Design):
- **Precision Topology**: Clean, geometric lines and abstract station shapes.
- **Futuristic Utility**: A high-contrast, brutalist UI that prioritizes information density and clarity.
- **Aesthetic Simulation**: Smooth, hardware-accelerated animations paired with a soothing, minimal color palette.

---

## 🚀 Technical Architecture

### ⚡ Performance Core
- **Canvas 2D Rendering**: Uses a custom **Dirty Rectangle Optimization** strategy. Instead of redrawing the entire world every frame, the engine identifies moving trains and pulsing timers, updating only the affected pixels.
- **Hybrid Greedy Pathfinding**: A custom routing algorithm that simulates realistic passenger behavior. Passengers evaluate wait times, transfer penalties, and directional flow before deciding whether to board or alight.
- **Offscreen Buffer Caching**: Static elements like geographic bounds, grid lines, and water bodies are cached in offscreen canvases to maintain a steady 60FPS even with complex networks.

### 🧠 Strategic Intelligence (Gemini AI)
The "Topology Advisor" feature leverages the **Google Gemini 3 Pro** model to assist players with network bottlenecks. 
- **Trigger-Based Analysis**: On-demand snapshots of station coordinates, types, and current passenger loads are sent to the AI.
- **Route Optimization**: The AI returns a structured JSON recommendation for a single new transit line, complete with an engineering rationale explaining why that specific path resolves system stress.

---

## 🗺️ Global Simulations
Strategize across seven accurately mapped global hubs:
- **London**: Navigate the winding Thames with limited tunnel resources.
- **Tokyo**: Handle extreme density and complex multi-modal transfers.
- **NYC**: Optimize the grid-based island topology of Manhattan.
- **Paris, Berlin, Hong Kong, Cairo**: Each city features unique geographic constraints and difficulty scaling.

---

## ⌨️ Operator Controls
| Key | Action |
| :--- | :--- |
| **SPACE** | Pause / Resume System Time |
| **1 - 4** | Adjust Simulation Speed |
| **TAB** | Cycle Active Transit Line |
| **Z / Y** | Topology Undo / Redo |
| **DRAG** | Create / Extend Transit Lines |
| **RIGHT CLICK** | Sever Line Segment |

---

## 🛠️ Tech Stack
- **Framework**: React 19 (Hooks, Reducers, Refs for Engine Sync)
- **Engine**: Pure TypeScript 5.8 (Class-based Simulation)
- **Intelligence**: @google/genai (Gemini 3 Pro Preview)
- **Styling**: TailwindCSS (Custom Swiss-Design configuration)

---

**Creative Technologist**: Vamshi Krishna
*Educational project inspired by the original Mini Metro by Dinosaur Polo Club.*