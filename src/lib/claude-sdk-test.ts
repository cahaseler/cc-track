#!/usr/bin/env bun

/**
 * Simple test script to validate Claude Code TypeScript SDK works with Pro subscription
 * This should use the existing Claude CLI authentication (Pro plan) without requiring an API key
 */

import { query } from '@anthropic-ai/claude-code';

async function testSDKWithProAuth() {
  console.log('Testing Claude Code SDK with Pro subscription authentication...\n');

  try {
    // Create a simple query - just a basic math question to test connectivity
    const prompt = 'What is 2 + 2? Please respond with just the number.';
    
    console.log(`Prompt: ${prompt}`);
    console.log('Sending request to Claude...\n');

    // Use the SDK's query function with minimal options
    // The SDK should use the existing Claude CLI authentication
    const response = query({
      prompt,
      options: {
        model: 'haiku', // Use haiku for quick test
        maxTurns: 1,    // Single turn only
        // No API key specified - should use existing CLI auth
      }
    });

    // The query returns an async generator, so we need to iterate
    let gotResult = false;
    for await (const message of response) {
      // Log the message type for debugging
      console.log(`Received message type: ${message.type}`);
      
      // Look for the assistant's response
      if (message.type === 'assistant') {
        console.log('\n✅ Success! Got response from Claude:');
        console.log(`Response: ${message.message.content[0]?.text || 'No text content'}`);
        gotResult = true;
      }
      
      // Check for system messages that show authentication info
      if (message.type === 'system' && message.subtype === 'init') {
        console.log('\nAuthentication info:');
        console.log(`- API Key Source: ${message.apiKeySource}`);
        console.log(`- Model: ${message.model}`);
        console.log(`- Session ID: ${message.session_id}`);
      }
      
      // Show the final result
      if (message.type === 'result') {
        console.log('\nFinal result:');
        if (message.subtype === 'success') {
          console.log(`- Status: SUCCESS`);
          console.log(`- Duration: ${message.duration_ms}ms`);
          console.log(`- Cost: $${message.total_cost_usd}`);
          console.log(`- Tokens used: ${message.usage.input_tokens} input, ${message.usage.output_tokens} output`);
        } else {
          console.log(`- Status: ERROR (${message.subtype})`);
        }
      }
    }

    if (!gotResult) {
      console.error('❌ No response received from Claude');
      process.exit(1);
    }

    console.log('\n🎉 SDK test successful! Pro subscription authentication is working.');
    
  } catch (error) {
    console.error('❌ Error testing SDK:', error);
    console.error('\nThis might mean:');
    console.error('1. You need to run "claude login" first');
    console.error('2. The Claude CLI is not installed');
    console.error('3. Your Pro subscription session has expired');
    process.exit(1);
  }
}

// Run the test
testSDKWithProAuth();