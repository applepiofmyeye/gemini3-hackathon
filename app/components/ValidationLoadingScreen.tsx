'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import SkylinePageLayout from './SkylinePageLayout';

// ============================================================
// TYPES
// ============================================================

interface ValidationLoadingScreenProps {
  lineColor: string;
}

// ============================================================
// SINGAPOREAN LOADING MESSAGES
// ============================================================

const LOADING_MESSAGES = [
  'Wait ah, checking your signs...',
  "Don't kan cheong, PM Wong scanning your hand shapes...",
  'Steady lah, calculating your marks now...',
  'Reviewing your signs... wait one second hor!',
  'Almost ready liao, result coming out soon!',
  'Checking if you sign correctly or not... steady!',
];

// ============================================================
// COMPONENT
// ============================================================

export default function ValidationLoadingScreen({ lineColor }: ValidationLoadingScreenProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Cycle through loading messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SkylinePageLayout>
      {/* Content - Train and Text as One Centered Component with Fixed Width */}
      <div className="flex-1 flex items-center justify-center w-full px-4">
        <div className="flex flex-col items-center w-[700px]">
          {/* Loading Message - MRT Signboard Style */}
          <div className="flex justify-center w-full mb-4">
            <div
              className="bg-black text-white px-12 py-5 rounded-2xl shadow-2xl border-2 border-gray-800 relative"
              style={{ borderBottom: `10px solid ${lineColor}` }}
            >
              <h2
                key={currentMessageIndex}
                className="text-2xl md:text-3xl font-bold animate-fadeIn whitespace-nowrap tracking-wide"
              >
                {LOADING_MESSAGES[currentMessageIndex]}
              </h2>
            </div>
          </div>

          {/* Animated Train - bigger, fixed width container */}
          <div className="relative w-full h-32 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-full flex items-center">
              <div className="w-full h-full relative">
                <Image
                  src="/animations/train.png"
                  alt="MRT Train"
                  width={650}
                  height={98}
                  className="w-[650px] h-auto animate-train"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SkylinePageLayout>
  );
}
