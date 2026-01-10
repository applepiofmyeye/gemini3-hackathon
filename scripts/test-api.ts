/**
 * Test script for the API routes.
 *
 * Run with: npx ts-node scripts/test-api.ts
 *
 * Make sure the dev server is running: npm run dev
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: unknown;
}

async function testStartEndpoint(): Promise<TestResult> {
  const name = 'GET /api/game/start';

  try {
    const response = await fetch(`${BASE_URL}/api/game/start`);
    const data = await response.json();

    if (!response.ok) {
      return { name, passed: false, error: `Status ${response.status}` };
    }

    if (!data.lines || !data.vocabulary) {
      return { name, passed: false, error: 'Missing lines or vocabulary' };
    }

    return { name, passed: true, data: { lineCount: data.lines.length } };
  } catch (error) {
    return { name, passed: false, error: String(error) };
  }
}

async function testStartSession(): Promise<TestResult> {
  const name = 'POST /api/game/start';

  try {
    const response = await fetch(`${BASE_URL}/api/game/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineId: 'north-south',
        wordId: 'ns-hello',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { name, passed: false, error: `Status ${response.status}: ${JSON.stringify(data)}` };
    }

    if (!data.session || !data.word) {
      return { name, passed: false, error: 'Missing session or word' };
    }

    return {
      name,
      passed: true,
      data: {
        sessionId: data.session.sessionId,
        word: data.word.word,
      },
    };
  } catch (error) {
    return { name, passed: false, error: String(error) };
  }
}

async function testValidateEndpoint(): Promise<TestResult> {
  const name = 'POST /api/game/validate';

  try {
    // First create a session
    const startResponse = await fetch(`${BASE_URL}/api/game/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineId: 'north-south',
        wordId: 'ns-hello',
      }),
    });

    const startData = await startResponse.json();
    if (!startData.session) {
      return { name, passed: false, error: 'Failed to create session' };
    }

    // Simulate completed session
    const session = {
      ...startData.session,
      status: 'recognizing',
      finalTranscription: 'H E L L O',
      durationMs: 5000,
      streamStartedAt: Date.now() - 5000,
      streamEndedAt: Date.now(),
      transcriptionEvents: [{ timestamp: 1000, text: 'H E L L O', isFinal: true }],
    };

    // Call validate
    const validateResponse = await fetch(`${BASE_URL}/api/game/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session }),
    });

    const data = await validateResponse.json();

    if (!validateResponse.ok) {
      return {
        name,
        passed: false,
        error: `Status ${validateResponse.status}: ${JSON.stringify(data)}`,
      };
    }

    return {
      name,
      passed: data.success === true,
      data: {
        success: data.success,
        score: data.score,
      },
      error: data.success ? undefined : data.error,
    };
  } catch (error) {
    return { name, passed: false, error: String(error) };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('API ENDPOINT TESTS');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  const tests = [testStartEndpoint, testStartSession, testValidateEndpoint];

  const results: TestResult[] = [];

  for (const test of tests) {
    console.log(`Running: ${test.name}...`);
    const result = await test();
    results.push(result);

    if (result.passed) {
      console.log(`  ✓ PASSED`);
      if (result.data) {
        console.log(`    Data: ${JSON.stringify(result.data)}`);
      }
    } else {
      console.log(`  ✗ FAILED: ${result.error}`);
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('All tests passed! ✓');
  } else {
    console.log('Some tests failed. Check the output above.');
    process.exit(1);
  }
}

main().catch(console.error);
