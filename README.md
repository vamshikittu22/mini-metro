
# 🚇 MINI METRO ▲ WEB

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB)
![AI](https://img.shields.io/badge/AI-Gemini_3_Pro-orange)

> A high-fidelity, minimalist transit simulation engine built with modern web technologies. Strategize, expand, and optimize metropolitan rail networks across the world's greatest cities.

---

## 📋 Table of Contents
- [1. Overview](#1-overview)
- [2. Features & Functionalities](#2-features--functionalities)
- [3. Tech Stack](#3-tech-stack)
- [4. Architecture & Design Patterns](#4-architecture--design-patterns)
- [5. Gameplay Guide](#7-gameplay-guide)
- [6. Game Mechanics](#9-game-mechanics-deep-dive)
- [7. API Integration](#11-api-integration)

---

## 1. Overview
**Mini Metro ▲ Web** is a minimalist transit simulation engine. It challenges players to design an efficient subway layout for a rapidly growing city, focusing on the abstract elegance of transit maps where efficiency is measured in throughput.

### Key Differentiators
- **AI Line Suggestion**: Powered by Google Gemini, providing a technical proposal for a single new transit line based on current network congestion.
- **Data Analytics**: Export detailed Markdown reports of your system's performance and throughput history.
- **Hybrid Greedy Pathfinding**: A sophisticated routing engine simulating realistic passenger behavior.

---

## 2. Features & Functionalities

### 🎮 Core Gameplay
- **Real-world Maps**: 7 cities (London, Paris, NYC, Tokyo, Berlin, Hong Kong, Cairo) with accurate geographic bounds.
- **Dynamic Spawning**: Stations and passengers spawn based on weighted probability.
- **Resource Inventory**: Strategic management of Locomotives, Wagons, Tunnels, and Bridges.
- **Weekly Reward System**: Level-up loop offering strategic expansion choices.

### 🕹️ Game Modes
- **NORMAL**: Balanced growth and difficulty scaling.
- **EXTREME**: Higher spawn rate and accelerated overflow timers.
- **ENDLESS**: Focus purely on network efficiency without failure states.
- **CREATIVE**: Unlimited resources for free-form design.

---

## 3. Tech Stack
- **Frontend Framework**: React 19.2.3
- **Language**: TypeScript 5.8.2
- **Styling**: TailwindCSS
- **AI Integration**: @google/genai (Gemini 3 Pro)
- **Rendering**: Native HTML5 Canvas 2D API

---

## 4. API Integration
The **Strategist** helper uses the `gemini-3-pro-preview` model. When manually triggered, it analyzes a snapshot of the current network (station types, loads, and existing connections) to suggest a single optimized route.
- **Triggered Only**: AI is only invoked on explicit user request via the "Suggest Line" button.
- **JSON Structured Output**: Responses are strictly parsed as structured data to provide a path of station IDs and a technical rationale.

---

## 5. Performance Optimization
- **Dirty Rectangle Optimization**: The renderer only updates regions of the canvas that have changed (trains, timers, animations).
- **Static Background Caching**: Grid and water elements are rendered to an offscreen buffer.
- **Pathfinding Cache**: Reachability results are memoized to ensure smooth 60FPS simulation.

---

**Built with ▲ by Vamshi Krishna**
*(Mini Metro is a registered trademark of Dinosaur Polo Club. This project is a non-commercial educational work.)*
