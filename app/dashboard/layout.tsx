'use client'

import { GiftFlowProvider } from '../../lib/store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <GiftFlowProvider>{children}</GiftFlowProvider>
}
