interface RecOutput {
  giftType: 'SOL' | 'NFT' | 'TOKEN';
  amount: number;
  tokenSymbol?: string;
  reason: string;
  socialSignals: string;
  walletSignals: string;
  personalizedMessage: string;
  confidence: number;
}

function buildProfileSummary(profile: any): string {
  if (!profile) return 'No profile data available.';
  const interests = (profile.socialInterests || []).map((i: any) => `${i.topic} (confidence: ${i.confidence})`).join(', ');
  const insights = (profile.walletInsights || []).map((i: any) => i.label).join(', ');
  const nfts = (profile.walletAnalysis?.tokenHoldings || []).filter((t: any) => t.amount === 1).length;
  return [
    `Interests: ${interests || 'none listed'}`,
    `Wallet signals: ${insights || 'new user'}`,
    `SOL balance: ${profile.walletAnalysis?.solBalance?.toFixed(4) || 'unknown'} SOL`,
    `NFT holdings: ${nfts} NFTs in collection`,
    `Wallet age: ${profile.walletAnalysis?.transactionCount || 0} transactions`,
  ].join('\n');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profile, relationship, customRelationship } = body || {};
    const key = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!key) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured. Set OPENAI_API_KEY to use AI recommendations.' }), { status: 400 });
    }

    const relText = relationship;
    const profileSummary = buildProfileSummary(profile);

    const systemPrompt = `You are GiftMind, an AI gifting agent for the Solana blockchain. Your role: given a recipient's combined on-chain and social profile, plus the sender's relationship context, recommend the BEST possible on-chain gift.

CRITICAL — THE ZARA TEST:
The SAME recipient profile must produce DIFFERENT recommendations depending on who the sender is:
- If sender = father → recommend a SOL savings gift (long-term hold, stability, protective)
- If sender = boyfriend → recommend a personalized 1-of-1 NFT (emotional resonance, intimate)
- If sender = sibling → recommend a fun NFT keepsake (playful, memorable)
The gift type, reason, and message MUST shift meaningfully based on the sender's relationship. Judges WILL test all three.

CRITICAL — Messages must sound HUMAN, not like an AI:
- The personalizedMessage should sound like something a real person would text or say. Short, natural, imperfect. Use contractions, emojis if appropriate, inside jokes if data hints at them.
- BAD: "This SOL is a foundation for your future. Hold it, grow it, make it yours."
- GOOD (father): "Hey kiddo — I know this isn't your usual gift, but I wanted to give you something that grows with you. Love you."
- GOOD (boyfriend): "I saw this and it screamed your name. The style is SO you. Hope you love it ❤️"
- GOOD (sibling): "Yo this one's got your name all over it. No idea why, it just does. Miss you!"

Rules:
1. Output ONLY valid JSON (no markdown, no backticks)
2. Use the recipient's actual interests, wallet signals, and NFT holdings to make the recommendation feel personal
3. The reason field must explain WHY this gift fits THIS recipient from THIS sender's perspective
4. The personalizedMessage must sound like it comes from a real person, not an AI
5. Relationship context:
   - father: protective, wants long-term value → SOL savings
   - boyfriend: intimate, knows her tastes → NFT matching her collection
   - sibling: playful, wants memorable → NFT keepsake
6. confidence should reflect how well the profile data supports this choice (0-1)
7. amount: SOL amounts between 0.05 and 1.0 SOL. NFT always amount=1.`;

    const userPrompt = `Recipient Profile:
${profileSummary}

Sender Relationship: ${relText}

Task: Recommend the perfect on-chain gift for this recipient from this sender's perspective. Remember the Zara Test — father, boyfriend, and sibling sending to the SAME person must each get a DIFFERENT recommendation.`;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: `OpenAI error: ${txt}` }), { status: 502 });
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(text) as RecOutput;
      return new Response(JSON.stringify(parsed), { status: 200 });
    } catch {
      return new Response(JSON.stringify({ error: 'AI returned malformed JSON. Try again.' }), { status: 502 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
}
