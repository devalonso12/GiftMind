# GiftMind — Frontend Overview

## What I Built
A full gifting wizard that walks users through 8 steps — connect wallet, pick relationship, search recipient, see their profile, get AI gift recs, approve, send, share claim link.

## Key Pieces
- **8-step flow** managed by React Context (`GiftFlowProvider`). Each step is its own component. Progress indicator at the top.
- **Wallet connection** detects Phantom, Solflare, Backpack, Glow, Torus — plus a Demo Wallet for testing without real funds.
- **AI recs** call OpenAI GPT-4o-mini. Shows 3 ranked options — user picks one, edits the amount/message, then approves.
- **Claim page** — recipient opens a shareable link, connects their wallet, and claims the gift on-chain.
- **UI** — dark space theme with solar accents. shadcn/ui components. Tailwind. Animated backgrounds.

## Hard Parts
- Wallet provider detection is different on every browser — had to handle `window.solana`, `window.solflare`, etc.
- The "Zara Test" — same recipient profile must produce different AI recs depending on sender relationship (father gets SOL, boyfriend gets NFT, sibling gets NFT keepsake).
- Error states — network timeouts, rejected txs, insufficient balance — all need clear messages and retry actions.

## Tech
Next.js 13 App Router | React 18 | TypeScript | Tailwind | shadcn/ui | Lucide icons
