# PlayARM: ARM Microarchitecture Visualizer

![Status](https://img.shields.io/badge/Status-In--Progress-orange)
![Tech Stack](https://img.shields.io/badge/Tech--Stack-React%20%7C%20TypeScript%20%7C%20Fabric.js%20%7C%20Firebase-blue)

**PlayARM** is an interactive educational platform designed to visualize the execution of ARM assembly instructions at the microarchitecture level. It provides a deep dive into the internal workings of a processor, bridging the gap between high-level code and low-level hardware execution.

Developed as a **Senior Design Project (SDP)** at **ADA University**, this tool helps students and enthusiasts understand the complexities of instruction pipelining, CPU state management, and control signals.

---

## 🚀 Key Features

- **Interactive 5-Stage Pipeline Visualization**: See instructions flow through Fetch, Decode, Execute, Memory, and Write-Back stages in real-time.
- **Real-Time CPU State Tracking**: Monitor Register files (R0-R12, SP, LR, PC), Memory addresses, and CPU Flags (N, Z, C, V).
- **ARM Assembly Parser**: Write and execute ARM assembly directly in the browser with immediate feedback and error highlighting.
- **Dynamic Control Signals**: Visualize the active control signals generated during the Decode stage for each instruction.
- **Cloud Persistence**: Save your ARM programs to the cloud and load them later using Firebase integration.
- **Step-by-Step Execution**: Control the simulation with Play, Pause, Step, and Reset functionality to observe every clock cycle.

---

## 🛠️ Tech Stack

- **Frontend**: [React.js](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Graphics Engine**: [Fabric.js](http://fabricjs.com/) for dynamic canvas visualization
- **Database/Backend**: [Firebase Firestore](https://firebase.google.com/) for cloud storage
- **Styling**: Vanilla CSS (Modern, Responsive Design)

---

## 📦 Project Structure

```text
ARM-Microarchitecture-Visualizer/
├── src/
│   ├── components/         # React components (Canvas, Input, UI)
│   ├── core/               # Simulation logic (Pipeline, Assembler, Types)
│   ├── firebase/           # Firebase configuration
│   ├── services/           # Data services (Firestore integration)
│   ├── App.tsx             # Main application entry point
│   ├── index.css           # Global styles and design system
│   └── main.tsx            # React bootstrap
├── public/                 # Static assets
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration
```

---

## ⚙️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone httpss://github.com/SardarZiyatkhanov/ARM-Microarchitecture-Visualizer.git
   cd ARM-Microarchitecture-Visualizer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory and add your Firebase configurations:
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   *Alternatively, you can use the provided script:*
   ```bash
   chmod +x start_server.sh
   ./start_server.sh
   ```

5. **Open your browser**:
   Navigate to `httpss://localhost:5173` to see the visualizer in action.

---

## 📖 Usage Guide

1. **Write Assembly**: Enter ARM assembly instructions in the input panel. The tool supports standard MOV, ADD, SUB, CMP, BNE, STR, and LDR instructions.
2. **Execute**: Use the **Step** button to advance a single clock cycle, or press **Play** for continuous execution.
3. **Analyze**: Watch the **Visualizer Canvas** to see instructions move through the pipeline stages. Check the **Control Signals** and **Pipeline Activity** panels for detailed execution status.
4. **Manage Programs**: Use the **Save** and **Load** buttons to persist your programs to the cloud.

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
**Institution**: ADA University, School of IT and Engineering.