import { RecipientProfile, GiftRecommendation, Relationship, RankedRecommendation } from './types';

export async function generateGiftRecommendation(
  profile: RecipientProfile,
  relationship: Relationship,
  customRelationship?: string
): Promise<GiftRecommendation> {
  if (typeof window !== 'undefined') {
    const resp = await fetch('/api/ai/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, relationship, customRelationship }),
    });
    const text = await resp.text();
    let json: any;
    try { json = JSON.parse(text); } catch {
      throw new Error(`AI recommendation failed: ${text.slice(0, 200)}`);
    }
    if (!resp.ok) throw new Error(json.error || 'AI recommendation failed');
    return json as GiftRecommendation;
  }

  throw new Error('AI recommendation is only available in the browser.');
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


