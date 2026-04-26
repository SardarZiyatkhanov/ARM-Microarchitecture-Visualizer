# PlayARM — Capstone Showcase Video Scripts
# Total runtime: ≈20 minutes

---

## VIDEO STRUCTURE AT A GLANCE

| Section | Topic | Speaker | Time |
|---|---|---|---|
| 1 | Project Overview & Block Diagram | Sardar | ≈1.5 min |
| 2a | Technical Challenges — Architecture | Sardar | ≈45 sec |
| 2b | Technical Challenges — Assembler | Said | ≈1 min |
| 2c | Technical Challenges — Virtual Memory | Jamila | ≈1 min |
| 2d | Technical Challenges — Mobile | Yusif | ≈1 min |
| 3a | Development — Pipeline & Web App | Sardar | ≈1 min |
| 3b | Development — Assembler & Hazards | Said | ≈2 min |
| 3c | Development — TLB & Auth | Jamila | ≈2 min |
| 3d | Development — Mobile & Exercises | Yusif | ≈2 min |
| 4a | Demo — Web Simulator & Pipeline | Sardar | ≈45 sec |
| 4b | Demo — Live Assembly & Hazards | Said | ≈1 min |
| 4c | Demo — Virtual Memory & TLB | Jamila | ≈1 min |
| 4d | Demo — Mobile App Experience | Yusif | ≈1 min |
| 5a | Contribution — Assembler Engine | Said | ≈1 min |
| 5b | Contribution — Memory Subsystem | Jamila | ≈1 min |
| 5c | Contribution — Mobile Subsystem | Yusif | ≈1 min |
| 5d | Conclusion & Architecture Core | Sardar | ≈45 sec |

---

# ═══════════════════════════════════════════
# SARDAR ZIYATKHANOV — Team Leader
# Total on-screen time: ≈5 minutes
# ═══════════════════════════════════════════

---

## SECTION 1 — Project Overview & Block Diagram [≈1.5 min]

"Good day. My name is Sardar Ziyatkhanov, and I am the team leader for
PlayARM — an interactive ARM Microarchitecture Visualizer, developed as
our Capstone Senior Design Project at ADA University.

Our objective was to build a full-stack educational platform that simulates
the execution of ARM32 assembly instructions at the microarchitecture level.
It shows how instructions travel through a five-stage pipeline — Fetch, Decode,
Execute, Memory, and Write-Back — and how each stage affects the processor's state.

[Draw Block Diagram on Surface Pro]

To understand PlayARM, let's look at the system architecture. The entire system
is split into three layers.

First, the User Interface layer: we have a React web application and an Expo React
Native mobile app. Both of these share the exact same simulation core, which brings
us to the second layer — our @playarm/core monorepo package.

This shared core has three main components: the assembler, the pipeline engine,
and the memory subsystem. We also have a hazard detector that sits alongside
the pipeline. Finally, the third layer is the backend, which is stateless:
Firebase handles persistence, and a Vercel Edge function connects to a Groq
AI backend for our interactive ARM assistant."

---

## SECTION 2a — Technical Challenges: Shared Architecture [≈45 sec]

"The fundamental challenge I faced was designing that shared simulation core
to run identically on both the React web application and the Expo mobile app.
We addressed this by extracting all simulation logic into the @playarm/core package.

A second challenge was real-time state propagation during auto-play mode.
JavaScript closures inside a setInterval callback capture stale state snapshots,
which I solved using a React useRef pattern to ensure every clock cycle sees
the processor's latest state without memory leaks."

---

## SECTION 3a — Development: Pipeline Simulation + Web App [≈1 min]

"I developed the pipeline simulation engine and the web visualization layer.
The pipeline models an in-order ARM32 processor, generating control signals
and updating the register file and CPU flags on each cycle.

For the web visualization, I used Fabric.js to render an interactive pipeline
canvas where each of the five stage blocks is draggable. When an instruction
advances, the corresponding block animates to reflect the active stage.

I also integrated the streaming AI ARM assistant, utilizing a useRef approach
for the streaming text to eliminate stale closure race conditions."

---

## SECTION 4a — Demo: Web Simulator & Pipeline [≈45 sec]

"Let me show the pipeline in action.
[DEMO — Open web simulator at playarm.app/app]

Here is the simulator running a factorial program. I press Step once — the MOV
instruction enters the Fetch stage. By the fifth cycle, the pipeline is fully
loaded — four different instructions occupy four different stages simultaneously.

This is pipelining: the processor is doing four things at once. The control
signals panel updates in real time, showing exactly how the Decode stage
directs the rest of the processor."

---

## SECTION 5d — Conclusion & Architecture Core [≈45 sec]

"To summarize my contributions, I was responsible for the overall system
architecture, the monorepo structure, the core ARM pipeline engine, the
Fabric.js web canvas, and the AI assistant integration.

PlayARM makes processor behavior tangible. Instead of reading that an
instruction takes five cycles, a student watches it take five cycles.
Looking forward, we plan to integrate PlayARM directly with the computer
architecture curriculum at ADA University. Thank you."

---

# ═══════════════════════════════════════════
# SAID AHADOV
# Total on-screen time: ≈5 minutes
# ═══════════════════════════════════════════

---

## SECTION 2b — Technical Challenges: Assembler Robustness [≈1 min]

"The most technically demanding challenge I worked on was building an ARM
assembler robust against partial and malformed input. In a live code editor,
students type instructions character by character. At any moment, the
instruction may be syntactically incomplete — an opcode with no operands,
or a register field with only the letter R.

Every parsing function had to guard against undefined operands and recover
gracefully. A runtime exception during typing would break the entire simulator.
Getting this right while still producing correct 32-bit machine code encodings
for valid instructions was the core engineering challenge of the assembler."

---

## SECTION 3b — Development: ARM Assembler + Hazard Detection [≈2 min]

"I built the single-pass TypeScript ARM assembler that converts text into the
32-bit machine code our pipeline engine executes, as well as the hazard
detection module.

The assembler tokenizes each line, identifies the opcode, and dispatches to
an opcode-specific handler. For instructions like MOV and ADD, it packs the
condition field, opcode, source and destination registers, and the operand
into a 32-bit integer. For memory and branch instructions, it calculates
offsets and base registers accurately.

A technically precise piece of this work was the immediate operand encoding.
ARM's I-bit selects between a rotated immediate and a register operand. The
assembler's encoding had to agree exactly with the pipeline Execute stage's
interpretation of the ALUSrc control signal, ensuring no silent errors.

For hazard detection, I implemented a Read-After-Write (RAW) detector and a
control hazard detector. Before each pipeline advance, the detector compares
the Decode and Execute stages. If Decode reads a register that Execute hasn't
written yet, a RAW hazard is flagged. Control hazards are raised for branch
instructions."

---

## SECTION 4b — Demo: Live Assembly & Hazards [≈1 min]

"Let me demonstrate the assembler and hazard detector.
[DEMO — Show live editing in the assembly editor]

As I type `ADD R1, R2, #5`, the assembler instantly updates the machine code
in the background without crashing during incomplete states.

[DEMO — Show hazard badge on pipeline canvas]

Here we have a Read-After-Write hazard. The `ADD` instruction in the Decode
stage needs to read `R1`, but the previous `MOV` instruction in the Execute
stage has not yet written its result to `R1`. The pipeline flags this immediately
with a red badge overlay on the UI, clearly showing students why processors
need forwarding or stall cycles."

---

## SECTION 5a — Contribution: Assembler Engine [≈1 min]

"My main technical responsibility was the ARM assembler and the hazard detection
engine. I designed the robust 32-bit instruction encoding parser that survives
live-editing environments, and I implemented the RAW and control hazard detectors.

The key challenge I solved was guaranteeing perfect alignment between the
assembler's binary output and the pipeline's control signal interpretations,
particularly regarding the I-bit and immediate values. This ensures that what
a student types is exactly what the processor simulates."

---

# ═══════════════════════════════════════════
# JAMILA PASHAYEVA
# Total on-screen time: ≈5 minutes
# ═══════════════════════════════════════════

---

## SECTION 2c — Technical Challenges: Virtual Memory [≈1 min]

"One significant challenge I addressed was virtual memory simulation. The
difficulty was not only implementing accurate address translation but making it
visually meaningful.

In a real processor, the Translation Lookaside Buffer (TLB) is completely hidden.
Our challenge was to expose this invisible mechanism — showing each translation
step, hit and miss decisions, and the LRU eviction policy — in a way clear enough
to teach from, without oversimplifying the actual hardware behavior. Striking
that balance required careful design of both the underlying simulation algorithm
and the user interface."

---

## SECTION 3c — Development: TLB + Virtual Memory + Authentication [≈2 min]

"I developed the virtual memory subsystem, which includes the TLB simulator,
the page table, and the visualization component, as well as our authentication.

Our TLB is modeled as a 16-entry fully-associative cache with an LRU eviction
policy, closely matching real ARM hardware. Each entry stores a valid bit, a
dirty bit, the virtual page number, and the physical frame number. We use standard
4-kilobyte pages.

When a Load or Store executes, the controller extracts the virtual page number.
It checks all 16 entries simultaneously. A valid match results in a TLB hit.
If no entry matches, it's a miss: the page table is consulted, a physical frame
is allocated, and the translation is loaded. If the TLB is full, the Least
Recently Used entry is evicted.

I built the TLBVisualizer component to display this live, color-coding hits
and misses and updating hit rate statistics in real time.
I also integrated Firebase Authentication, supporting email, Google, GitHub,
and anonymous access, allowing users to save and load their assembly programs."

---

## SECTION 4c — Demo: Virtual Memory & TLB [≈1 min]

"Let me show you the virtual memory subsystem in action.
[DEMO — Run LDR instruction, switch to TLB panel]

Here, the pipeline executes an `LDR` instruction. The virtual address is passed
to the TLB. Since the TLB is empty, it registers as a miss. The page table is
walked, a physical frame is mapped, and you can see the new translation installed
in the first TLB slot.

[DEMO — Run second LDR instruction to same page]

Now we run another `LDR` to a different address on the same page. This time,
the visualizer flashes green for a TLB hit, and our hit rate counter immediately
updates. You can see the LRU state reorder dynamically as different pages are
accessed."

---

## SECTION 5b — Contribution: Memory Subsystem [≈1 min]

"My technical responsibility was the virtual memory simulation and user
authentication. I designed the LRU eviction algorithm, the virtual-to-physical
address translation logic, and the interactive TLB visualizer. I also built the
Firebase auth and cloud save infrastructure.

The key technical challenge I solved was maintaining strict LRU priority order
across 16 associative entries that update on every memory access, while keeping
the React visualizer in perfect synchronization with the simulation core so the
UI always reflects the exact hardware state."

---

# ═══════════════════════════════════════════
# YUSIF ASHRAFOV
# Total on-screen time: ≈5 minutes
# ═══════════════════════════════════════════

---

## SECTION 2d — Technical Challenges: Mobile UI [≈1 min]

"The challenge I focused on was delivering the full ARM simulator experience on
a mobile device. A pipeline visualization and register grid that look great on a
laptop require a complete paradigm shift for a 6-inch touch display.

Every panel — the register grid, the pipeline canvas, the TLB table — had to be
individually redesigned for limited screen space and touch interactions. The added
complexity was that the mobile app used the exact same @playarm/core simulation
logic as the web app. I had to build a completely adaptive rendering layer in
React Native without modifying the underlying shared engine."

---

## SECTION 3d — Development: Mobile Features + Exercise System [≈2 min]

"I developed the mobile application's feature panels and the learning exercise
system.

I built the instruction encoding panel, displaying the complete 32-bit binary
breakdown of the executing instruction. Every field — condition codes, opcodes,
register numbers, and immediates — is color-coded. This makes it incredibly
concrete for students that an assembly instruction is literally just a 32-bit
number.

I also built the statistics panel, calculating Cycles Per Instruction (CPI) in
real time, and generating instruction mix bar charts and register heat maps.
For the register history, I implemented sparkline charts using React useRef to
avoid triggering 16 separate React re-renders on every clock cycle, which kept
the mobile UI highly performant.

Another major feature I built was the mobile assembly code editor. Typing code on
a phone is frustrating, so I implemented a custom floating keyboard accessory
toolbar providing quick-access snippets for ARM opcodes and registers, while
managing scroll state so the active line is never hidden behind the keyboard.

Finally, I built a system of 15 guided ARM programming challenges with
AsyncStorage progress tracking and automatic state validation."

---

## SECTION 4d — Demo: Mobile App Experience [≈1 min]

"Let's look at the native mobile experience.
[DEMO — Show mobile screen running the app]

Here is the exact same simulation engine running natively on an Android device.
Notice the custom keyboard toolbar at the bottom — I can quickly tap 'MOV', 'R0',
and '#' to write assembly without searching through the mobile keyboard.

[DEMO — Switch to exercise and sparkline views]

As the program runs, you can see the register sparklines updating seamlessly
without any UI lag. And here in the exercise tab, I can open the 'Fibonacci'
challenge. Once my code finishes executing, the app automatically validates my
register state against the expected result and marks the exercise as complete."

---

## SECTION 5c — Contribution: Mobile Subsystem [≈1 min]

"My primary contribution was the React Native mobile application's UI architecture
and the learning exercise system. I designed the binary instruction encoding panel,
the real-time CPI statistics, the register sparklines, the mobile-optimized code
editor, and the 15 interactive challenges.

The key technical hurdle I overcame was rendering complex, high-frequency data
like 16 simultaneous sparkline charts on mobile hardware without performance
degradation, relying heavily on `useRef` optimizations. I also solved major UX
obstacles to make coding assembly genuinely comfortable on a smartphone display."
