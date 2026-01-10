import GameSession from './components/GameSession';

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
  const apiKey = process.env.GEMINI_API_KEY || '';

  return (
    <main className="min-h-screen bg-[var(--hot-cream)]">
      <div className="container mx-auto px-4 py-8 flex flex-col items-center min-h-screen">
        {/* Header */}
        <header className="mb-8 text-center pt-4">
          {/* Logo */}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
            {LOGO_COLORS.map((item, i) =>
              item.letter === ' ' ? (
                <span key={i} className="inline-block w-3 md:w-5" />
              ) : (
                <span
                  key={i}
                  className="logo-letter"
                  style={{ color: item.color }}
                >
                  {item.letter}
                </span>
              )
            )}
          </h1>

          {/* Tagline */}
          <p className="text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
            Learn sign language by riding the MRT! 🚇
            <br />
            <span className="text-sm text-gray-500">
              Powered by Gemini 2.0 Flash Live API
            </span>
          </p>

          {/* Quick Stats Badge */}
          <div className="mt-4 inline-flex items-center gap-3 px-4 py-2 bg-white/80 rounded-full shadow-sm">
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: '#D42E12' }}
              />
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: '#009645' }}
              />
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: '#FA9E0D' }}
              />
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: '#9900AA' }}
              />
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: '#005EC4' }}
              />
            </span>
            <span className="text-sm text-gray-600">5 Lines • 30 Words</span>
          </div>
        </header>

        {/* Main Game Area */}
        <div className="w-full max-w-3xl page-transition">
          <GameSession apiKey={apiKey} />
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
