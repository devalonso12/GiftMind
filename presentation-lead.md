# GiftMind — Full Project Overview

## The Product
AI-powered personalized gifting on Solana. A user picks a recipient, our AI reads their on-chain activity + social signals to recommend the perfect gift (SOL or NFT), then delivers it via a shareable claim link.

## Architecture

### Frontend (Next.js 13 App Router)
- **8-step wizard**: Connect Wallet → Relationship → Search → Profile → AI Recommend → Approve → Send → Complete
- **State**: React Context (`GiftFlowProvider`) carries wallet, profile, recommendation, and flow state across all steps
- **UI**: Dark space/solar theme, shadcn/ui, Tailwind CSS, animated canvas background

### Blockchain (Solana Devnet)
- **Escrow Pattern**: Sender deposits SOL to a shared escrow wallet. Recipient claims from escrow. No direct P2P transfer needed.
- **SOL Gifts**: `SystemProgram.transfer` via client wallet. Server-side fallback for headless send.
- **NFT Gifts**: Server mints with raw transactions (CreateAccount → InitMint2 → CreateATA → MintTo). Claim triggers NFT transfer from escrow.
- **RPC**: 4-node round-robin with fallback. Auto-airdrop for low-balance escrow.

### Backend / API (Next.js API Routes)
| Route | What it does |
|-------|-------------|
| `POST /api/ai/recommend` | OpenAI GPT-4o-mini — personalized gift recs (Zara Test enforced) |
| `POST /api/gifts/create` | Insert gift record to Supabase |
| `POST /api/gifts/update` | Update gift status / claim |
| `POST /api/nft/mint` | Mint NFT via raw tx building |
| `POST /api/nft/transfer` | Transfer NFT from escrow to claimant |
| `POST /api/sol/transfer` | Transfer SOL from escrow to claimant |
| `POST /api/auth/link-wallet` | Link wallet to user profile |
| `GET /api/search/social` | Search GitHub/Twitter or mock social profiles |
| `POST /api/notifications/send` | Queue notification (placeholder) |
| `GET /api/nft-metadata/[id]` | NFT metadata JSON endpoint |

### Database (Supabase PostgreSQL)
5 tables: `gifts`, `wallet_insights`, `recipient_vectors`, `profiles`, `notifications`

### Key Dependencies
- **Solana**: `@solana/web3.js`, `@noble/curves/ed25519`, `bs58`
- **AI**: `openai` (GPT-4o-mini)
- **DB**: `@supabase/supabase-js`, `@supabase/ssr`
- **UI**: Tailwind, shadcn/ui, Recharts, Lucide

## Demo Flow
1. Connect Phantom wallet → sign message
2. Pick relationship (father/boyfriend/sibling)
3. Enter recipient wallet or social handle
4. AI builds profile from on-chain + social data
5. GPT generates 3 gift options (changes based on relationship)
6. User adjusts amount/message, approves
7. Wallet confirms SOL transfer to escrow → gift record created
8. Copy claim link, share with recipient
9. Recipient opens link, connects wallet, claims → SOL/NFT arrives

## What Got Fixed
- **Demo Wallet support**: Send step now falls back to server-side SOL transfer when no browser wallet detected
- **NFT mint params**: Was sending wrong body fields to `/api/nft/mint` — now passes `recipientAddress` correctly
- **Server ESM**: Replaced `require('crypto')` with proper ES imports in mint route
- **DB schema**: Added `mint_address` column migration for NFT gift tracking
- **Error handling**: All API routes return structured `{error}` JSON. Client shows actionable suggestions (faucet link, wallet install)

## Tech Stack
Next.js 13 | React 18 | TypeScript | Tailwind | Supabase | Solana Devnet | OpenAI | Vercel
