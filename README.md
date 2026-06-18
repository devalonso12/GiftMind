# GiftMind — AI-Powered Personalized Gifting on Solana

GiftMind is an AI gifting agent that reads a recipient's social graph and on-chain activity to recommend and deliver personalized on-chain gifts on Solana Devnet. Built for VBH3 Summer Solstice (BOHBOOverse Ecosystem).

## Theme Connection

GiftMind draws inspiration from the Summer Solstice — the longest day of the year, a celebration of light, warmth, and growth. Just as the solstice marks a peak of solar energy and renewal, GiftMind helps users channel their generosity into meaningful, lasting gifts that grow with the recipient. The platform's visual design (solar gradients, amber/gold palette, orbital animations) reflects the sun's central role in the solstice. Every gift is a small sun — a deposit of warmth, attention, and belief in someone's future on-chain.

## Features

- **Recipient Profile Builder** — Combines on-chain wallet activity (Solana Devnet RPC) with a social graph dataset (simulated Instagram-style interests) into a programmatic recipient profile
- **AI Gift Recommendation** — Uses GPT-4o-mini (or deterministic fallback) to produce ranked, personalized gift recommendations that factor in sender relationship context
- **Sender Approval & On-Chain Delivery** — Sender reviews, selects, and approves the gift; agent executes on-chain (SOL transfer or NFT mint/transfer)
- **Recipient Claim & Reveal** — Shareable claim link, recipient connects wallet, claims the gift, sees the personal message and AI explanation
- **Zara Test Compliant** — Same recipient profile with different sender relationships (father, boyfriend, sibling) produces meaningfully different recommendations

## Submission Requirements

### Live Devnet Link
[Live Devnet Link](https://maingiftmind.vercel.app)

### Demo Video
2–3 minute video showing: profile build → AI recommendation → sender approval → on-chain delivery → recipient claim.

## AI Model Used

- **Recommendation engine**: OpenAI GPT-4o-mini (via API) with deterministic fallback using relationship-mapped gift logic
- **Fallback**: Rule-based system that maps father→SOL savings, boyfriend→1-of-1 NFT, sibling→NFT keepsake

## Dataset Documentation

GiftMind combines two data sources to build recipient profiles:

### Source 1: On-Chain Wallet Activity (Real)
- **Source**: Solana Devnet public RPC (`api.devnet.solana.com` with fallback chain)
- **Data**: SOL balance, SPL token holdings (mint, amount, symbol), transaction count, wallet age
- **Method**: Fetched via `@solana/web3.js` `getBalance()` and `getTokenAccountsByOwner()` at profile build time

### Source 2: Social Graph / Interest Dataset (Simulated)
- **Source**: Mock dataset — hardcoded profiles with synthetic interests, engagement patterns, and content affinities
- **Data**: Topics (e.g. fashion, indie music, DeFi), confidence scores, social handles per platform
- **Combination method**: Both sources are merged into a single `RecipientProfile` object. The AI recommendation engine reasons over both the wallet signals (NFT holdings, transaction patterns) and social interests to produce personalized gift suggestions. When real social API integration is added, this mock layer will be replaced with live data.

## AI Tool Disclosure

The following AI tools were used in building GiftMind:

- **bolt.new** — Initial project scaffolding and component generation
- **GitHub Copilot** — Code suggestions and autocomplete during development
- **Codex** — Assisted with Solana transaction logic and API route design
- **opencode** — Agent-assisted development for refactoring, debugging, and build fixes

The AI recommendation engine is powered by **OpenAI GPT-4o-mini** (when API key is configured) with a deterministic fallback.

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
npm install
cp .env.local.example .env.local  # or create manually
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SECRET_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SOLANA_ESCROW_PUBLIC_KEY=your_escrow_public_key
SOLANA_ESCROW_SECRET_KEY='[1,2,3,...]'
OPENAI_API_KEY=your_openai_key  # Optional
```

Create and fund an escrow wallet:
```bash
npm run create-escrow 1
```

### Run

```bash
npm run dev
```

Open http://localhost:3000

### Get Devnet SOL

Visit https://faucet.solana.com

## Demo Flow

1. **Connect Wallet** — Phantom/Solflare or Demo Wallet
2. **Select Relationship** — Father, Boyfriend, or Sibling
3. **Find Recipient** — Enter wallet address or social handle
4. **View Profile** — AI-combined on-chain + social insights
5. **Get Recommendation** — Ranked personalized gift options
6. **Review & Approve** — Confirm gift, add message
7. **Send** — On-chain transaction on Devnet
8. **Share** — Copy claim link for recipient

## Tech Stack

- Next.js 13, React 18, TypeScript
- Tailwind CSS, shadcn/ui
- Solana Web3.js + @solana/spl-token
- Supabase (PostgreSQL)
- OpenAI GPT-4o-mini

## License

MIT License — see [LICENSE](LICENSE)

## Team

- **Prince Alonso** — Team Lead, AI/Backend
- **vihkiewrites** — Front-end Development
- **Jason** — Blockchain Engineer

---

Built for VBH3 Summer Solstice · BOHBOOverse Ecosystem · Solana Devnet
