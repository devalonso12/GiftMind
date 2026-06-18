import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-runner-secret') || '';
    const expected = process.env.RUNNER_HOOK_SECRET || process.env.SUPABASE_SECRET_KEY || '';
    if (!expected || secret !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'finalize_payouts.js');
    const child = spawn(process.execPath, [scriptPath], { env: process.env });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    const code = await new Promise((resolve) => child.on('close', resolve));

    return new Response(JSON.stringify({ code, stdout, stderr }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
}
