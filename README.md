# PlayARM: ARM Microarchitecture Visualizer

![Status](https://img.shields.io/badge/Status-In--Progress-orange)
![Tech Stack](https://img.shields.io/badge/Tech--Stack-React%20%7C%20TypeScript%20%7C%20Fabric.js%20%7C%20Firebase-blue)
![Last Updated](https://img.shields.io/badge/Last%20Updated-March%202026-green)

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

### 🎨 Theme & UI
- **Dark / Light Mode Toggle**: Switch between dark and light themes with preference persisted in localStorage. The Fabric.js canvas redraws dynamically on theme change.
- **Modern Responsive Design**: Glassmorphism-inspired dark UI with smooth hover effects and micro-animations.

### ☁️ Cloud Features
- **User Authentication**: Sign in / Sign up via Firebase Authentication.
- **Cloud Persistence**: Save ARM programs to Firebase Firestore and load them across sessions.
- **Program Management**: Edit program titles, view last-modified timestamps, and delete saved programs.
- **Offline Mode**: The app gracefully degrades if Firebase is not configured, showing an offline warning banner.

### 🖊️ ARM Assembly Editor
- **In-Browser ARM Parser**: Write and execute ARM assembly with real-time error highlighting.
- **Supported Instructions**: `MOV`, `ADD`, `SUB`, `CMP`, `LDR`, `STR`, `B`, `BEQ`, `BNE`.
- **Immediate & Register Operands**: Supports `#immediate` values and register-to-register operations.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | [React.js](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite](https://vitejs.dev/) |
| **Graphics Engine** | [Fabric.js](http://fabricjs.com/) — dynamic pipeline canvas |
| **Database / Auth** | [Firebase Firestore](https://firebase.google.com/) + Firebase Auth |
| **Styling** | Vanilla CSS — dark/light theming, responsive layout |

---

## 📦 Project Structure

```text
ARM-Microarchitecture-Visualizer/
├── src/
│   ├── components/
│   │   ├── Auth.tsx                # Login / Sign-up UI
│   │   ├── ControlPanel.tsx        # Play / Step / Reset controls
│   │   ├── InstructionInput.tsx    # ARM assembly editor with error display
│   │   ├── PipelineVisualizer.tsx  # Main simulation orchestrator
│   │   ├── ThemeToggle.tsx         # Dark / Light mode toggle (NEW)
│   │   ├── TLBVisualizer.tsx       # TLB & Virtual Memory panel (NEW)
│   │   └── VisualizerCanvas.tsx    # Fabric.js pipeline canvas
│   ├── core/
│   │   ├── assembler.ts            # ARM assembly parser
│   │   ├── memory.ts               # TLB & virtual memory simulation (NEW)
│   │   ├── pipeline.ts             # 5-stage pipeline simulation engine
│   │   └── types.ts                # Shared TypeScript types & constants
│   ├── firebase/                   # Firebase configuration
│   ├── services/
│   │   └── firestoreService.ts     # Firestore CRUD operations
│   ├── App.tsx                     # Root component with auth guard
│   ├── index.css                   # Global styles & design system
│   └── main.tsx                    # React bootstrap
├── index.html
├── tsconfig.json
└── vite.config.ts
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
   ```
   > **Note**: If you skip this step the app runs in offline mode — pipeline simulation works fully, but cloud save/load is disabled.

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
2. **Execute**: Press **Step** to advance one clock cycle, or **Play** for automatic stepping at 800 ms intervals.
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