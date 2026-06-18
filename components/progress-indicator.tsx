'use client';

import React from 'react';
import { Check, Sun } from 'lucide-react';

const STEPS = ['Connect', 'Search', 'Profile', 'Recommend', 'Approve', 'Send', 'Done'];

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  return (
    <div className="w-full px-2">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                    : isCurrent
                    ? 'surface-stellar-strong text-amber-400 border border-amber-500/40 animate-pulse-solar'
                    : 'surface-void text-slate-600'
                }`}>
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>
                <span className={`text-[10px] tracking-wide transition-colors ${
                  isCompleted ? 'text-amber-400' : isCurrent ? 'text-slate-400' : 'text-slate-700'
                } hidden md:block`}>{step}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 transition-all duration-500 ${
                  index < currentStep
                    ? 'bg-gradient-to-r from-amber-500/60 to-amber-500/30'
                    : 'bg-slate-800/50'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
