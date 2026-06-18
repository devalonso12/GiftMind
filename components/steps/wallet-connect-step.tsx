'use client';

import React, { useState, useEffect } from 'react';
import { useGiftFlow } from '../../lib/store';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, AlertCircle, ExternalLink, Shield, CheckCircle, Wallet, ChevronRight, X, ChevronDown, QrCode } from 'lucide-react';
import { checkBalance, requestAirdrop } from '../../lib/transaction';
import { analyzeWallet } from '../../lib/wallet-intelligence';
import { saveWalletInsights, linkWalletToProfile } from '../../lib/supabase-client';
import { fetchWalletTokens } from '../../lib/wallet-tokens';
import { useToast } from '../../hooks/use-toast';

interface DetectedWallet {
  name: string;
  icon: string;
  detected: boolean;
  providerKey: string;
}

const WALLET_PROVIDERS: DetectedWallet[] = [
  { name: 'Phantom', icon: 'phantom', detected: false, providerKey: 'phantom' },
  { name: 'Solflare', icon: 'solflare', detected: false, providerKey: 'solflare' },
  { name: 'Backpack', icon: 'backpack', detected: false, providerKey: 'backpack' },
  { name: 'Glow', icon: 'glow', detected: false, providerKey: 'glow' },
  { name: 'Torus', icon: 'torus', detected: false, providerKey: 'torus' },
  { name: 'WalletConnect', icon: 'walletconnect', detected: true, providerKey: 'walletconnect' },
];

type ApprovalStep = 'select' | 'review' | 'sign' | 'connected';

function WalletLogo({ name }: { name: string }) {
  const path = `/logos/wallets/${name}.svg`;
  return <img src={path} alt={name} className="w-7 h-7 rounded-lg object-contain" />;
}

export function WalletConnectStep() {
  const { setStep, setSenderWallet, setError, error, setLoading, isLoading } = useGiftFlow();
  const [wallets, setWallets] = useState<DetectedWallet[]>(WALLET_PROVIDERS);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [approvalStep, setApprovalStep] = useState<ApprovalStep>('select');
  const [showWalletList, setShowWalletList] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoAddress, setDemoAddress] = useState('');
  const [wcUri, setWcUri] = useState('');
  const { toast } = useToast();

  // Detect installed wallets
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    const detected = WALLET_PROVIDERS.map(provider => {
      let isDetected = false;
      if (typeof window !== 'undefined' && w.solana) {
        const solana = w.solana as Record<string, unknown>;
        if (provider.providerKey === 'phantom' && solana.isPhantom) isDetected = true;
        if (provider.providerKey === 'solflare' && w.solflare) isDetected = true;
        if (provider.providerKey === 'backpack' && solana.isBackpack) isDetected = true;
        if (provider.providerKey === 'glow' && solana.isGlow) isDetected = true;
        if (provider.providerKey === 'torus') isDetected = !!solana.isTorus;
        if (provider.providerKey === 'walletconnect') isDetected = true;
      }
      if (provider.providerKey === 'walletconnect') isDetected = true;
      return { ...provider, detected: isDetected };
    });
    setWallets(detected);
  }, []);

  const handleWalletSelect = (walletName: string) => {
    if (walletName === 'WalletConnect') {
      openWalletConnect();
      return;
    }
    setSelectedWallet(walletName);
    setApprovalStep('review');
  };

  const openWalletConnect = () => {
    setDemoMode(false);
    setSelectedWallet('WalletConnect');
    setApprovalStep('sign');
    setLoading(true);

    try {
      const wcUri = 'https://walletconnect.com/explorer?platform=solana';
      setWcUri(wcUri);
      window.open(wcUri, '_blank');
    } catch {
      setError('Failed to open WalletConnect');
      setApprovalStep('select');
    } finally {
      setLoading(false);
    }
  };

  const registerWallet = async (address: string) => {
    try {
      const analysis = await analyzeWallet(address);
      await saveWalletInsights(address, analysis);
    } catch { /* non-fatal */ }
    try {
      await fetch('/api/auth/link-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
    } catch { /* non-fatal */ }
  };

  const handleApprove = async () => {
    setApprovalStep('sign');
    setLoading(true);
    setError(null);

    try {
      if (demoMode) {
        const addr = demoAddress.trim() || '9WzDXwBbmkt8XqU3qJmBXfLvQMnPqJMowJJK5yYc8mXW';
        const bal = await checkBalance(addr);
        const tokens = await fetchWalletTokens(addr);
        setSenderWallet({ address: addr, balance: bal, connected: true, tokens });
        toast({ title: 'Connected', description: bal > 0 ? `${bal.toFixed(4)} SOL` : 'Balance is 0 SOL — use faucet to get Devnet SOL' });
        await registerWallet(addr);
        setApprovalStep('connected');
        setTimeout(() => setStep('relationship'), 800);
        return;
      }

      const walletProvider = wallets.find(w => w.name === selectedWallet);
      if (!walletProvider) throw new Error('Wallet not found');

      let solanaProvider: Record<string, unknown> | null = null;
      if (typeof window !== 'undefined') {
        const w = window as unknown as Record<string, unknown>;
        if (walletProvider.providerKey === 'solflare') {
          solanaProvider = (w.solflare as Record<string, unknown>) || null;
        } else {
          solanaProvider = (w.solana as Record<string, unknown>) || null;
        }
      }

      if (!solanaProvider || !walletProvider.detected) {
        throw new Error(`${selectedWallet} not detected. Please install it or use Demo Mode.`);
      }

      const connectFn = solanaProvider.connect as (() => Promise<{ publicKey: { toString(): string } }>) | undefined;
      if (!connectFn) throw new Error('Wallet does not support connect');

      const resp = await connectFn();
      const address = resp.publicKey.toString();

      // Signature approval
      const message = `GiftMind sign-in: ${new Date().toISOString()}`;
      const encoded = new TextEncoder().encode(message);
      let signatureHex: string | undefined;

      if (solanaProvider && typeof (solanaProvider as any).signMessage === 'function') {
        const signed = await (solanaProvider as any).signMessage(encoded, 'utf8');
        const sig = signed?.signature || signed;
        if (sig) {
          const arr = sig instanceof Uint8Array ? sig : new Uint8Array(sig);
          signatureHex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        }
      } else if (solanaProvider && typeof (solanaProvider as any).request === 'function') {
        const result = await (solanaProvider as any).request({ method: 'signMessage', params: { message: Array.from(encoded) } });
        const sig = result?.signature || result;
        if (sig) {
          const arr = sig instanceof Uint8Array ? sig : new Uint8Array(sig);
          signatureHex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        }
      }

      const bal = await checkBalance(address);
      const tokens = await fetchWalletTokens(address);
      setSenderWallet({ address, balance: bal, connected: true, tokens });
      toast({ title: 'Connected', description: `${bal.toFixed(4)} SOL${tokens.length > 0 ? ` | ${tokens.length} token${tokens.length > 1 ? 's' : ''}` : ''}` });

      await registerWallet(address);

      setApprovalStep('connected');
      setTimeout(() => setStep('relationship'), 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      setApprovalStep('select');
    } finally {
      setLoading(false);
    }
  };

  const handleAirdrop = async () => {
    const addr = demoAddress.trim() || '9WzDXwBbmkt8XqU3qJmBXfLvQMnPqJMowJJK5yYc8mXW';
    const sig = await requestAirdrop(addr, 2);
    if (sig) toast({ title: 'Airdrop Complete', description: '2 SOL on devnet' });
    else toast({ title: 'Airdrop Failed', variant: 'destructive' });
  };

  // Show connect prompt (initial state)
  if (!showWalletList && approvalStep === 'select') {
    return (
      <div className="animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl surface-stellar-strong flex items-center justify-center mb-5 animate-pulse-solar">
            <Wallet className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-solar mb-2">Connect Wallet</h2>
          <p className="text-slate-500 text-sm">GiftMind on Solana Devnet</p>
        </div>

        <div className="surface-stellar-strong rounded-2xl p-8">
          <button
            onClick={() => setShowWalletList(true)}
            className="w-full h-16 rounded-2xl btn-solar text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Wallet className="h-6 w-6" />
            Connect Wallet
            <ChevronDown className="h-5 w-5" />
          </button>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setDemoMode(true); setSelectedWallet('Demo Wallet'); setApprovalStep('review'); setShowWalletList(true); }}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Continue with Demo Wallet
            </button>
          </div>

          <div className="mt-8">
            <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-xs text-amber-500/50 hover:text-amber-400 transition-colors">
              <ExternalLink className="h-3 w-3" />Get Devnet SOL
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-2xl surface-stellar-strong flex items-center justify-center mb-5 animate-pulse-solar">
          <Wallet className="h-8 w-8 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-solar mb-2">Connect Wallet</h2>
        <p className="text-slate-500 text-sm">GiftMind on Solana</p>
      </div>

      <div className="surface-stellar-strong rounded-2xl p-6 space-y-6">
        {/* Approval Steps Indicator */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {['select', 'review', 'sign', 'connected'].map((step, i) => (
            <React.Fragment key={step}>
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                ['select', 'review', 'sign', 'connected'].indexOf(approvalStep) >= i
                  ? 'bg-amber-400 shadow-lg shadow-amber-400/30'
                  : 'bg-slate-800'
              }`} />
              {i < 3 && <div className={`w-8 h-px ${['select', 'review', 'sign', 'connected'].indexOf(approvalStep) > i ? 'bg-amber-400/40' : 'bg-slate-800'}`} />}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step: Select Wallet */}
        {approvalStep === 'select' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Wallet</h3>
              <button onClick={() => setShowWalletList(false)} className="text-slate-600 hover:text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {wallets.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => handleWalletSelect(wallet.name)}
                  className={`w-full wallet-option flex items-center justify-between p-4 rounded-xl surface-void ${
                    wallet.detected ? 'detected' : 'not-detected'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <WalletLogo name={wallet.icon} />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-300">{wallet.name}</p>
                      <p className={`text-[10px] ${wallet.detected ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {wallet.detected ? 'Detected' : 'Not installed'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {wallet.detected && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                  </div>
                </button>
              ))}
            </div>

            {/* Demo mode toggle */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800/50" /></div>
              <div className="relative flex justify-center"><span className="bg-[#0c0a1a] px-3 text-xs text-slate-600">or</span></div>
            </div>

            <button
              onClick={() => { setDemoMode(true); setApprovalStep('review'); setSelectedWallet('Demo Wallet'); }}
              className="w-full wallet-option flex items-center justify-between p-4 rounded-xl surface-void detected"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🧪</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-300">Demo Wallet</p>
                  <p className="text-[10px] text-cyan-400">Pre-funded Devnet wallet for testing</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        )}

        {/* Step: Review & Approve */}
        {approvalStep === 'review' && (
          <div className="space-y-5 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Connection Review</h3>
              <button onClick={() => { setApprovalStep('select'); setError(null); }} className="text-slate-600 hover:text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl surface-solar">
              <div className="flex items-center gap-3 mb-4">
                {selectedWallet === 'Demo Wallet' ? (
                  <span className="text-2xl">🧪</span>
                ) : (
                  <WalletLogo name={selectedWallet?.toLowerCase() || ''} />
                )}
                <div>
                  <p className="text-sm font-bold text-slate-200">{selectedWallet}</p>
                  <p className="text-[10px] text-amber-400/60">GiftMind Ecosystem</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2 text-slate-400">
                  <Shield className="h-3.5 w-3.5 text-amber-400/60 mt-0.5 shrink-0" />
                  <span>This connection will request <strong className="text-slate-300">read-only access</strong> to your wallet address and balance.</span>
                </div>
                <div className="flex items-start gap-2 text-slate-400">
                  <Shield className="h-3.5 w-3.5 text-cyan-400/60 mt-0.5 shrink-0" />
                  <span>No transactions will be signed without your <strong className="text-slate-300">explicit approval</strong>.</span>
                </div>
                <div className="flex items-start gap-2 text-slate-400">
                  <Shield className="h-3.5 w-3.5 text-violet-400/60 mt-0.5 shrink-0" />
                  <span>You can <strong className="text-slate-300">disconnect</strong> at any time from your wallet extension.</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Permissions Requested</h4>
              <div className="space-y-1.5">
                {['View wallet address', 'View SOL balance', 'Request transaction approval'].map((perm) => (
                  <div key={perm} className="flex items-center gap-2 p-2.5 rounded-lg surface-void text-xs text-slate-400">
                    <CheckCircle className="h-3 w-3 text-amber-400/50" />
                    {perm}
                  </div>
                ))}
              </div>
            </div>

            {demoMode && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Custom Devnet Address (optional)</label>
                <input
                  placeholder="Leave empty for pre-funded demo wallet"
                  value={demoAddress}
                  onChange={(e) => setDemoAddress(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-black/30 border border-slate-700/50 text-slate-200 font-mono placeholder:text-slate-700 focus:border-amber-500/40 focus:outline-none text-sm"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setApprovalStep('select'); setError(null); }} className="flex-1 h-11 rounded-xl surface-stellar text-slate-400 flex items-center justify-center gap-2 hover:border-slate-600 transition-all text-sm">
                Cancel
              </button>
              <button onClick={handleApprove} disabled={isLoading} className="flex-1 h-11 rounded-xl btn-solar flex items-center justify-center gap-2 text-sm disabled:opacity-40">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Shield className="h-4 w-4" />Approve & Connect</>}
              </button>
            </div>
          </div>
        )}

        {/* Step: Signing */}
        {approvalStep === 'sign' && (
          <div className="text-center py-8 animate-slide-up">
            <div className="w-16 h-16 mx-auto rounded-2xl surface-stellar animate-pulse-solar flex items-center justify-center mb-5">
              {selectedWallet === 'WalletConnect' ? (
                <QrCode className="h-8 w-8 text-amber-400" />
              ) : (
                <Shield className="h-8 w-8 text-amber-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-solar mb-2">
              {selectedWallet === 'WalletConnect' ? 'Open WalletConnect' : 'Awaiting Signature'}
            </h3>
            <p className="text-slate-500 text-sm mb-1">
              {selectedWallet === 'WalletConnect' ? (
                'A new tab has been opened for WalletConnect'
              ) : demoMode ? (
                'Connecting demo wallet...'
              ) : (
                `Please approve the connection in ${selectedWallet}`
              )}
            </p>
            <p className="text-[10px] text-slate-700">No funds will be moved during connection</p>
            {selectedWallet === 'WalletConnect' && wcUri && (
              <a href={wcUri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg btn-solar text-sm">
                <ExternalLink className="h-4 w-4" />Open WalletConnect
              </a>
            )}
            <div className="flex justify-center mt-4 gap-1">
              {[0, 1, 2].map(i => (<div key={i} className="w-2 h-2 rounded-full bg-amber-400/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />))}
            </div>
          </div>
        )}

        {/* Step: Connected */}
        {approvalStep === 'connected' && (
          <div className="text-center py-8 animate-slide-up">
            <div className="w-16 h-16 mx-auto rounded-2xl surface-solar flex items-center justify-center mb-5">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-solar mb-2">Connected!</h3>
            <p className="text-slate-500 text-sm">Wallet ready for gifting</p>
          </div>
        )}

        {demoMode && approvalStep === 'select' && (
          <button onClick={handleAirdrop} className="w-full h-10 rounded-lg surface-stellar text-slate-400 flex items-center justify-center gap-2 text-sm hover:border-amber-500/30 transition-all">
            <ExternalLink className="h-3.5 w-3.5" />Request 2 SOL Airdrop
          </button>
        )}

        <div className="text-center">
          <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-500/50 hover:text-amber-400 transition-colors">
            Get Devnet SOL at faucet.solana.com
          </a>
        </div>
      </div>
    </div>
  );
}
