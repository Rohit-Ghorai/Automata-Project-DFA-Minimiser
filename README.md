# DFA Minimisation Simulator (DFA.lab) ⚡

An interactive, visual automata laboratory for designing, simulating, and minimizing Deterministic Finite Automata (DFA) using partition refinement and reachability analysis. Built with React, TypeScript, Vite, and Tailwind CSS.

---

## 🌟 Key Features

- **Interactive DFA Builder**:
  - Define custom states, alphabet symbols, start state, and final/accepting states.
  - Live editable transition table with automatic validation.
  - JSON import and export for saving or loading custom automata models.
  - Fault-tolerant editing with automatic orphaned transition cleanup.

- **Step-by-Step Minimisation Simulation**:
  - **Reachability Analysis**: Discovers and removes states unreachable from the start state via BFS.
  - **Partition Refinement**: Separates final and non-final states, then iteratively refines blocks based on transition destination signatures (Myhill–Nerode theorem).
  - **Interactive Playback**: Play, pause, step forward, rewind, replay, and control simulation speed ($0.5\times$, $1\times$, $2\times$).

- **Dynamic Interactive Graph Visualizer**:
  - Drag-and-drop state positioning with smooth animations.
  - Clean SVG rendering with outward radial self-loops and curved bidirectional edges.
  - Combined transition labels (e.g., `0, 1` instead of overlapping arrows).
  - Clear visual markers for start states and accepting states (double ring).

- **String Lab (Automata Testing)**:
  - Run arbitrary strings (including the empty string $\varepsilon$) simultaneously on both the original and minimal DFA.
  - Visual transition trace showing the complete path from start to acceptance or rejection.

- **Theory & Viva Guide**:
  - Built-in field guide covering formal 5-tuple definitions, equivalence classes, partition refinement rules, and common viva questions.

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Unit Testing**: [Vitest](https://vitest.dev/)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Rohit-Ghorai/Automata-Project-DFA-Minimiser.git
   cd Automata-Project-DFA-Minimiser
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173/`.

---

## 📋 Available Scripts

- **`npm run dev`**: Starts the Vite development server with Hot Module Replacement (HMR).
- **`npm run build`**: Compiles TypeScript and builds production-ready static assets in `dist/`.
- **`npm test`**: Runs unit test suites with Vitest.
- **`npm run preview`**: Previews the production build locally.

---

## 📂 Project Structure

```text
├── src/
│   ├── algorithm.ts       # Core DFA data types, reachability, validation & minimisation logic
│   ├── algorithm.test.ts  # Vitest unit tests for reachability and partition refinement
│   ├── App.tsx            # Main application UI, SVG diagram visualizer, builder & simulator
│   ├── main.tsx           # React entrypoint with global ErrorBoundary
│   └── styles.css         # Tailwind directives and custom component styles
├── index.html             # HTML template
├── package.json           # Project metadata and dependencies
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

---

## 📖 How Minimisation Works

1. **Eliminate Unreachable States**:
   Traverse outward from the start state $q_0$ using all alphabet symbols. Any state not visited is discarded.
2. **Initial Partition Split ($P_0$)**:
   Divide reachable states into two equivalence classes:
   $$P_0 = \{ F, \; Q \setminus F \}$$
3. **Refinement ($P_{k+1}$)**:
   For each block in the current partition, examine the destination partition of every state for every input symbol. Split blocks whose states transition into different partitions.
4. **Equivalence & Merge**:
   Repeat refinement until no further splits occur. Each resulting partition becomes a single state in the minimal DFA.

---

## 📄 License

This project is licensed under the MIT License.
