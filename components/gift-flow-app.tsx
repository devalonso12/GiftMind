'use client';

import React from 'react';
import { useGiftFlow } from '../lib/store';
import { WalletConnectStep } from './steps/wallet-connect-step';
import { RelationshipStep } from './steps/relationship-step';
import { SearchStep } from './steps/search-step';
import { ProfileStep } from './steps/profile-step';
import { RecommendStep } from './steps/recommend-step';
import { ApproveStep } from './steps/approve-step';
import { SendStep } from './steps/send-step';
import { CompleteStep } from './steps/complete-step';
import { ProgressIndicator } from './progress-indicator';
import { Header } from './header';
import { SolarSystemBG } from './solar-system-bg';

const STEP_ORDER = ['connect', 'relationship', 'search', 'profile', 'recommend', 'approve', 'send', 'complete'] as const;

export function GiftFlowApp() {
  const { currentStep, senderWallet } = useGiftFlow();
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  const renderStep = () => {
    switch (currentStep) {
      case 'connect': return <WalletConnectStep />;
      case 'relationship': return <RelationshipStep />;
      case 'search': return <SearchStep />;
      case 'profile': return <ProfileStep />;
      case 'recommend': return <RecommendStep />;
      case 'approve': return <ApproveStep />;
      case 'send': return <SendStep />;
      case 'complete': return <CompleteStep />;
      default: return <WalletConnectStep />;
    }
  };

  // Show disconnect button only when wallet is connected and not on connect step
  const showDisconnect = senderWallet?.connected && currentStep !== 'connect';

  return (
    <>
      <SolarSystemBG />
      <div className="relative z-10 min-h-screen">
        <Header showDisconnect={showDisconnect} />
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <ProgressIndicator currentStep={currentIndex} totalSteps={STEP_ORDER.length} />
          <div className="mt-8 animate-slide-up">
            {renderStep()}
          </div>
        </div>
      </div>
    </>
  );
}
