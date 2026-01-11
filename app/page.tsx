'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getWordsByLine } from '@/lib/data/vocabulary';
import { startBackgroundMusic } from '@/app/components/AudioControls';

export default function Home() {
  const router = useRouter();
  // Get first station for north-south line
  const northSouthStations = getWordsByLine('north-south');
  const firstStation = northSouthStations[0];
  const firstStationPath = firstStation ? `/north-south/${firstStation.id}` : '/';

  const handleStartClick = async () => {
    // Start music when Start button is clicked
    await startBackgroundMusic();
    // Navigate to first station
    router.push(firstStationPath);
  };

  return (
    <main className="min-h-screen bg-[var(--hot-cream)] relative">
      {/* Mobile-first centered layout */}
      <div className="flex flex-col items-center justify-center min-h-screen pt-8 pb-32 md:pt-0 md:pb-0 md:absolute md:inset-0 md:z-20">
        {/* Logo */}
        <div className="mb-8 md:absolute md:top-0 md:left-0 md:mb-0">
          <Image
            src="/hands-on-track.png"
            alt="HANDS ON TRACK Logo"
            width={500}
            height={500}
            className="h-auto w-auto max-w-[280px] sm:max-w-[400px] md:max-w-[600px]"
            priority
          />
        </div>

        {/* Start Button with Animated Train */}
        <div className="md:absolute md:top-24 md:right-20">
          <button
            onClick={handleStartClick}
            className="relative cursor-pointer hover:scale-105 transition-transform max-w-[280px] sm:max-w-[400px]"
          >
            {/* Train - animated on top, clipped to button width and showing only bottom half */}
            <div className="absolute -top-9 left-0 right-0 z-10 h-[54px] overflow-hidden pointer-events-none">
              <div className="w-full h-full">
                <Image
                  src="/animations/train.png"
                  alt="MRT Train"
                  width={400}
                  height={60}
                  className="w-full max-w-[280px] sm:max-w-[400px] h-auto animate-train"
                />
              </div>
            </div>

            {/* Start Button */}
            <Image
              src="/mrt-signs/start-button.png"
              alt="Press to START!"
              width={400}
              height={80}
              className="w-full h-auto relative z-0"
            />
          </button>
        </div>
      </div>

      {/* Singapore Skyline Background */}
      <div className="absolute bottom-0 left-0 right-0 z-0">
        <Image
          src="/singapore-skyline.png"
          alt="Singapore Skyline"
          width={1507}
          height={560}
          sizes="100vw"
          className="w-[100%] h-auto"
        />
      </div>

      <div className="container mx-auto px-4 py-8 flex flex-col items-center min-h-screen relative z-10">
        {/* Header */}
        <header className="mb-8 text-center pt-4" />

        {/* Main Game Area - Empty for now, game starts when clicking start button */}
        <div className="w-full max-w-3xl page-transition" />

        {/* Footer */}
        <footer className="mt-auto py-8 text-center">
          <p className="text-gray-500 text-sm">Built for Google Gemini Hackathon 🇸🇬</p>
          <p className="text-gray-400 text-xs mt-1">
            Promoting sign language accessibility in Singapore
          </p>
        </footer>
      </div>
    </main>
  );
}
