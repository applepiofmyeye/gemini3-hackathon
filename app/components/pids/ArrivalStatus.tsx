'use client';

import { PartyPopper, Siren, TrainFront } from 'lucide-react';

/**
 * ArrivalStatus - Scenario-based status badge for arrival outcome.
 *
 * Displays the result scenario with appropriate styling:
 * - CRASH (red): Score < 40
 * - DELAYED (amber): Score 40-69
 * - SAFE (green): Score >= 70
 */

export type ArrivalScenario = 'crash' | 'delayed' | 'safe';

interface ArrivalStatusProps {
  /** The arrival scenario */
  scenario: ArrivalScenario;
  /** Optional additional CSS classes */
  className?: string;
}

const SCENARIO_CONFIG = {
  crash: {
    title: 'TRAIN CRASHED',
    subtitle: 'Better luck next time!',
    Icon: Siren,
    bgColor: 'bg-red-600',
    borderColor: 'border-red-500',
    textColor: 'text-white',
    iconBg: 'bg-red-800/50',
  },
  delayed: {
    title: 'DELAYED ARRIVAL',
    subtitle: 'Almost there!',
    Icon: TrainFront,
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-400',
    textColor: 'text-black',
    iconBg: 'bg-amber-600/50',
  },
  safe: {
    title: 'ARRIVED SAFELY',
    subtitle: 'Well done!',
    Icon: PartyPopper,
    bgColor: 'bg-green-600',
    borderColor: 'border-green-500',
    textColor: 'text-white',
    iconBg: 'bg-green-800/50',
  },
};

export default function ArrivalStatus({ scenario, className = '' }: ArrivalStatusProps) {
  const config = SCENARIO_CONFIG[scenario];
  const Icon = config.Icon;

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        border-2 rounded-xl px-6 py-4 flex items-center gap-4
        shadow-lg
        ${className}
      `}
    >
      {/* Icon */}
      <span
        className={`
          inline-flex items-center justify-center w-12 h-12 rounded-lg
          ${config.iconBg}
        `}
        aria-hidden="true"
      >
        <Icon className="w-7 h-7" />
      </span>

      {/* Text */}
      <div className="flex-1">
        <h2 className="font-bold text-xl tracking-wide">{config.title}</h2>
        <p className="text-sm opacity-80">{config.subtitle}</p>
      </div>
    </div>
  );
}
