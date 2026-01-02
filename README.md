# 🚇 MINI METRO ▲ WEB

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB)
![AI](https://img.shields.io/badge/AI-Gemini_3_Pro-orange)

> A high-fidelity, minimalist transit simulation engine built with modern web technologies. Strategize, expand, and optimize metropolitan rail networks across the world's greatest cities.

[🎮 Play Live Demo](https://mini-metro-tau.vercel.app/) | [📊 Report Bug](https://github.com/vamshikittu22/mini-metro/issues) | [✨ Request Feature](https://github.com/vamshikittu22/mini-metro/issues)

---

## 📋 Table of Contents
- [1. Overview](#1-overview)
- [2. Features & Functionalities](#2-features--functionalities)
- [3. Tech Stack](#3-tech-stack)
- [4. Architecture & Design Patterns](#4-architecture--design-patterns)
- [5. Installation & Setup](#5-installation--setup)
- [6. Configuration](#6-configuration)
- [7. Gameplay Guide](#7-gameplay-guide)
- [8. Cities & Difficulty](#8-cities--difficulty)
- [9. Game Mechanics Deep Dive](#9-game-mechanics-deep-dive)
- [10. File Structure](#10-file-structure)
- [11. API Integration](#11-api-integration)
- [12. Performance Optimization](#12-performance-optimization)
- [13. Known Issues & Limitations](#13-known-issues--limitations)
- [14. Future Roadmap](#14-future-roadmap)
- [15. Credits & Acknowledgments](#15-credits--acknowledgments)
- [16. License](#16-license)
- [17. Contact & Support](#17-contact--support)

---

## 1. Overview
**Mini Metro ▲ Web** is a creative technologist's tribute to the iconic transit simulation genre. It challenges players to design an efficient subway layout for a rapidly growing city. Unlike traditional city builders, it focuses on the abstract elegance of transit maps, where efficiency is measured in throughput and aesthetics are defined by Swiss design principles.

### The Problem It Solves
Urban planning is a complex puzzle of resource allocation and flow optimization. This project provides a sandbox to experiment with network topology, identifying bottlenecks and testing the limits of "Hybrid Greedy" routing in a real-time environment.

### Key Differentiators
- **Real-time AI Strategist**: Powered by Google Gemini, providing contextual advice based on your current network load.
- **Data Analytics**: Export detailed Markdown reports of your system's performance, resource usage, and throughput history.
- **Hybrid Greedy Pathfinding**: A sophisticated routing engine that simulates realistic passenger behavior, including transfer penalties and wait-time preferences.

---

## 2. Features & Functionalities

### 🎮 Core Gameplay
- **Real-world Maps**: 8 meticulously mapped cities (London, Paris, NYC, Tokyo, Berlin, Hong Kong, Cairo) with accurate geographic bounds.
- **Dynamic Spawning**: Stations and passengers spawn based on weighted probability and current network saturation.
- **Drag-and-Drop Transit**: Intuitive line creation with automatic 45°/90° angle snapping (elbow paths).
- **Resource Inventory**: Strategic management of Locomotives, Wagons, Tunnels, and Bridges.
- **Score Tracking**: Real-time throughput (delivered passengers) and "Operational Week" progression.

### 🧠 Advanced Systems
- **Hybrid Greedy Pathfinding**: Recursive depth-limited search (max 2 transfers) with station-type reachability verification.
- **Stranded Detection**: Passengers automatically clear after a 30s timeout if their destination becomes unreachable, preventing infinite clutter.
- **Water Crossing Logic**: Dynamic detection of river crossings requiring specific resources (Tunnels vs Bridges).
- **Weekly Reward System**: Level-up loop offering strategic choices between infrastructure expansion packs.

### 🕹️ Game Modes
- **NORMAL**: Standard balanced growth and difficulty scaling.
- **EXTREME**: 1.5x spawn rate and accelerated station overflow timers.
- **ENDLESS**: Stations never overflow; focus purely on network efficiency.
- **CREATIVE**: Unlimited resources and manual station placement tools.

### 🎨 UI/UX
- **Swiss Design**: Minimalist aesthetic with high-contrast typography (Inter font).
- **Responsive Canvas**: Smooth 60FPS rendering with high-performance zoom and pan capabilities.
- **System Auditor**: Background integrity checker that ensures resource counts stay synced between the map and inventory.

---

## 3. Tech Stack
- **Frontend Framework**: [React 19.2.3](https://react.dev/) (Concurrent Mode)
- **Programming Language**: [TypeScript 5.8.2](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6.2.0](https://vitejs.dev/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) (Utility-first CSS)
- **AI Integration**: [@google/genai](https://www.npmjs.com/package/@google/genai) (Gemini 3 Pro)
- **Rendering**: Native HTML5 Canvas 2D API
- **State Management**: Context-free React Hooks & Service Layer pattern

---

## 4. Architecture & Design Patterns

### Component Architecture
The application uses a hybrid approach:
1. **React UI Layer**: Handles menus, HUD, AI Strategist interactions, and overlays.
2. **Simulation Layer**: A vanilla TypeScript engine that runs the core game loop (GameEngine.ts).
3. **Rendering Layer**: Decoupled canvas renderer (Renderer.ts) that translates the state into visual elements.

### Service Layer Pattern
Logic is separated into specialized services:
- **GameEngine**: The heart of the simulation (tick management, spawning, train updates).
- **HybridGreedyRouter**: Encapsulates passenger decision-making logic.
- **RouteEvaluator**: Graph-based math for reachability and cost estimation.
- **InventoryManager**: Ensures strict asset accounting.
- **DataLogger**: Handles performance tracking and file exports.

---

## 5. Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **NPM/PNPM/Yarn**

### Step-by-Step
```bash
# 1. Clone the repository
git clone https://github.com/vamshikittu22/mini-metro.git
cd mini-metro

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Create a .env file in the root directory
# Add your Gemini API Key
echo "API_KEY=your_gemini_api_key_here" > .env

# 4. Run development server
npm run dev

# 5. Build for production
npm run build
```

---

## 6. Configuration
- **API_KEY**: Required for the Strategist advisor.
- **PATHFINDING_CONFIG**: Located in `src/constants/pathfinding.config.ts`. You can adjust `MAX_TRANSFER_DEPTH` or `COST_PENALTIES` here.
- **GAME_CONFIG**: Located in `src/constants.ts`. Adjust `spawnRate`, `trainSpeed`, and `maxPassengers`.

---

## 7. Gameplay Guide

### How to Play
1. **Select a City**: Start with London (Difficulty 1.0) to learn the basics.
2. **Create Lines**: Click on a station and drag to another to establish your first transit line.
3. **Manage Trains**: Click the "Loco" icons in the Resource Panel to add trains to your active line.
4. **Expand**: As new stations appear, extend your lines or create new ones using your limited color palette.
5. **Reward Cycle**: Every Sunday, choose between expansion packs to bolster your infrastructure.

### Controls
| Input | Action |
| :--- | :--- |
| **Mouse Drag** | Create/Extend Line or Pan Camera (background) |
| **Right-Click** | Delete a line segment |
| **Scroll Wheel** | Zoom In/Out |
| **Speed Buttons** | Pause (0x), Normal (1x), Fast (2x), Ultra (4x) |

---

## 8. Cities & Difficulty

| City | Difficulty | Initial Stations | Special Features |
| :--- | :--- | :--- | :--- |
| **London** | 1.0 | 3 | The River Thames (Tunnels) |
| **Paris** | 1.1 | 3 | The Seine (Bridges) |
| **NYC** | 1.3 | 3 | Harbor Islands & Tunnels |
| **Tokyo** | 1.5 | 3 | High-density Shinjuku hub |
| **Hong Kong** | 1.8 | 3 | Victoria Harbour (Extreme) |

---

## 9. Game Mechanics Deep Dive

### Pathfinding Logic (Hybrid Greedy)
The `HybridGreedyRouter` uses a three-phase approach:
1. **Reachability Check**: Uses recursive Depth-Limited Search to see if a destination shape is reachable within 2 transfers.
2. **Boarding Preference**: Passengers compare current train costs vs. waiting 10s for a "better" line.
3. **Transfer Evaluation**: At every stop, passengers check if an intersecting line provides a more efficient path to their goal.

### Resource Scaling
Starting resources are calculated using a difficulty-adjusted base:
`Base * (1 + Difficulty * 0.5)`
This ensures harder cities like Hong Kong start with slightly more equipment to handle the rapid expansion.

---

## 10. File Structure
```text
/
├── components/
│   ├── HUD/            # Stats, ResourcePanel, selectors
│   ├── UI/             # Base buttons and Swiss elements
│   └── Strategist.tsx  # Gemini AI Advisor
├── constants/
│   └── pathfinding.config.ts # Tuning parameters
├── data/
│   └── cities.ts       # GeoJSON-style city data
├── services/
│   ├── gameEngine.ts   # Core simulation loop
│   ├── renderer.ts     # Canvas drawing engine
│   ├── geometry.ts     # Coordinate and snapping math
│   ├── inventoryManager.ts # Resource accounting
│   ├── validation.ts   # System integrity auditor
│   └── pathfinding/    # Graph and Router logic
├── types.ts            # Global TS Interfaces
├── App.tsx             # Main React entry point
└── index.tsx           # Bootstrapper
```

---

## 11. API Integration
The **AI Strategist** uses the `gemini-3-pro-preview` model. It sends a JSON-stringified snapshot of the game state (score, load per station, line density) and requests 3 concise, bulleted improvements.
- **Rate Limiting**: Throttled by the UI to prevent excessive calls.
- **Privacy**: Only abstract game metrics are sent; no personal data is transmitted.

---

## 12. Performance Optimization
- **Canvas Throttling**: The simulation runs at a fixed 60Hz, while React state updates are throttled to 10Hz for optimal UI performance.
- **Pathfinding Cache**: `RouteEvaluator` uses static Maps to cache reachability and cost results, cleared only when the network topology changes.
- **Geometry Caching**: Water polygons are projected once per city load rather than every frame.

---

## 13. 🐛 Known Issues & Limitations

- Gemini API model `gemini-3-pro-preview` may not be available in all regions.
- Performance drops with 50+ stations on lower-end devices.
- No mobile/touch support currently (desktop optimized).
- Canvas rendering uses 2D context (no WebGL acceleration).

---

## 14. 🗺️ Future Roadmap

- [ ] Mobile/touch controls support.
- [ ] Multiplayer mode (Co-op network management).
- [ ] Custom map creator (Draw your own city water/land).
- [ ] Steam Workshop integration (concept).
- [ ] Global Achievement system.
- [ ] High-fidelity Sound effects & Ambient music.
- [ ] More cities (Stockholm, Sydney, Singapore).

---

## 15. Credits & Acknowledgments
- **Original Concept**: Inspired by the brilliant *Mini Metro* by [Dinosaur Polo Club](https://dinopoloclub.com/).
- **Libraries**: React, Vite, TailwindCSS, Google Generative AI.
- **Design Inspiration**: Josef Müller-Brockmann & The Swiss Style.

---

## 16. License
This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 17. 📞 Contact & Support

**Found a bug?** [Open an issue](https://github.com/vamshikittu22/mini-metro/issues)  
**Have a feature request?** [Start a discussion](https://github.com/vamshikittu22/mini-metro/issues)  
**Need help?** [Join our Discord](https://discord.gg/your-invite)

**Developer:** [Vamshi Krishna](https://github.com/vamsikittu22)  
**Email:** krishnavamshi.2297@gmail.com  
**Vercel:** [Live Demo](https://mini-metro-tau.vercel.app/)

---

**Built with ▲ by [Vamshi Krishna](https://github.com/vamsikittu22)**
*(Mini Metro is a registered trademark of Dinosaur Polo Club. This project is a non-commercial educational work.)*