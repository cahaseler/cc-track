#!/usr/bin/env bun

import { ClaudeSDK } from './src/lib/claude-sdk';

async function testSimple() {
  console.log('Testing simple SDK call...');
  
  try {
    const result = await ClaudeSDK.prompt('What is 1+1? Respond with just the number.', 'haiku');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testSimple();