'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGiftFlow } from '../../lib/store';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, AlertCircle, ExternalLink, Shield, CheckCircle, Wallet, ChevronRight, X } from 'lucide-react';
import { checkBalance, requestAirdrop } from '../../lib/transaction';
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
];

type ApprovalStep = 'select' | 'review' | 'sign' | 'connected';

export function WalletConnectStep() {
  const { setStep, setSenderWallet, setError, error, setLoading, isLoading } = useGiftFlow();
  const [wallets, setWallets] = useState<DetectedWallet[]>(WALLET_PROVIDERS);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [approvalStep, setApprovalStep] = useState<ApprovalStep>('select');
  const [demoMode, setDemoMode] = useState(false);
  const [demoAddress, setDemoAddress] = useState('');
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
      }
      return { ...provider, detected: isDetected };
    });
    setWallets(detected);
  }, []);

  const handleWalletSelect = (walletName: string) => {
    setSelectedWallet(walletName);
    setApprovalStep('review');
  };

  const handleApprove = async () => {
    setApprovalStep('sign');
    setLoading(true);
    setError(null);

    try {
      if (demoMode) {
        const addr = demoAddress.trim() || '9WzDXwBbmkt8XqU3qJmBXfLvQMnPqJMowJJK5yYc8mXW';
        const bal = await checkBalance(addr);
        setSenderWallet({ address: addr, balance: bal, connected: true });
        toast({ title: 'Connected', description: `${bal.toFixed(4)} SOL` });
        setApprovalStep('connected');
        setTimeout(() => setStep('search'), 800);
        return;
      }

      const walletProvider = wallets.find(w => w.name === selectedWallet);
      if (!walletProvider) throw new Error('Wallet not found');

      // Try real wallet connection
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
      const bal = await checkBalance(address);
      setSenderWallet({ address, balance: bal, connected: true });
      toast({ title: 'Connected', description: `${bal.toFixed(4)} SOL` });
      setApprovalStep('connected');
      setTimeout(() => setStep('search'), 800);
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

  const getWalletIcon = (icon: string) => {
    const iconMap: Record<string, string> = {
      phantom: '👻',
      solflare: '🔥',
      backpack: '🎒',
      glow: '✨',
      torus: '🔮',
    };
    return iconMap[icon] || '💼';
  };

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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detected Wallets</h3>
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
                    <span className="text-xl">{getWalletIcon(wallet.icon)}</span>
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
                <span className="text-2xl">{selectedWallet === 'Demo Wallet' ? '🧪' : getWalletIcon(selectedWallet?.toLowerCase() || '')}</span>
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

            {/* Permissions list */}
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Permissions Requested</h4>
              <div className="space-y-1.5">
                {['View wallet address', 'View SOL balance', 'Request transaction approval'].map((perm, i) => (
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
              <Shield className="h-8 w-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-solar mb-2">Awaiting Signature</h3>
            <p className="text-slate-500 text-sm mb-1">
              {demoMode ? 'Connecting demo wallet...' : `Please approve the connection in ${selectedWallet}`}
            </p>
            <p className="text-[10px] text-slate-700">No funds will be moved during connection</p>
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
