<div align="center">

## Command Showcase Portal

Interactive portfolio panel featuring a sandboxed terminal puzzle (mini CTF), an encryption step visualizer, and modular UI components built with modern React tooling.

</div>

---

### Features

- Sandboxed pseudo-shell with:
	- Privilege escalation flow (password challenge)
	- Hidden file discovery and cipher riddle
	- Flag submission, timing, persistent best-time tracking
- Encryption Visualizer (AES-256 & RSA-OAEP step simulation with timing)
- 3D/visual components (e.g. Lanyard / panels) using React + Tailwind
- Accessible, theme-friendly shadcn-ui component layer
- TypeScript throughout for maintainability

### Tech Stack

| Layer | Choice |
|-------|--------|
| Build Tool | Vite 5 |
| Language | TypeScript (ESM) |
| UI | React 18, shadcn-ui (Radix primitives) |
| Styling | Tailwind CSS + custom utility tokens |
| State / Forms | React hooks, react-hook-form (where applicable) |
| Data / Misc | date-fns, framer-motion, recharts, three.js (select 3D), zod |

### Prerequisites

- Node.js 18+ (recommend installing via nvm)
- npm (bundled with Node) or an alternative client (pnpm / bun) — repository scripts assume npm

### Quick Start

```powershell
git clone <REPO_URL>
cd whoami
npm install
npm run dev
```


### Core Scripts

```text
npm run dev        # Start development server
npm run build      # Production build (dist/)
npm run preview    # Preview built output locally
npm run lint       # Run ESLint across the project
```

### Project Structure (Excerpt)

```
src/
	components/         Reusable UI + feature panels
	pages/              Route-level views
	hooks/              Custom React hooks
	lib/                Utilities (formatters, helpers)
	assets/             Static/media assets
public/               Static files served as-is
```

### CTF Mini Puzzle Overview

1. Explore with basic commands (`help`, `ls`, `cat`).  
2. Escalate privileges (`sudo su`) and supply the correct password.  
3. Reveal the hidden file with `ls -a` once root.  
4. Read the hidden riddle, derive the cipher, then submit the final flag.  
5. Completion time is recorded; the best time persists in local storage.

### Encryption Visualizer

Simulates major steps of AES-256 and RSA-OAEP with progressive highlighting, approximate durations, and a derived pseudo-cipher for demonstration purposes. It does not perform real cryptographic encryption and should not be used for security decisions.

### Deployment

The site is a static Vite build that is deployed in vercel

### Security & Privacy

- No runtime secrets embedded; all interactions are client-side simulations.
- LocalStorage usage is limited to storing the best completion time for the puzzle.

### Future Enhancements (Ideas)

- Optional audio mute / volume control on celebration
- Additional puzzle stages (multi-step escalation or log analysis)
- Exportable run transcript (copy as markdown)
- Progressive encryption step explanations with inline diagrams

---

For questions or improvements, open an issue or submit a pull request.
