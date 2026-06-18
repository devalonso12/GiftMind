'use client'

import React, { useEffect, useState } from 'react'
import { SolarSystemBG } from '../../components/solar-system-bg'
import { createClient } from '@supabase/supabase-js'
import { useGiftFlow } from '../../lib/store'
import { Header } from '../../components/header'
import { Gift, BarChart3, TrendingUp, Wallet, Gift as GiftIcon, ArrowLeft, ExternalLink, Loader2, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { getExplorerLink } from '../../lib/transaction'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

interface GiftRow {
  id: string
  sender_wallet: string
  recipient_wallet?: string
  gift_type: string
  gift_amount?: number
  gift_token?: string
  status: string
  claim_code: string
  created_at: string
  claimed_at?: string
  sender_message?: string
  transaction_signature?: string
}

interface DashboardStats {
  totalSent: number
  totalClaimed: number
  claimRate: number
  totalSolSent: number
  nftSent: number
}

export default function DashboardPage() {
  const { senderWallet } = useGiftFlow()
  const [sentGifts, setSentGifts] = useState<GiftRow[]>([])
  const [receivedGifts, setReceivedGifts] = useState<GiftRow[]>([])
  const [stats, setStats] = useState<DashboardStats>({ totalSent: 0, totalClaimed: 0, claimRate: 0, totalSolSent: 0, nftSent: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [senderWallet?.address])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const wallet = senderWallet?.address
      if (!wallet || !senderWallet?.connected) {
        setLoading(false)
        return
      }

      if (!supabase) return

      const sentQuery = supabase
        .from('gifts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
        .eq('sender_wallet', wallet)

      const receivedQuery = supabase
        .from('gifts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
        .eq('recipient_wallet', wallet)

      const [sentRes, receivedRes] = await Promise.all([sentQuery, receivedQuery])
      const sentList = (sentRes.data || []) as GiftRow[]
      const receivedList = (receivedRes.data || []) as GiftRow[]
      setSentGifts(sentList)
      setReceivedGifts(receivedList)

      const totalSent = sentList.length
      const totalClaimed = sentList.filter(g => g.status === 'claimed' || g.status === 'completed').length
      const totalSolSent = sentList
        .filter(g => g.gift_token === 'SOL')
        .reduce((sum, g) => sum + (g.gift_amount || 0), 0)
      const nftSent = sentList.filter(g => g.gift_type === 'NFT').length

      setStats({
        totalSent,
        totalClaimed,
        claimRate: totalSent > 0 ? Math.round((totalClaimed / totalSent) * 100) : 0,
        totalSolSent,
        nftSent
      })
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
      completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      claimed: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
      failed: 'bg-red-500/15 text-red-400 border-red-500/20',
    }
    return styles[status] || styles.pending
  }

  if (!senderWallet?.connected) {
    return (
      <>
        <SolarSystemBG />
        <div className="relative z-10 min-h-screen">
          <Header showDisconnect={false} />
          <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
            <Wallet className="h-12 w-12 text-amber-400/40 mb-4" />
            <h2 className="text-xl font-bold text-slate-300 mb-2">Connect Your Wallet</h2>
            <p className="text-sm text-slate-500 mb-6">Connect your wallet to view your dashboard and track gifts</p>
            <Link href="/" className="px-6 py-2 rounded-xl btn-solar text-sm font-semibold">
              Go to Home to Connect
            </Link>
          </div>
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <SolarSystemBG />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      </>
    )
  }

  return (
    <>
      <SolarSystemBG />
      <div className="relative z-10 min-h-screen">
        <Header showDisconnect={true} />
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/" className="p-2 rounded-xl surface-stellar hover:border-slate-600 transition-all">
              <ArrowLeft className="h-4 w-4 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-solar">Dashboard</h1>
              <p className="text-sm text-slate-500">
                {senderWallet?.connected
                  ? `${senderWallet.address.slice(0, 6)}...${senderWallet.address.slice(-4)} — ${senderWallet.balance.toFixed(4)} SOL`
                  : 'Connect a wallet to view your dashboard'}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="surface-stellar-strong rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl surface-stellar flex items-center justify-center">
                  <GiftIcon className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-xs text-slate-500">Sent</p>
              </div>
              <p className="text-3xl font-black text-solar">{stats.totalSent}</p>
            </div>
            <div className="surface-stellar-strong rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl surface-stellar flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-xs text-slate-500">Claimed</p>
              </div>
              <p className="text-3xl font-black text-emerald-400">{stats.totalClaimed}</p>
            </div>
            <div className="surface-stellar-strong rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl surface-stellar flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                </div>
                <p className="text-xs text-slate-500">Claim Rate</p>
              </div>
              <p className="text-3xl font-black text-cyan-400">{stats.claimRate}%</p>
            </div>
            <div className="surface-stellar-strong rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl surface-stellar flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-violet-400" />
                </div>
                <p className="text-xs text-slate-500">SOL Sent</p>
              </div>
              <p className="text-3xl font-black text-violet-400">{stats.totalSolSent.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Sent Gifts */}
            <div className="surface-stellar-strong rounded-2xl p-6">
              <h2 className="text-lg font-bold text-solar mb-4 flex items-center gap-2">
                <GiftIcon className="h-4 w-4" /> Sent Gifts
              </h2>
              {sentGifts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-600">No gifts sent yet</p>
                  <Link href="/" className="text-xs text-amber-400/60 hover:text-amber-400 mt-2 inline-block">Send your first gift</Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {sentGifts.map(gift => (
                    <div key={gift.id} className="p-3 rounded-xl surface-void flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200">{gift.gift_amount?.toFixed(4)} {gift.gift_token || 'SOL'}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBadge(gift.status)}`}>{gift.status}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">{new Date(gift.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {gift.claim_code && (
                          <span className="text-[10px] font-mono text-slate-600">{gift.claim_code}</span>
                        )}
                        <Link href={`/claim/${gift.claim_code}`} className="text-amber-400/60 hover:text-amber-400">
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Received Gifts */}
            <div className="surface-stellar-strong rounded-2xl p-6">
              <h2 className="text-lg font-bold text-solar mb-4 flex items-center gap-2">
                <GiftIcon className="h-4 w-4 text-emerald-400" /> Received Gifts
              </h2>
              {receivedGifts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-600">No gifts received yet</p>
                  <p className="text-xs text-slate-700 mt-2">Share your wallet address to receive gifts</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {receivedGifts.map(gift => (
                    <div key={gift.id} className="p-3 rounded-xl surface-void flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200">{gift.gift_amount?.toFixed(4)} {gift.gift_token || 'SOL'}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBadge(gift.status)}`}>{gift.status}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">From {gift.sender_wallet.slice(0, 6)}...{gift.sender_wallet.slice(-4)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {gift.status === 'completed' && (
                          <Link href={`/claim/${gift.claim_code}`} className="text-xs px-2 py-1 rounded-lg btn-solar">
                            Claim
                          </Link>
                        )}
                        {gift.transaction_signature && (
                          <a href={getExplorerLink(gift.transaction_signature, 'devnet')} target="_blank" rel="noreferrer" className="text-cyan-400/60 hover:text-cyan-400">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>


        </div>
      </div>
    </>
  )
}
