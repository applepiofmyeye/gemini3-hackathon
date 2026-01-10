/**
 * Test script for the validation pipeline.
 *
 * Run with: npx ts-node scripts/test-pipeline.ts
 * Or: bun run scripts/test-pipeline.ts
 *
 * Make sure GEMINI_API_KEY is set in environment.
 */

import { GamePipeline } from '../lib/pipeline/game-pipeline';
import { createInitialSessionState, type GameSessionState } from '../lib/schemas/game-session';

async function main() {
  console.log('='.repeat(80));
  console.log('SIGN LANGUAGE GAME - PIPELINE TEST');
  console.log('='.repeat(80));

  // Check for API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY environment variable not set');
    console.log('Set it with: export GEMINI_API_KEY=your_key');
    process.exit(1);
  }

  console.log('API Key: ✓ Found');
  console.log('');

  // Create test session state
  const session = createInitialSessionState({
    lineId: 'north-south',
    wordId: 'ns-hello',
    expectedWord: 'HELLO',
    level: 1,
    outputDir: './output/test-run',
  });

  // Simulate streaming result - user signed "H E L L O"
  const testTranscription = 'H E L L O';

  // Update session with simulated streaming results
  const sessionWithResults: GameSessionState = {
    ...session,
    status: 'recognizing',
    finalTranscription: testTranscription,
    durationMs: 5000, // 5 seconds
    streamStartedAt: Date.now() - 5000,
    streamEndedAt: Date.now(),
    transcriptionEvents: [
      { timestamp: 1000, text: 'H ', isFinal: false },
      { timestamp: 2000, text: 'E ', isFinal: false },
      { timestamp: 3000, text: 'L ', isFinal: false },
      { timestamp: 3500, text: 'L ', isFinal: false },
      { timestamp: 4500, text: 'O', isFinal: true },
    ],
    // Add streaming cost estimate
    costTracking: {
      live_stream_0: {
        model: 'gemini-2.5-flash-preview-05-20',
        sessionDurationMs: 5000,
        estimatedInputTokens: 1290, // ~5 frames * 258 tokens
        estimatedOutputTokens: 10,
        estimatedCost: 0.0001,
        frameCount: 5,
        transcriptionCount: 5,
      },
    },
  };

  console.log('Test Configuration:');
  console.log(`  Session ID: ${session.sessionId}`);
  console.log(`  Expected Word: "${sessionWithResults.expectedWord}"`);
  console.log(`  Transcription: "${sessionWithResults.finalTranscription}"`);
  console.log(`  Level: ${sessionWithResults.level}`);
  console.log(`  Duration: ${sessionWithResults.durationMs}ms`);
  console.log('');

  // Run pipeline
  const pipeline = new GamePipeline();

  console.log('Running validation pipeline...');
  console.log('');

  const startTime = Date.now();
  const result = await pipeline.runValidation(sessionWithResults, {
    lineId: session.lineId,
    wordId: session.wordId,
    expectedWord: session.expectedWord,
    level: session.level,
    outputDir: './output/test-run',
    saveToDb: false,
    checkExisting: false,
  });
  const totalTime = Date.now() - startTime;

  console.log('');
  console.log('='.repeat(80));
  console.log('TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`Success: ${result.success ? '✓' : '✗'}`);
  console.log(`Total Pipeline Time: ${totalTime}ms`);
  console.log('');

  if (result.success) {
    console.log('Validation Result:');
    console.log(`  Valid: ${result.state.validationResult?.isValid}`);
    console.log(`  Match: ${result.state.validationResult?.matchPercentage}%`);
    console.log(`  Reasoning: ${result.state.validationResult?.reasoning}`);
    console.log('');

    console.log('Scoring Result:');
    console.log(`  Score: ${result.state.score}/100`);
    if (result.state.scoringResult) {
      console.log(`  Accuracy: ${result.state.scoringResult.breakdown.accuracy}`);
      console.log(`  Speed: ${result.state.scoringResult.breakdown.speed}`);
      console.log(`  Clarity: ${result.state.scoringResult.breakdown.clarity}`);
    }
    console.log('');

    console.log('Feedback Result:');
    if (result.state.feedbackResult) {
      console.log(`  Feedback: ${result.state.feedbackResult.feedback}`);
      console.log(`  Suggestions: ${result.state.feedbackResult.suggestions.join(', ')}`);
      console.log(`  Encouragement: ${result.state.feedbackResult.encouragement}`);
    }
    console.log('');

    console.log('Cost Summary:');
    console.log(`  Total Cost: $${result.state.totalCost.toFixed(4)}`);
    console.log(`  Input Tokens: ${result.state.totalInputTokens}`);
    console.log(`  Output Tokens: ${result.state.totalOutputTokens}`);
  } else {
    console.log(`Error: ${result.error || result.state.error}`);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('Test complete. Logs saved to ./output/test-run/');
  console.log('='.repeat(80));
}

// Run
main().catch(console.error);
