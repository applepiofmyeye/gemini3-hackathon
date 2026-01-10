# SignFlow - Real-Time ASL Letter Recognition

A real-time American Sign Language (ASL) letter recognition app powered by Google's Gemini 2.0 Flash Live API. The app captures webcam video, streams frames to Gemini for analysis, and displays recognized letters in real-time.

## Features

- Real-time video capture from webcam
- Continuous ASL letter recognition using Gemini Live API
- Secure backend proxy for API key management
- Low-latency WebSocket communication
- Modern, responsive UI

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm/bun
- Google Gemini API key ([Get one here](https://ai.google.dev/))
- Webcam access

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install TypeScript type definitions (optional but recommended):**
   ```bash
   npm install --save-dev @types/ws @types/express tsx
   ```

3. **Create `.env` file in the root directory:**
   ```bash
   GOOGLE_API_KEY=your_api_key_here
   ```

4. **Start the backend server:**
   ```bash
   npm run backend
   # or for development with auto-reload:
   npm run backend:dev
   ```
   The backend will start on `http://localhost:8080`

5. **In a separate terminal, start the frontend:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. Click "Connect" to establish connection to the backend
2. Click "Start Stream" to begin sending video frames
3. Sign ASL letters with your hands in front of the camera
4. Recognized letters will appear in real-time in the transcription area

## Architecture

- **Frontend**: Next.js React app (`app/components/ASLRecognizer.tsx`)
  - Captures webcam video at 1 FPS
  - Sends frames to backend via WebSocket
  - Displays recognized letters in real-time

- **Backend**: Node.js Express server (`app/backend/server.ts`)
  - WebSocket server for client connections
  - Maintains persistent Gemini Live API session
  - Processes video frames and streams responses back

## Technical Details

- Video frames are downscaled to 320x240 and compressed to JPEG quality 0.6 for bandwidth efficiency
- Frame rate: 1 FPS (as recommended by Gemini docs)
- System instruction optimized for single-letter ASL recognition
- Uses `sendRealtimeInput()` for continuous video streaming

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
