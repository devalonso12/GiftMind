// Server-side social search proxy: attempts real API calls when keys present, otherwise falls back to mock results

export type SocialResult = {
  handle: string;
  platform: string;
  displayName: string;
  match: number;
  tags: string[];
  avatar: string;
  bio: string;
  verifiedWallet?: string;
};

function simulateProfiles(q: string, platform: string): SocialResult[] {
  const p = platform || 'unknown';
  const base = q.replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'user';
  return [
    { handle: `${base}`, platform: p, displayName: `${base}`, match: 90, tags: ['Web3', 'Builder'], avatar: '', bio: '', verifiedWallet: undefined },
    { handle: `${base}_dev`, platform: p, displayName: `${base} Dev`, match: 82, tags: ['Dev', 'Open Source'], avatar: '', bio: '', verifiedWallet: undefined }
  ];
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const platform = (url.searchParams.get('platform') || 'github').toLowerCase();

    if (!q) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (platform === 'github') {
      try {
        const token = process.env.GITHUB_TOKEN || process.env.GITHUB_API_TOKEN;
        const gh = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(q)}+in:login&per_page=6`, {
          headers: token ? { Authorization: `token ${token}`, 'User-Agent': 'GiftMind' } : { 'User-Agent': 'GiftMind' }
        });
        if (gh.ok) {
          const json = await gh.json();
          const items = Array.isArray(json.items) ? json.items : [];
          const results: SocialResult[] = items.slice(0, 6).map((it: any, idx: number) => ({
            handle: it.login,
            platform: 'github',
            displayName: it.login,
            match: Math.max(60, 100 - idx * 5),
            tags: ['Open Source'],
            avatar: it.avatar_url || '',
            bio: it.type || '',
            verifiedWallet: undefined
          }));
          return new Response(JSON.stringify(results), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      } catch (e) {
        // fallthrough
      }
      return new Response(JSON.stringify(simulateProfiles(q, 'github')), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (platform === 'twitter' || platform === 'x') {
      try {
        const token = process.env.TWITTER_BEARER_TOKEN || process.env.X_BEARER_TOKEN;
        if (token) {
          const username = q.replace(/^@/, '').split(/\s+/)[0];
          const tw = await fetch(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=profile_image_url,description`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (tw.ok) {
            const json = await tw.json();
            const u = json.data;
            if (u) {
              const res: SocialResult = {
                handle: u.username,
                platform: 'twitter',
                displayName: u.name || u.username,
                match: 92,
                tags: ['Web3', 'Crypto'],
                avatar: u.profile_image_url || '',
                bio: u.description || '',
                verifiedWallet: undefined
              };
              return new Response(JSON.stringify([res]), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
          }
        }
      } catch (e) {
        // fallthrough
      }
      return new Response(JSON.stringify(simulateProfiles(q, 'twitter')), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(simulateProfiles(q, platform)), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
