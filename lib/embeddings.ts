export async function getEmbedding(text: string, model = 'text-embedding-3-small'): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured');

  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, input: text })
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Embedding error: ${t}`);
  }

  const data = await resp.json();
  const vec = data?.data?.[0]?.embedding;
  if (!vec) throw new Error('No embedding returned');
  return vec;
}
