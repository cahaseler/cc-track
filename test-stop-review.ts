#!/usr/bin/env bun

import { SessionReviewer } from './src/hooks/stop-review';
import { createLogger } from './src/lib/logger';

async function testStopReview() {
  const logger = createLogger('test-stop-review');
  const reviewer = new SessionReviewer('/home/ubuntu/projects/cc-pars', logger);
  
  // Create a simple test prompt
  const prompt = `Review these changes:
  - Added Claude SDK integration
  - Migrated GitHelpers to use SDK
  - Updated stop-review hook
  
  Task requirements: Migrate from CLI to SDK
  
  Respond with JSON:
  {
    "status": "on_track",
    "message": "Successfully migrated to SDK",
    "commitMessage": "feat: migrate to Claude Code TypeScript SDK",
    "details": "All CLI calls replaced with SDK calls"
  }`;
  
  console.log('Testing stop-review with SDK...');
  const result = await reviewer.callClaudeForReview(prompt);
  console.log('Review result:', result);
}

testStopReview().catch(console.error);