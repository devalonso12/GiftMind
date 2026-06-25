# GiftMind — Blockchain Overview

## What I Built
The on-chain layer that makes gifting work on Solana Devnet — escrow deposits, NFT minting, and token transfers, all without the user needing technical knowledge.

## Key Contracts & Flows

### Escrow System
- Dedicated escrow keypair holds funds on behalf of gifts.
- Sender transfers SOL → escrow when creating a gift.
- Recipient claims SOL/NFT from escrow via claim link.

### SOL Gifts
- Client-side: `SystemProgram.transfer` from sender → escrow.
- Claim: Server builds & signs transfer from escrow → recipient using `@noble/curves/ed25519` (no web3.js dependency on server).
- 3 retry attempts on blockhash expiry.

### NFT Gifts
- Server mints using raw transaction building (no `@solana/web3.js` on server):
  1. `CreateAccount` + `InitializeMint2`
  2. `CreateAssociatedTokenAccount`
  3. `MintTo` (1 token, 0 decimals)
- ATA derivation via SHA-256 PDA computation.
- Minted to escrow wallet, transferred to recipient on claim.

### RPC Layer
- 4 fallback RPC endpoints (primary + public devnet nodes).
- Round-robin retry.
- Auto-airdrop if escrow balance is low.

## Tech
Solana Devnet | @solana/web3.js (client) | @noble/curves (server) | bs58
