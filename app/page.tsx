'use client';

import React, { useState, useEffect } from 'react';
import { GiftFlowProvider } from '../lib/store';
import { GiftFlowApp } from '../components/gift-flow-app';
import { WelcomePage } from '../components/welcome-page';
import { SolarSystemBG } from '../components/solar-system-bg';
import { InactivityGuard } from '../components/inactivity-guard';

export default function Home() {
  const [showApp, setShowApp] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-[#06050d]" />;
  }

  return (
    <>
      <SolarSystemBG />
      <div className="relative z-10">
        {!showApp ? (
          <WelcomePage onEnter={() => setShowApp(true)} />
        ) : (
          <GiftFlowProvider>
            <InactivityGuard>
              <GiftFlowApp />
            </InactivityGuard>
          </GiftFlowProvider>
        )}
      </div>
    </>
  );
}
