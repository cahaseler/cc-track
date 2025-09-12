#!/usr/bin/env bun

/**
 * Advanced test showing how we could use the SDK for cc-track use cases
 * Tests JSON output mode and tool restrictions
 */

import { query } from '@anthropic-ai/claude-code';

async function testAdvancedFeatures() {
  console.log('Testing advanced SDK features for cc-track use cases...\n');

  // Test 1: Generate a commit message (like GitHelpers does)
  console.log('=== Test 1: Generate Commit Message ===');
  await testCommitMessage();

  // Test 2: Code review with restricted tools (read-only agent)
  console.log('\n=== Test 2: Code Review with Restricted Tools ===');
  await testRestrictedCodeReview();
}

async function testCommitMessage() {
  const prompt = `Generate a conventional commit message for these changes:
- Added TypeScript SDK integration
- Created test scripts for SDK validation
- Updated package.json with new dependency

Respond with JUST the commit message, no explanation.`;

  try {
    const response = query({
      prompt,
      options: {
        model: 'haiku',
        maxTurns: 1,
        // Could restrict tools if needed
        disallowedTools: ['*'], // No tools needed for text generation
      },
    });

    for await (const message of response) {
      if (message.type === 'assistant') {
        const text = message.message.content[0]?.text || '';
        console.log(`Generated commit message: ${text.trim()}`);
      }
    }
  } catch (error) {
    console.error('Error generating commit message:', error);
  }
}

async function testRestrictedCodeReview() {
  const prompt = `Review this TypeScript file and identify any issues:
\`\`\`typescript
function add(a, b) {
  return a + b
}

const result = add("1", 2);
console.log(result);
\`\`\`

Provide a brief analysis of any type safety issues.`;

  try {
    const response = query({
      prompt,
      options: {
        model: 'haiku',
        maxTurns: 1,
        // Restrict to read-only operations for safety
        allowedTools: ['Read', 'Grep', 'Glob'], // Only allow reading, no writing
      },
    });

    for await (const message of response) {
      if (message.type === 'assistant') {
        const text = message.message.content[0]?.text || '';
        console.log('Code review result:');
        console.log(text);
      }

      // Check if any tools were denied
      if (message.type === 'result' && message.permission_denials?.length > 0) {
        console.log('\nTools that were denied:');
        message.permission_denials.forEach((denial) => {
          console.log(`- ${denial.tool_name}: ${denial.tool_input}`);
        });
      }
    }
  } catch (error) {
    console.error('Error reviewing code:', error);
  }
}

// Run the tests
testAdvancedFeatures();
