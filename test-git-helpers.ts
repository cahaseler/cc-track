#!/usr/bin/env bun

import { GitHelpers } from './src/lib/git-helpers';

async function testCommitMessage() {
  const gitHelpers = new GitHelpers();
  
  const diff = `diff --git a/package.json b/package.json
index abc123..def456 100644
--- a/package.json
+++ b/package.json
@@ -32,6 +32,7 @@
   "dependencies": {
+    "@anthropic-ai/claude-code": "^1.0.112",
     "ccusage": "latest",
     "commander": "^14.0.0"
   }`;

  console.log('Testing commit message generation with SDK...');
  const message = await gitHelpers.generateCommitMessage(diff, process.cwd(), '039');
  console.log('Generated message:', message);
}

testCommitMessage().catch(console.error);