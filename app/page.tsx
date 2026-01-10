import Image from 'next/image';
import Link from 'next/link';
import { getWordsByLine } from '@/lib/data/vocabulary';

// Logo colors matching MRT lines
const LOGO_COLORS = [
  { letter: 'H', color: '#D42E12' },  // Red (North-South)
  { letter: 'A', color: '#009645' },  // Green (East-West)
  { letter: 'N', color: '#FA9E0D' },  // Orange (Circle)
  { letter: 'D', color: '#9900AA' },  // Purple (North-East)
  { letter: 'S', color: '#005EC4' },  // Blue (Downtown)
  { letter: ' ', color: 'transparent' },
  { letter: 'O', color: '#D42E12' },  // Red
  { letter: 'N', color: '#009645' },  // Green
  { letter: ' ', color: 'transparent' },
  { letter: 'T', color: '#8B4513' },  // Brown
  { letter: 'R', color: '#FA9E0D' },  // Orange
  { letter: 'A', color: '#9900AA' },  // Purple
  { letter: 'C', color: '#005EC4' },  // Blue
  { letter: 'K', color: '#8B4513' },  // Brown
];

export default function Home() {
  // Get first station for north-south line
  const northSouthStations = getWordsByLine('north-south');
  const firstStation = northSouthStations[0];
  const firstStationPath = firstStation ? `/north-south/${firstStation.id}` : '/';

  return (
    <main className="min-h-screen bg-[var(--hot-cream)] relative">
      {/* Logo - Top Left */}
      <div className="absolute top-0 left-0 z-20">
        <Image
          src="/hands-on-track.png"
          alt="HANDS ON TRACK Logo"
          width={500}
          height={500}
          className="h-auto w-auto max-w-[600px] md:max-w-[600px]"
          priority
        />
      </div>

      {/* Start Button with Animated Train - Top Right */}
      <div className="absolute top-24 right-20 z-20">
        <Link href={firstStationPath} className="block">
          <button 
            className="relative cursor-pointer hover:scale-105 transition-transform max-w-md"
          >
            {/* Train - animated on top, clipped to button width and showing only bottom half */}
            <div className="absolute -top-9 left-0 right-0 z-10 h-[54px] overflow-hidden pointer-events-none">
              <div className="w-full h-full">
                <Image
                  src="/animations/train.png"
                  alt="MRT Train"
                  width={400}
                  height={60}
                  className="w-[400px] h-auto animate-train"
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
        </Link>
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
        <header className="mb-8 text-center pt-4">
        </header>

        {/* Main Game Area - Empty for now, game starts when clicking start button */}
        <div className="w-full max-w-3xl page-transition">
          <div className="text-center mt-32">
            <p className="text-gray-600 text-lg mb-4">Click the start button to begin your journey!</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto py-8 text-center">
          <p className="text-gray-500 text-sm">
            Built for Google Gemini Hackathon 🇸🇬
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Promoting sign language accessibility in Singapore
          </p>
        </footer>
      </div>
    </main>
  );
}
