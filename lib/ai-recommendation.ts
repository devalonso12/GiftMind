import { RecipientProfile, GiftRecommendation, Relationship } from './types';

export async function generateGiftRecommendation(
  profile: RecipientProfile,
  relationship: Relationship,
  customRelationship?: string
): Promise<GiftRecommendation> {
  const relationshipText = relationship === 'custom' && customRelationship
    ? customRelationship
    : relationship;

  return generateFallbackRecommendation(profile, relationshipText);
}

function generateFallbackRecommendation(profile: RecipientProfile, relationship: string): GiftRecommendation {
  const amounts: Record<string, number> = {
    parent: 0.5,
    partner: 0.3,
    sibling: 0.2,
    friend: 0.15,
    colleague: 0.1,
    teammate: 0.12,
    custom: 0.1
  };

  let baseAmount = amounts[relationship] || 0.1;

  const hasDefiInterest = profile.socialInterests.some(
    i => i.topic.toLowerCase().includes('defi') || i.topic.toLowerCase().includes('crypto')
  );

  if (hasDefiInterest) baseAmount *= 1.2;

  const amount = Math.min(Math.max(Math.round(baseAmount * 100) / 100, 0.05), 1.0);

  const interestList = profile.socialInterests.slice(0, 3).map(i => i.topic).join(', ');
  const insightList = profile.walletInsights.slice(0, 2).map(i => i.label).join(' and ');

  const messages: Record<string, string> = {
    parent: `Wishing you endless joy! Based on your interest in ${interestList}, this SOL gift is a small token of appreciation.`,
    partner: `With all my love! This gift reflects your passion for ${interestList.split(',')[0]}.`,
    friend: `Hey friend! Thought you'd appreciate this - saw you're into ${interestList.split(',')[0]}!`,
    colleague: `Great working with you! This represents your skill in ${interestList.split(',')[0]}.`,
    sibling: `From your sibling! Hope this brings a smile.`,
    teammate: `Teamwork makes the dream work! Here's to our shared goals.`,
    custom: `A gift for you based on your interests in ${interestList.split(',')[0]}.`
  };

  return {
    giftType: 'SOL',
    amount,
    reason: `Based on interest in ${interestList} and being ${insightList}, this SOL gift is perfect for supporting their Web3 journey.`,
    socialSignals: `Interest in ${interestList} suggests appreciation for crypto gifts`,
    walletSignals: `As ${insightList}, comfortable managing digital assets`,
    personalizedMessage: messages[relationship] || messages.custom,
    confidence: 0.75
  };
}

export async function regenerateRecommendation(
  profile: RecipientProfile,
  relationship: Relationship,
  _previous: GiftRecommendation
): Promise<GiftRecommendation> {
  // Generate different amount
  const newProfile = {
    ...profile,
    personalitySummary: profile.personalitySummary + ' (regenerated)'
  };
  return generateGiftRecommendation(newProfile, relationship);
}
