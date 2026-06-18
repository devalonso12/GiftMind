import { RecipientProfile, GiftRecommendation, Relationship, RankedRecommendation } from './types';

export async function generateGiftRecommendation(
  profile: RecipientProfile,
  relationship: Relationship,
  customRelationship?: string
): Promise<GiftRecommendation> {
  const relationshipText = relationship;

  if (typeof window !== 'undefined') {
    try {
      const resp = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, relationship, customRelationship }),
      });
      if (resp.ok) {
        const json = await resp.json();
        return json as GiftRecommendation;
      }
    } catch {
      // fall through
    }
  }

  return generateFallbackRecommendation(profile, relationshipText);
}

export async function generateRankedRecommendations(
  profile: RecipientProfile,
  relationship: Relationship,
  customRelationship?: string
): Promise<RankedRecommendation[]> {
  const primary = await generateGiftRecommendation(profile, relationship, customRelationship);
  const alternatives = generateAlternativeRecommendations(profile, relationship, customRelationship, primary);

  return [primary, ...alternatives].map((rec, i) => ({
    ...rec,
    rank: i + 1,
    label: i === 0 ? 'Best Match' : i === 1 ? 'Alternative' : 'Another Option',
  }));
}

function generateAlternativeRecommendations(
  profile: RecipientProfile,
  relationship: string,
  _customRelationship: string | undefined,
  primary: GiftRecommendation
): GiftRecommendation[] {
  const alts: GiftRecommendation[] = [];

  // Always add the opposite gift type as alternative
  if (primary.giftType === 'SOL') {
    alts.push({
      giftType: 'NFT',
      amount: 1,
      reason: `As an alternative, a unique NFT would capture their personality through their interest in ${(profile.socialInterests || []).slice(0, 2).map((i: any) => i.topic).join(' and ')}.`,
      socialSignals: `Creative side shown through ${(profile.socialInterests || [])[0]?.topic || 'content'} engagement`,
      walletSignals: `Wallet activity suggests comfort with digital collectibles`,
      personalizedMessage: `Wanted to give you something as unique as you are. Hope this brings a smile!`,
      confidence: 0.72,
    });
  } else {
    alts.push({
      giftType: 'SOL',
      amount: 0.15,
      reason: `A SOL gift provides long-term value and flexibility — they can hold it, use it, or explore DeFi with it.`,
      socialSignals: `Web3-native interests suggest appreciation for digital value`,
      walletSignals: `Active wallet indicates they'll put it to good use`,
      personalizedMessage: `A little something for your wallet. Use it, trade it, or just hold it — it's yours.`,
      confidence: 0.75,
    });
  }

  // Smaller amount alternative
  alts.push({
    ...primary,
    amount: primary.giftType === 'NFT' ? 1 : Math.max((primary.amount || 0.1) * 0.5, 0.05),
    reason: `A more modest version of the same thoughtful gift, perfect for a casual celebration.`,
    personalizedMessage: `Just a small token of appreciation — thinking of you!`,
    confidence: 0.65,
  });

  return alts;
}

export async function regenerateRecommendation(
  profile: RecipientProfile,
  relationship: Relationship,
  _previous: GiftRecommendation
): Promise<GiftRecommendation> {
  const variants = ['vintage', 'modern', 'abstract', 'minimalist'];
  const style = variants[Math.floor(Math.random() * variants.length)];
  const profileWithVariant = {
    ...profile,
    personalitySummary: (profile as any).personalitySummary
      ? `${(profile as any).personalitySummary} (${style} aesthetic)`
      : `${style} aesthetic preference`,
  };
  return generateGiftRecommendation(profileWithVariant, relationship);
}

function generateFallbackRecommendation(profile: RecipientProfile, relationship: string): GiftRecommendation {
  const amounts: Record<string, number> = { father: 0.5, boyfriend: 0.3, sibling: 0.2 };
  let baseAmount = amounts[relationship] || 0.2;
  const hasDefiInterest = profile.socialInterests.some((i: any) =>
    i.topic.toLowerCase().includes('defi') || i.topic.toLowerCase().includes('crypto')
  );
  if (hasDefiInterest) baseAmount *= 1.2;
  const amount = Math.min(Math.max(Math.round(baseAmount * 100) / 100, 0.05), 1.0);

  const interestList = profile.socialInterests.slice(0, 3).map((i: any) => i.topic).join(', ');
  const insightList = profile.walletInsights.slice(0, 2).map((i: any) => i.label).join(' and ');
  const hasNftSignal = profile.walletInsights.some((i: any) =>
    i.label.toLowerCase().includes('nft') || i.label.toLowerCase().includes('collector')
  );

  const hobbies = interestList || "all the cool stuff you're into";
  const signals = insightList || 'building on-chain';

  if (relationship === 'father') {
    return {
      giftType: 'SOL',
      amount,
      reason: `A dad wants to set his daughter up for the future. She's into ${hobbies}, and this SOL gives her a foundation to explore, learn from, and grow. It's not just crypto — it's a head start.`,
      socialSignals: `She follows ${(profile.socialInterests || []).slice(0, 2).map((i: any) => i.topic).join(' and ')} — building her own path`,
      walletSignals: `${signals}`,
      personalizedMessage: `Hey kiddo — this one's for you. I know it's a little different from the usual gifts, but I wanted to give you something that grows with you. Hold onto it, learn what you can, and build something awesome. Love you.`,
      confidence: 0.85,
    };
  }

  if (relationship === 'boyfriend' || relationship === 'sibling') {
    const msg = relationship === 'boyfriend'
      ? `I saw this and thought of you immediately. The vibe, the style — it's so you. Hope it makes you smile as much as you make me smile.`
      : `Yo — saw this and literally thought "this is them." Don't ask me why, it just fits. Anyway, hope you like it. Miss you!`;

    return {
      giftType: 'NFT',
      amount: 1,
      reason: relationship === 'boyfriend'
        ? `A boyfriend knows her taste better than anyone. She's into ${hobbies}${hasNftSignal ? ' and already collects NFTs' : ''} — a 1-of-1 piece that matches her vibe is the kind of gift that says "I get you."`
        : `Siblings just know. She's into ${hobbies}${hasNftSignal ? ' and has an eye for digital art' : ''} — a fun NFT keepsake that matches her energy is way more personal than sending SOL.`,
      socialSignals: `She's into ${(profile.socialInterests || []).slice(0, 2).map((i: any) => i.topic).join(' and ')} — creative, curious, her own person`,
      walletSignals: `${signals}`,
      personalizedMessage: msg,
      confidence: 0.82,
    };
  }

  return {
    giftType: 'SOL',
    amount,
    reason: `Based on interest in ${hobbies} and ${signals}, this SOL gift is designed to support their Web3 journey.`,
    socialSignals: `Interest in ${hobbies}`,
    walletSignals: `${signals}`,
    personalizedMessage: `A little something for your wallet. Use it, trade it, or just hold it — it's yours.`,
    confidence: 0.75,
  };
}
