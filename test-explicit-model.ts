#!/usr/bin/env tsx
// ABOUTME: Test if explicit model name claude-sonnet-4-5-20250929 works with current SDK
// ABOUTME: Run this to verify the model name is recognized

import { query } from '@anthropic-ai/claude-code';

async function testExplicitModel() {
  console.log('Testing explicit model name: claude-sonnet-4-5-20250929\n');

  try {
    const stream = query({
      prompt: 'Reply with EXACTLY: EXPLICIT_MODEL_TEST_456',
      options: {
        model: 'claude-sonnet-4-5-20250929',
        maxTurns: 1,
      },
    });

    for await (const message of stream) {
      if (message.type === 'result') {
        console.log('✓ Success! Model name works.');
        console.log('Result:', message.subtype);
        if ('usage' in message && message.usage) {
          console.log('Usage:', {
            input_tokens: message.usage.input_tokens,
            output_tokens: message.usage.output_tokens,
          });
        }
      }
    }
  } catch (err) {
    console.error('✗ Failed! Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

testExplicitModel().catch(console.error);
