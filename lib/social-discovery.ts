import { SocialInterest, MockSocialProfile } from './types';

export const MOCK_SOCIAL_PROFILES: MockSocialProfile[] = [
  {
    handle: 'cryptoalice',
    platform: 'twitter',
    bio: 'NFT collector | DeFi enthusiast | Building on Solana | Art lover',
    interests: ['NFTs', 'DeFi', 'Art', 'Solana', 'Crypto'],
    hashtags: ['#Solana', '#NFT', '#DeFi', '#Web3'],
    followers: 15420,
    verifiedWallet: '7xKXtg8Ea3xYJHq8hXq6qZ2vQhJGqZ2vQhJGqZ2v',
    web3Identity: 'alice.sol'
  },
  {
    handle: 'debgamerz',
    platform: 'twitter',
    bio: 'Gaming streamer | Web3 gamer | Solana degen',
    interests: ['Gaming', 'Web3', 'Streaming', 'Community'],
    hashtags: ['#Gaming', '#Web3Gaming', '#SolanaGaming'],
    followers: 89340,
    verifiedWallet: '9WzDXwBbmkt8XqU3qJmBXfLvQMnPqJMowJJK5yYc8mXW'
  },
  {
    handle: 'artlover',
    platform: 'farcaster',
    bio: 'Digital artist | Collecting moments | Building community through art',
    interests: ['Art', 'NFTs', 'Community', 'DAOs'],
    hashtags: ['#DigitalArt', '#NFTCommunity', '#DAO'],
    followers: 23400,
    web3Identity: 'artlover.eth'
  },
  {
    handle: 'techfounder',
    platform: 'twitter',
    bio: 'Startup founder | Building the future of finance | Angel investor',
    interests: ['Tech', 'Finance', 'Startups', 'DeFi'],
    hashtags: ['#Tech', '#Startup', '#DeFi', '#Fintech'],
    followers: 156200,
    verifiedWallet: '4FdSDSVvGTLWfZrNpBhmRsQJqPwLgJgJgJgJgJgJgJgJ'
  },
  {
    handle: 'music Producer',
    platform: 'instagram',
    bio: 'Electronic music producer | Web3 music | NFT audio art',
    interests: ['Music', 'NFTs', 'Audio', 'Web3'],
    hashtags: ['#MusicNFT', '#Web3Music', '#Electronic'],
    followers: 45600,
    web3Identity: 'beats.sol'
  },
  {
    handle: 'snapcreater',
    platform: 'snapchat',
    bio: 'AR creator | Snapchat influencer | Web3 explorer',
    interests: ['AR', 'Social', 'Creators', 'Web3'],
    hashtags: ['#Snapchat', '#AR', '#Creator'],
    followers: 67200,
    verifiedWallet: '8xKXtg8Ea3xYJHq8hXq6qZ2vQhJGqZ2vQhJGqZ2v'
  },
  {
    handle: 'tiktokstar',
    platform: 'tiktok',
    bio: 'TikTok viral creator | NFT artist | Web3 content',
    interests: ['Content', 'Viral', 'NFTs', 'Music'],
    hashtags: ['#TikTok', '#Viral', '#NFT'],
    followers: 234500,
    web3Identity: 'tiktokstar.sol'
  }
];

export interface SocialDiscoveryResult {
  found: boolean;
  profile?: MockSocialProfile;
  interests: SocialInterest[];
  web3Links: string[];
  message: string;
}

export async function discoverBySocialHandle(
  handle: string,
  platform: string
): Promise<SocialDiscoveryResult> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const profile = MOCK_SOCIAL_PROFILES.find(
    p => p.handle.toLowerCase() === handle.toLowerCase() &&
         p.platform.toLowerCase() === platform.toLowerCase()
  );

  if (!profile) {
    return generateSyntheticProfile(handle, platform);
  }

  const interests = extractInterests(profile);
  const web3Links = extractWeb3Links(profile);

  return {
    found: true,
    profile,
    interests,
    web3Links,
    message: `Found profile on ${platform}`
  };
}

export async function discoverByWallet(walletAddress: string): Promise<SocialDiscoveryResult> {
  await new Promise(resolve => setTimeout(resolve, 200));

  const profile = MOCK_SOCIAL_PROFILES.find(
    p => p.verifiedWallet === walletAddress
  );

  if (profile) {
    const interests = extractInterests(profile);
    return {
      found: true,
      profile,
      interests,
      web3Links: [walletAddress],
      message: 'Found linked social profile'
    };
  }

  return generateWalletBasedInterests(walletAddress);
}

function extractInterests(profile: MockSocialProfile): SocialInterest[] {
  const interests: SocialInterest[] = [];

  for (const interest of profile.interests) {
    interests.push({
      topic: interest,
      confidence: 0.8 + Math.random() * 0.15,
      sources: ['bio', 'hashtags']
    });
  }

  return interests;
}

function extractWeb3Links(profile: MockSocialProfile): string[] {
  const links: string[] = [];
  if (profile.verifiedWallet) links.push(profile.verifiedWallet);
  if (profile.web3Identity) links.push(profile.web3Identity);
  return links;
}

function generateSyntheticProfile(handle: string, platform: string): SocialDiscoveryResult {
  const syntheticInterests: SocialInterest[] = [
    { topic: 'Crypto', confidence: 0.6, sources: ['inferred'] },
    { topic: 'Web3', confidence: 0.5, sources: ['inferred'] }
  ];

  if (Math.random() > 0.5) syntheticInterests.push({ topic: 'NFTs', confidence: 0.5, sources: ['inferred'] });
  if (Math.random() > 0.6) syntheticInterests.push({ topic: 'DeFi', confidence: 0.4, sources: ['inferred'] });

  const profile: MockSocialProfile = {
    handle,
    platform,
    bio: `Demo profile for ${handle}`,
    interests: syntheticInterests.map(i => i.topic),
    hashtags: ['#demo'],
    followers: Math.floor(Math.random() * 10000)
  };

  return {
    found: false,
    profile,
    interests: syntheticInterests,
    web3Links: [],
    message: 'Profile not found. Generated demo profile.'
  };
}

function generateWalletBasedInterests(wallet: string): SocialDiscoveryResult {
  const randomInterests = ['NFTs', 'DeFi', 'Gaming', 'Art', 'Trading'];
  const selected = randomInterests.sort(() => 0.5 - Math.random()).slice(0, 2);

  const interests: SocialInterest[] = selected.map(topic => ({
    topic,
    confidence: 0.3 + Math.random() * 0.4,
    sources: ['wallet_inferred']
  }));

  return {
    found: false,
    interests,
    web3Links: [wallet],
    message: 'No linked social profiles.'
  };
}
