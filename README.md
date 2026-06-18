# GiftMind - AI-Powered Web3 Gifting on Solana

An AI-powered Web3 gifting platform that analyzes recipient social media and on-chain wallet data to provide personalized gift recommendations on Solana Devnet.

## Demo

**IMPORTANT: This MVP uses mock social media data for demonstration.** Real social media API integration would require OAuth and developer accounts. Wallet data is retrieved from actual Solana Devnet.

## Features

- **Wallet Connection** - Demo mode or custom Devnet wallet
- **Recipient Discovery** - Search by wallet address or social handle (Twitter, Farcaster, Lens, Instagram, GitHub)
- **Social Media Analysis** - Mock data simulating interest extraction
- **Wallet Intelligence** - Real Solana Devnet data via RPC
- **AI Recommendations** - Personalized gift suggestions based on profile + relationship
- **On-Chain Delivery** - Solana Devnet transactions
- **Claim Page** - Shareable gift claim links

## AI Disclosure

This app uses AI for:
- Social media interest extraction (mock data)
- Recipient profile building
- Gift recommendation generation
- Personalized message creation

## Data Sources

### Social Media (MOCK DATA)
All social profiles in this demo are synthetic. Try these demo handles:
- `cryptoalice` on Twitter - NFT/DeFi enthusiast
- `debgamerz` on Twitter - Gaming/Web3
- `artlover` on Farcaster - Digital art
- `techfounder` on Twitter - Tech/startups

### Wallet Data (REAL DATA)
Pulled from Solana Devnet via public RPC:
- SOL balance
- Token holdings
- Transaction history
- Activity patterns

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key  # Optional for demo
```

### Run

```bash
npm run dev
```

Open http://localhost:3000

### Get Devnet SOL

Visit https://faucet.solana.com to get test SOL.

## Demo Script

1. **Connect Wallet** - Click "Connect Demo Wallet" or enter your Devnet address
2. **Find Recipient** - Search `cryptoalice` on Twitter or use wallet `7xKXtg8Ea3xYJHq8hXq6`
3. **View Profile** - See AI-analyzed interests and wallet insights
4. **Get Recommendation** - Select relationship, view personalized gift
5. **Review & Approve** - Adjust amount, add message
6. **Send** - Transaction processes on Devnet
7. **Share** - Copy claim link for recipient

## Tech Stack

- Next.js 13, React 18, TypeScript
- Tailwind CSS, shadcn/ui
- Solana Web3.js
- Supabase (PostgreSQL + RLS)
- OpenAI GPT-4 API

## Project Structure

```
app/
  page.tsx               # Main gift flow
  claim/[code]/page.tsx  # Gift claim page
components/
  gift-flow-app.tsx      # Main orchestrator
  header.tsx
  progress-indicator.tsx
  steps/
    wallet-connect-step.tsx
    search-step.tsx
    profile-step.tsx
    recommend-step.tsx
    approve-step.tsx
    send-step.tsx
    complete-step.tsx
lib/
  types.ts               # TypeScript interfaces
  store.tsx              # React context state
  solana-config.ts       # Solana configuration
  supabase-client.ts     # Database operations
  wallet-intelligence.ts # Wallet analysis
  social-discovery.ts    # Social discovery (mock)
  ai-recommendation.ts   # AI recommendations
  transaction.ts         # Solana transactions
```

## Database

Tables:
- `gifts` - Gift records with sender, recipient, AI explanation
- `recipient_profiles` - Analyzed profiles

Both tables have RLS enabled with public access for demo.

## Security Notes

- All wallet data is public blockchain info
- No private keys accessed
- Social data is mocked for demo
- Devnet only - no real funds

## Limitations

1. Social data is mock/simulated
2. Wallet connection simplified (demo mode)
3. Devnet only
4. SOL gifts only in MVP

## License

MIT License

---

Built for Solana Demo Day
