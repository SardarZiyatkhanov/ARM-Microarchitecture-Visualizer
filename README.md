# PlayARM: ARM Microarchitecture Visualizer

![Status](https://img.shields.io/badge/Status-In--Progress-orange)
![Tech Stack](https://img.shields.io/badge/Tech--Stack-React%20%7C%20TypeScript%20%7C%20Expo%20%7C%20Firebase-blue)
![Last Updated](https://img.shields.io/badge/Last%20Updated-April%202026-green)

**PlayARM** is an interactive educational platform designed to visualize the execution of ARM assembly instructions at the microarchitecture level. It provides a deep dive into the internal workings of a processor, bridging the gap between high-level code and low-level hardware execution.

Developed as a **Senior Design Project (SDP)** at **ADA University**, this tool helps students and enthusiasts understand the complexities of instruction pipelining, CPU state management, control signals, and virtual memory systems.

---

## 🚀 Key Features

### 🔁 Pipeline Simulation
- **Interactive 5-Stage Pipeline Visualization**: See instructions flow through Fetch → Decode → Execute → Memory → Write-Back stages in real-time on a dynamic Fabric.js canvas.
- **Step-by-Step Execution**: Control the simulation with Play, Pause, Step, and Reset to observe every clock cycle.
- **Real-Time CPU State Tracking**: Monitor Register files (R0–R7, SP, LR, PC), memory contents, and CPU Flags (N, Z, C, V).
- **Dynamic Control Signals Panel**: Visualize active control signals generated during the Decode stage (RegWrite, MemRead, MemWrite, Branch, ALUOp, ALUSrc, MemToReg).
- **Pipeline Activity Panel**: See which instruction is in each pipeline stage at any given clock cycle.

### 💾 Virtual Memory & TLB *(Added March 2026)*
- **TLB Simulation**: A 16-entry fully-associative Translation Lookaside Buffer with LRU eviction, simulating real ARM memory access behavior.
- **Virtual → Physical Address Translation**: Every `LDR`/`STR` instruction automatically translates its virtual address to a physical address using the TLB (4 KB pages, 12-bit offset).
- **TLB Hit / Miss Detection**: Clearly distinguishes TLB hits (cached translation) from TLB misses (page table walk), with color-coded indicators.
- **Page Table Viewer**: Displays all allocated Virtual Page Number (VPN) → Physical Frame Number (PFN) mappings.
- **Access Log**: Tracks the last 20 memory accesses with hit/miss status and translated addresses.
- **Hit Rate Statistics**: Live hit count, miss count, and hit rate percentage updated on every memory instruction.

### 📱 Mobile App (React Native / Expo) *(Added April 2026)*
- **Full ARM Pipeline Simulator on iOS & Android**: Native port of the web simulator built with Expo SDK 55 and React Native 0.83.4.
- **System-Adaptive Light/Dark Theme**: Automatically follows the device's color scheme preference (`useColorScheme`) — no manual toggle needed. A GitHub-inspired palette (50+ semantic tokens) covers both dark and light variants across every screen.
- **Assembly Editor with Syntax Highlighting**: Color-coded token overlay (keywords → blue, registers → green, immediates → orange, labels → purple, comments → grey) rendered behind a transparent `TextInput` for zero-latency typing.
- **Snippets Menu**: One-tap insertion of 5 pre-built ARM programs (loop, factorial, array_sum, fibonacci, stack_call) directly into the editor.
- **Instruction Encoding Panel**: Bit-field breakdown of each instruction's 32-bit ARM encoding with HEX/BIN toggle and color-coded field segments (cond, op, I, opcode, S, Rn, Rd, imm/Rm).
- **Stats Panel**: Live CPI/IPC metrics, instruction mix bar chart (data movement / arithmetic / logical / branch / memory), and per-register/flag activity heat map.
- **Hazard Detection**: RAW (Read After Write) and control hazard detection runs before each pipeline advance — hazards surface as colored badge overlays on the pipeline canvas.
- **Register History Sparklines**: Each register cell shows a mini 8-bar sparkline of its last 8 values, updated on every step without triggering re-renders (via `useRef`).
- **Haptic Feedback**: Light vibration on step via `expo-haptics`.
- **Settings Panel**: Persistent user preferences (number format, playback speed, editor font size, haptics) stored in `AsyncStorage`.
- **First-Launch Onboarding**: 3-slide animated tutorial shown once on install, with option to re-trigger from Settings.
- **15 Guided Exercises**: 5 original + 10 new exercises (negate, power-of-2 check, modulo, max, absolute value, swap, count set bits, nibble pack, multiply-by-3 without MUL, GCD) with instant feedback and progress persistence.
- **Book Programs Tab**: 11 pre-built programs mapped to textbook chapters with chapter filter and full-text search.
- **Calling Convention Visualization**: Interactive diagram showing AAPCS register roles (arguments, return value, callee-saved, SP, LR, PC).

### 🤖 AI ARM Assistant *(Added April 2026)*
- **Streaming AI Chat**: Ask questions about ARM assembly, pipeline behavior, or your running program and get instant streamed responses.
- **Powered by Groq (Llama 3.1)**: Free-tier AI inference via a Vercel Edge Function — no billing required.
- **Context-Aware**: Answers are grounded in ARM32/64 architecture topics relevant to what the simulator is teaching.
- **Race-Condition-Free Streaming**: Streaming text written directly via `useRef` in `onChunk` to avoid stale-closure issues with `useEffect`.

### 🎨 Theme & UI
- **Dark / Light Mode Toggle** (web): Switch between dark and light themes with preference persisted in localStorage.
- **System-Adaptive Theme** (mobile): Follows the OS color scheme automatically — no toggle required.
- **Professional Web Redesign**: Inter (UI) + JetBrains Mono (code) fonts, full CSS custom-property token system, animated pipeline activity cards.
- **Modern Responsive Design**: Glassmorphism-inspired dark UI with smooth hover effects and micro-animations.
- **SEO & Discoverability**: Favicon, optimized `<title>` / `<meta description>` tags, and Google Search Console verification.

### 🗺️ Draggable Pipeline Canvas (web)
- **Drag-to-Reposition**: Each pipeline block on the SVG canvas is draggable — rearrange the diagram to suit your screen.
- **Bounds Clamping**: Blocks cannot be dragged outside the canvas viewport.
- **Double-Click Reset**: Double-click any block to snap the entire diagram back to its default layout.
- **Reset-All Button**: One-click button to restore the full canvas layout.

### ☁️ Cloud Features
- **User Authentication**: Sign in / Sign up via Firebase Authentication (email/password, Google, or GitHub OAuth).
- **Guest Mode**: Try the simulator instantly without creating an account via anonymous sign-in.
- **Cloud Persistence**: Save ARM programs to Firebase Firestore and load them across sessions.
- **Program Management**: Edit program titles, view last-modified timestamps, and delete saved programs.
- **Offline Mode**: The app gracefully degrades if Firebase is not configured, showing an offline warning banner.

### 🖊️ ARM Assembly Editor
- **In-Browser ARM Parser**: Write and execute ARM assembly with real-time error highlighting.
- **Supported Instructions**: `MOV`, `ADD`, `SUB`, `CMP`, `LDR`, `STR`, `B`, `BEQ`, `BNE`.
- **Immediate & Register Operands**: Supports `#immediate` values and register-to-register operations.

---

## 🛠️ Tech Stack

### Web App
| Layer | Technology |
|---|---|
| **Frontend** | [React.js](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite](https://vitejs.dev/) |
| **Graphics Engine** | [Fabric.js](http://fabricjs.com/) — dynamic pipeline canvas |
| **Database / Auth** | [Firebase Firestore](https://firebase.google.com/) + Firebase Auth |
| **AI Assistant** | [Groq](https://groq.com/) (Llama 3.1) via Vercel Edge Function — free-tier streaming inference |
| **Deployment** | [Vercel](https://vercel.com/) — automatic deploys from `main` |
| **Styling** | CSS custom properties — Inter + JetBrains Mono fonts, dark/light theming |

### Mobile App
| Layer | Technology |
|---|---|
| **Framework** | [Expo](https://expo.dev/) SDK 55 + [React Native](https://reactnative.dev/) 0.83.4 |
| **Navigation** | [Expo Router](https://expo.github.io/router/) (file-based, tab layout) |
| **Language** | TypeScript (strict) |
| **Persistence** | `AsyncStorage` — settings, exercise progress, onboarding state |
| **Haptics** | `expo-haptics` — light feedback on pipeline step |
| **Theming** | `useColorScheme()` + custom `appPalette` (dark/light token sets) |
| **Shared Core** | `@playarm/core` — ARM assembler, pipeline engine, types (monorepo package) |

---

## 📦 Project Structure

```text
ARM-Microarchitecture-Visualizer/       ← monorepo root
├── apps/
│   ├── web/                            ← React/Vite web simulator
│   │   └── src/
│   │       ├── components/             # Auth, ControlPanel, VisualizerCanvas, TLBVisualizer …
│   │       ├── core/                   # assembler.ts, pipeline.ts, memory.ts, types.ts
│   │       ├── firebase/               # Firebase config
│   │       ├── services/               # Firestore CRUD
│   │       ├── App.tsx
│   │       └── main.tsx
│   └── mobile/                         ← Expo / React Native app
│       └── src/
│           ├── app/
│           │   ├── _layout.tsx         # Tab layout + OnboardingModal on first launch
│           │   ├── index.tsx           # Pipeline tab (PipelineScreen)
│           │   └── explore.tsx         # Learn tab (book programs, exercises, reference)
│           ├── components/
│           │   ├── AssemblyEditor.tsx  # Editor with syntax highlighting & snippets menu
│           │   ├── VisualizerCanvas.tsx# Native pipeline canvas + hazard badges
│           │   ├── RegisterGrid.tsx    # Register cells with sparkline history
│           │   ├── MemoryList.tsx      # Memory viewer
│           │   ├── StackPanel.tsx      # Stack viewer
│           │   ├── TLBList.tsx         # TLB viewer
│           │   ├── PseudocodePanel.tsx # Pseudocode trace
│           │   ├── EncodingPanel.tsx   # Bit-field instruction encoding
│           │   ├── StatsPanel.tsx      # CPI/IPC and instruction mix stats
│           │   ├── SettingsModal.tsx   # Persistent app settings
│           │   ├── OnboardingModal.tsx # First-launch 3-slide tutorial
│           │   └── CallingConventionViz.tsx  # AAPCS register diagram
│           ├── constants/
│           │   └── theme.ts            # appPalette dark/light + AppPalette type
│           ├── context/
│           │   └── SimulatorContext.tsx
│           ├── hooks/
│           │   └── use-theme.ts        # useAppTheme() → system color scheme
│           └── screens/
│               └── PipelineScreen.tsx  # Main simulator screen (phone + tablet layouts)
└── packages/
    └── core/                           # @playarm/core — shared ARM engine (assembler, pipeline, types)
```

---

## ⚙️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SardarZiyatkhanov/ARM-Microarchitecture-Visualizer.git
   cd ARM-Microarchitecture-Visualizer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory using `.env.example` as a reference:
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_AI_FUNCTION_URL=...   # Vercel Edge Function URL for the AI ARM assistant
   ```
   > **Note**: Firebase variables are optional — omitting them runs the app in offline mode (pipeline simulation works fully, but cloud save/load is disabled). `VITE_AI_FUNCTION_URL` is required only for the AI assistant panel.

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   *Alternatively, use the provided script:*
   ```bash
   chmod +x start_server.sh
   ./start_server.sh
   ```

5. **Open your browser** at `http://localhost:5173`

---

## 📖 Usage Guide

### Running the Pipeline Simulation

1. **Write Assembly**: Enter ARM instructions in the code editor. Example:
   ```asm
   MOV R0, #10
   MOV R1, #0
   ADD R1, R1, #1
   CMP R1, R0
   BNE #8
   STR R1, [R2]
   ```
2. **Execute**: Press **Step** (or `→`) to advance one clock cycle, or **Play** (or `Space`) for automatic stepping. Use the **Slow / Normal / Fast** speed buttons to control playback interval.
3. **Observe the Pipeline**: Watch the Fabric.js canvas animate each instruction through the 5 stages.
4. **Check Control Signals**: The Decode stage signals panel updates on every cycle.

### Virtual Memory & TLB

- Run any program containing `LDR` or `STR` instructions.
- The **TLB & Virtual Memory** panel (below Pipeline Activity) automatically shows:
  - Whether the access was a **TLB Hit** ✅ or **TLB Miss** ❌
  - The virtual address and its translated physical address
  - The VPN, PFN, and 12-bit page offset breakdown
  - The full TLB entry table (16 entries) with valid/dirty bits
  - Hit rate statistics across all memory accesses
- On **Reset**, the TLB is fully flushed back to its empty state.

### Switching Themes

- Use the **Dark / Light** toggle buttons in the top control area.
- Your preference is saved automatically in the browser and restored on next visit.

### Saving & Loading Programs

- Click **Save** to store the current program to Firebase (requires login).
- Click **Load** to view and restore previously saved programs.
- Hover over a saved program to **Edit** or **Delete** it.

---

## 🧠 Architecture Notes

### TLB Simulation Design

| Parameter | Value |
|---|---|
| TLB Size | 16 entries |
| Page Size | 4 KB (4096 bytes) |
| Page Offset | 12 bits (`addr & 0xFFF`) |
| Virtual Page Number | `addr >> 12` |
| Replacement Policy | LRU (Least Recently Used) |
| Physical Frame Allocation | Sequential on first access |

On a **TLB Miss**, the simulator walks the page table, allocates a new physical frame if the virtual page has never been accessed, and installs the translation into the TLB (evicting the LRU entry if all 16 slots are full).

---

## 📅 Changelog

### March 2026

#### Authentication & User Management
- **Google & GitHub OAuth** — added one-click sign-in via Google and GitHub alongside existing email/password login
- **Guest / Anonymous mode** — users can try the simulator without creating an account; progress is session-only
- **Forgot Password** — sends a Firebase password-reset email from a dedicated view in the auth page
- **Show/Hide Password toggle** — eye icon inside the password field for usability
- **PlayARM branding** on the login card — gradient logo and subtitle instead of a plain title
- **User avatar dropdown** in the header — shows profile photo (or generated initial), display name, email, and a Sign Out button; rendered via React Portal so it always appears on top regardless of layout stacking context

#### Simulator Improvements
- **Stale closure bug fix** — auto-play interval now uses a ref pattern so register and memory state always reflect the latest values during playback
- **Playback speed control** — Slow (1400 ms) / Normal (800 ms) / Fast (250 ms) preset buttons in the header
- **Hex / Decimal display toggle** — registers and memory viewer can be switched between hex (default) and decimal display
- **Program completion detection** — simulation automatically stops and shows a green banner when all 5 pipeline stages go idle after at least one cycle
- **Keyboard shortcuts** — `Space` to play/pause, `→` (ArrowRight) to step; ignored when focus is inside a text input

#### Machine Code View
- **Binary/Hex machine code table** — each parsed instruction shows its 32-bit ARM encoding split into color-coded bit fields (Cond, Op, Regs, Imm/Offset)
- **Full 5-stage pipeline tracking** — all five stages (Fetch, Decode, Execute, Memory, WriteBack) are now highlighted in the machine code table with distinct color badges; previously only the first three stages were shown

#### Light Theme Fixes
- Pipeline canvas blocks, strokes, and connector lines darkened for clear visibility on light backgrounds
- Machine code table: replaced hardcoded dark background and invisible row dividers with theme-aware CSS variables
- Bit-field colors (Cond/Op/Regs/Imm) darkened to high-contrast variants in light mode
- Stage badge column given `min-width` and `white-space: nowrap` to prevent text clipping
- Pipeline activity cards: stronger background and border colors, darker stage name labels
- Flags: solid visible border when unset, bright indigo glow when set
- Registers: subdued grey label vs. bold indigo value for clear separation; single-column layout to prevent hex value overflow
- Panel borders bumped to higher opacity for better separation
- Memory viewer empty state styled with a dashed bordered box
- Debug overlay on canvas uses a white semi-transparent background in light mode
- Removed stray `console.log` calls from pipeline state debug block and save handler

#### Monorepo Migration
- Project restructured into a monorepo under `apps/web/` (web simulator) and `apps/mobile/` (React Native app, initialized)
- Core simulation logic (`assembler`, `pipeline`, `types`) extracted to `@playarm/core` shared package

---

### April 2026

#### AI ARM Assistant
- **Vercel Edge Function** — serverless `/api/ai` endpoint streams AI responses with zero cold-start overhead
- **Groq (Llama 3.1) backend** — switched from Anthropic → Gemini → Groq for a fully free-tier AI integration; no billing required
- **Streaming chat UI** — streamed tokens written via `streamingTextRef` in `onChunk` callback, bypassing `useEffect` to eliminate race conditions with stale state closures

#### Web App Improvements
- **ARM syntax highlighting** in the web editor — same token-overlay technique as mobile: keywords (blue), registers (green), immediates (orange), labels (purple), comments (grey)
- **Draggable SVG pipeline canvas** — blocks can be repositioned by dragging; bounds clamping prevents off-screen placement; double-click resets a single block; reset-all button restores the default layout
- **Professional redesign** — Inter (UI font) + JetBrains Mono (code font) from Google Fonts; full CSS custom-property token system replaces ad-hoc color literals; animated pipeline activity cards with smooth transitions
- **Favicon + SEO** — custom favicon, optimized page `<title>` and `<meta name="description">`, Google Search Console site verification
- **Privacy Policy page** at `/privacy` — required for Google Play Store submission
- **Android package name** updated to `com.playarm.simulator` for Play Store compliance

#### Mobile App — Full Feature Integration
- **Instruction Encoding Panel** (`EncodingPanel`) — HEX/BIN toggle, color-coded 32-bit bit-field breakdown (cond, op, I, opcode, S, Rn, Rd, imm/Rm), executing-line highlight
- **Stats Panel** (`StatsPanel`) — live CPI/IPC, instruction mix bar chart, register and flag activity heat map
- **Settings Modal** (`SettingsModal`) — number format, playback speed, editor font size, haptic feedback toggle; persisted via `AsyncStorage`
- **Onboarding Modal** (`OnboardingModal`) — 3-slide first-launch tutorial with skip/next/done flow; shown once and dismissable; re-triggerable from Settings
- **Syntax highlighting** in `AssemblyEditor` — absolute-positioned token overlay behind the `TextInput`: keywords (blue), registers (green), immediates (orange), labels (purple), comments (grey)
- **Snippets menu** — `+` button in editor header opens a 5-item overlay: loop, factorial, array_sum, fibonacci, stack_call
- **Haptic feedback** — `expo-haptics` light impact on every pipeline step
- **RAW & control hazard detection** — inspects Decode/Execute instructions before each `advancePipeline` call; surfaces hazards as colored badge overlays on the pipeline canvas
- **Register history sparklines** — `useRef`-based history buffer (last 8 values per register) rendered as 8-bar mini charts below each register cell; reset on simulator reset
- **10 new exercises** — negate (two's complement), power-of-2 check, modulo (repeated subtraction), max of two, absolute value, register swap, count set bits, nibble packing, multiply-by-3 without MUL, GCD (Euclidean)
- **System-adaptive light/dark theme** — `useColorScheme()` drives a 50+ token `appPalette` (dark & light variants) applied via `makeStyles(c: AppPalette)` + `useMemo` across every component; `AppPalette` type broadened to `dark | light` union for correct TypeScript inference
- **TypeScript** — `npx tsc --noEmit` passes with 0 errors after all changes

#### Bug Fixes & Stability
- **Pipeline decoder guards** — all `.replace()` and `parseImm()` calls in the core pipeline now guard against `undefined` operands; prevents crashes when typing partial or incomplete instructions
- **Firebase auth timeout** — added 5-second timeout on auth state resolution so Firebase never blocks the app UI on cold start
- **Nickname overlay** — fixed edge case trapping users in the nickname prompt; `localStorage` fallback prevents false re-prompts on reload

---

## 👥 Project Team

**Team Leader**
- **Sardar Ziyatkhanov** (Electrical and Electronics Engineering, ADA University)

**Team Members**
- Jamila Pashayeva
- Said Ahadov
- Yusif Ashrafov

---

## 📄 License

This project is part of a Senior Design Project at ADA University. All rights reserved.

---

**Author**: Sardar Ziyatkhanov  
**Institution**: ADA University, School of IT and Engineering