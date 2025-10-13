#!/usr/bin/env tsx
// ABOUTME: Quick test script to verify which model the 'sonnet' alias resolves to
// ABOUTME: Run this and check ccusage to see which model was actually used

import { query } from '@anthropic-ai/claude-agent-sdk';

async function testModelAlias() {
  console.log('Testing model alias "sonnet"...');
  console.log('Check ccusage output to see which model was actually used\n');

  const stream = query({
    prompt: 'Reply with EXACTLY: MODEL_TEST_XYZABC_789',
    options: {
      model: 'sonnet',
      maxTurns: 1,
      systemPrompt: { type: 'preset', preset: 'claude_code' },
    },
  });

  for await (const message of stream) {
    if (message.type === 'result') {
      console.log('\nResult:', message.subtype);
      if ('usage' in message && message.usage) {
        console.log('Usage:', {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
        });
      }
      if ('total_cost_usd' in message) {
        console.log('Cost:', message.total_cost_usd);
      }
    }
  }

  console.log('\nNow run: npx ccusage daily --json | jq ".daily[-1].modelBreakdowns"');
  console.log('to see which model was actually charged');
}

testModelAlias().catch(console.error);
