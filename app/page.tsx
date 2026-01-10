import ASLRecognizer from './components/ASLRecognizer';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-blue-500/30">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none" />
      
      <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col items-center min-h-screen">
        <header className="mb-8 text-center space-y-4 pt-8">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
            <span className="text-blue-400 text-xs font-mono tracking-wider uppercase">Powered by Gemini 2.0 Flash</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50 tracking-tight">
            SignFlow
          </h1>
          <p className="text-lg text-gray-400 max-w-lg mx-auto leading-relaxed">
            Real-time ASL translation using Multimodal Live API. <br/>
            <span className="text-sm opacity-60">Point your camera at your hands to begin.</span>
          </p>
        </header>

        <ASLRecognizer apiKey={process.env.GEMINI_API_KEY || ''} />
        
        <footer className="mt-auto py-8 text-center text-gray-600 text-sm">
          <p>Built for Gemini Hackathon</p>
        </footer>
      </div>
    </main>
  );
}
