'use client';

import React from 'react';
import { useGiftFlow } from '../../lib/store';
import { Relationship } from '../../lib/types';
import { Users, Heart, UserPlus } from 'lucide-react';

const RELATIONSHIPS: { value: Relationship; label: string; icon: React.ElementType }[] = [
  { value: 'father', label: 'Father', icon: Users },
  { value: 'boyfriend', label: 'Boyfriend', icon: Heart },
  { value: 'sibling', label: 'Sibling', icon: UserPlus },
];

export function RelationshipStep() {
  const { relationship, setRelationship, setStep } = useGiftFlow();

  const handleSelect = (value: Relationship) => {
    setRelationship(value);
    setStep('search');
  };

  return (
    <div className="animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-2xl surface-stellar-strong flex items-center justify-center mb-5">
          <Users className="h-8 w-8 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-solar mb-2">Your Relationship</h2>
        <p className="text-slate-500 text-sm">How do you know the recipient?</p>
      </div>

      <div className="surface-stellar-strong rounded-2xl p-6">
        <div className="grid grid-cols-3 gap-3">
          {RELATIONSHIPS.map((rel) => {
            const Icon = rel.icon;
            const isSelected = relationship === rel.value;
            return (
              <button
                key={rel.value}
                onClick={() => handleSelect(rel.value)}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : 'border-slate-700/30 surface-void hover:border-slate-600'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-200">{rel.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
