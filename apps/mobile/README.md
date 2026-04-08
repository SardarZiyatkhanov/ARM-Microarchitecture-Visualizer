# PlayARM Mobile

ARM pipeline simulator for iOS and Android — the native companion to the PlayARM web app.

Built with **Expo SDK 55** and **React Native 0.83.4**, using file-based routing via Expo Router.

---

## Getting started

```bash
# from the monorepo root
npm install

# start the dev server
cd apps/mobile
npx expo start
```

Then open in:
- **iOS Simulator** — press `i`
- **Android Emulator** — press `a`
- **Expo Go** — scan the QR code

---

## Features

### Pipeline Simulator (index tab)
- 5-stage pipeline canvas: Fetch → Decode → Execute → Memory → WriteBack
- Step / Play / Pause / Reset controls with adjustable speed (Slow / Normal / Fast)
- Breakpoints — tap any line number to pause when that instruction hits Execute
- RAW and control hazard detection with overlay badges on the canvas
- Haptic feedback on each step (`expo-haptics`)

### Assembly Editor
- Syntax-highlighted overlay behind the `TextInput`:
  - Keywords → blue, Registers → green, Immediates → orange, Labels → purple, Comments → grey
- Snippets menu (`+`) with 5 pre-built programs: loop, factorial, array_sum, fibonacci, stack_call

### Panels (bottom tab bar)
| Tab | Contents |
|---|---|
| Registers | R0–R15, SP, LR, PC with sparkline history (last 8 values) |
| Memory | Word-addressed memory viewer |
| Stack | Stack contents with SP pointer |
| TLB | Translation Lookaside Buffer entries + hit/miss log |
| Pseudocode | Human-readable pseudocode trace |
| Trace | Cycle-by-cycle execution log |
| Encode | 32-bit instruction encoding with bit-field breakdown (HEX/BIN) |
| Stats | CPI/IPC, instruction mix chart, register/flag activity |

### Learn tab
- **Book Programs** — 11 programs mapped to textbook chapters (filter by chapter, full-text search)
- **Exercises** — 15 guided exercises with instant feedback and persistent progress:
  - Sum two numbers, count to 5, isolate nibble, multiply by shift, stack round-trip *(ch 3–7)*
  - Negate, power-of-2 check, modulo, max, absolute value, swap, count set bits, nibble pack, multiply-by-3, GCD *(new)*
- **Reference** — collapsible instruction reference with calling convention diagram

### Settings & Onboarding
- **Settings modal** — number format (hex/dec/bin), playback speed, editor font size, haptic toggle; persisted via `AsyncStorage`
- **Onboarding** — 3-slide tutorial shown once on first launch; re-triggerable from Settings

---

## Theme

The app follows the device's color scheme automatically (`useColorScheme()`). No manual toggle is needed.

A 50+ token `appPalette` (dark and light variants) is passed through `makeStyles(c: AppPalette)` + `useMemo` in every component — styles recompute only when the color scheme changes.

---

## Project structure

```text
apps/mobile/
├── src/
│   ├── app/
│   │   ├── _layout.tsx         # Tab layout, onboarding on first launch
│   │   ├── index.tsx           # Pipeline tab
│   │   └── explore.tsx         # Learn tab
│   ├── components/
│   │   ├── AssemblyEditor.tsx
│   │   ├── VisualizerCanvas.tsx
│   │   ├── RegisterGrid.tsx
│   │   ├── MemoryList.tsx
│   │   ├── StackPanel.tsx
│   │   ├── TLBList.tsx
│   │   ├── PseudocodePanel.tsx
│   │   ├── EncodingPanel.tsx
│   │   ├── StatsPanel.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── OnboardingModal.tsx
│   │   └── CallingConventionViz.tsx
│   ├── constants/
│   │   └── theme.ts            # appPalette + AppPalette type
│   ├── context/
│   │   └── SimulatorContext.tsx
│   ├── hooks/
│   │   └── use-theme.ts        # useAppTheme()
│   └── screens/
│       └── PipelineScreen.tsx  # Main screen (phone + tablet layouts)
└── app.json
```

---

## Build

```bash
# type-check
npx tsc --noEmit

# production bundle (Android)
npx expo export --platform android

# production bundle (iOS)
npx expo export --platform ios
```

---

## Shared core

The ARM assembler, pipeline engine, and shared types live in `packages/core` (`@playarm/core`) and are shared between the web and mobile apps.
