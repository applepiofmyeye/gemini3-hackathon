'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

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
  'Don’t kan cheong, PM Wong scanning your hand shapes...',
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

  // Cycle through loading messages every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-(--hot-cream)">
      {/* Singapore Skyline Background */}
      <div className="absolute bottom-0 left-0 right-0 z-0">
        <Image
          src="/singapore-skyline.png"
          alt="Singapore Skyline"
          width={1507}
          height={560}
          sizes="100vw"
          className="w-full h-auto"
          priority
        />
      </div>

      {/* Semi-transparent Overlay */}
      <div className="absolute inset-0 bg-(--hot-cream)/80 backdrop-blur-sm z-10" />

      {/* Content - Train and Text as One Centered Component with Fluid Width */}
      <div className="relative z-20 flex flex-col items-center justify-center w-full px-4">
        <div className="flex flex-col items-center w-full max-w-[700px]">
          {/* Loading Message - MRT Signboard Style */}
          <div className="flex justify-center w-full mb-4">
            <div
              className="bg-black text-white px-4 sm:px-8 md:px-12 py-4 sm:py-5 rounded-2xl shadow-2xl border-2 border-gray-800 relative"
              style={{ borderBottom: `10px solid ${lineColor}` }}
            >
              <h2
                key={currentMessageIndex}
                className="text-lg sm:text-2xl md:text-3xl font-bold animate-fadeIn tracking-wide text-center"
              >
                {LOADING_MESSAGES[currentMessageIndex]}
              </h2>
            </div>
          </div>

          {/* Animated Train - fluid width container */}
          <div className="relative w-full h-32 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-full flex items-center">
              <div className="w-full h-full relative">
                <Image
                  src="/animations/train.png"
                  alt="MRT Train"
                  width={650}
                  height={98}
                  className="w-full max-w-[650px] h-auto animate-train"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
