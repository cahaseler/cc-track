/**
 * Integration test for DiffSummary using real Claude SDK
 *
 * NOTE: This test uses the actual Claude API and will consume tokens.
 * It can be skipped in CI by setting SKIP_INTEGRATION_TESTS=true
 *
 * Run with: bun test diff-summary.integration.test.ts
 * Skip with: SKIP_INTEGRATION_TESTS=true bun test
 */

import { describe, expect, test } from 'bun:test';
import { DiffSummary } from './diff-summary';
import { createLogger } from './logger';

const skipIntegration = process.env.SKIP_INTEGRATION_TESTS === 'true';

describe.skipIf(skipIntegration)('DiffSummary Integration Tests', () => {
  const logger = createLogger('diff-summary-integration');

  // Sample real git diff for testing
  const sampleDiff = `diff --git a/src/example.ts b/src/example.ts
index 1234567..8901234 100644
--- a/src/example.ts
+++ b/src/example.ts
@@ -1,10 +1,15 @@
 export class UserService {
   constructor(private db: Database) {}

-  async getUser(id: string) {
-    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
+  async getUser(id: string): Promise<User | null> {
+    const result = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
+    if (!result.rows.length) {
+      return null;
+    }
+    return this.mapToUser(result.rows[0]);
   }

+  private mapToUser(row: any): User {
+    return { id: row.id, name: row.name, email: row.email };
+  }
 }`;

  const multiDiffSample = [
    `diff --git a/package.json b/package.json
@@ -5,6 +5,7 @@
   "dependencies": {
+    "express": "^4.18.0",
     "typescript": "^5.0.0"
   }`,
    `diff --git a/src/server.ts b/src/server.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/server.ts
@@ -0,0 +1,8 @@
+import express from 'express';
+
+const app = express();
+const PORT = process.env.PORT || 3000;
+
+app.listen(PORT, () => {
+  console.log(\`Server running on port \${PORT}\`);
+});`,
  ];

  test('summarizes a real git diff using actual Claude SDK', async () => {
    const diffSummary = new DiffSummary(undefined, logger); // Let it load real SDK

    console.log('🔄 Testing with real Claude SDK - this will consume tokens...');

    const summary = await diffSummary.summarizeDiff(sampleDiff);

    console.log('📝 Generated summary:', summary);

    // Verify we got a meaningful summary
    expect(summary).toBeTruthy();
    expect(summary.length).toBeGreaterThan(10);
    expect(summary).not.toContain('No changes detected');

    // Should mention something about the actual changes
    // The exact wording will vary but should relate to the diff content
    const lowerSummary = summary.toLowerCase();
    expect(
      lowerSummary.includes('user') ||
        lowerSummary.includes('type') ||
        lowerSummary.includes('return') ||
        lowerSummary.includes('map') ||
        lowerSummary.includes('method'),
    ).toBe(true);
  }, 30000); // 30 second timeout for API call

  test('summarizes multiple diffs using actual Claude SDK', async () => {
    const diffSummary = new DiffSummary(undefined, logger);

    console.log('🔄 Testing multiple diffs with real Claude SDK...');

    const summary = await diffSummary.summarizeDiffs(multiDiffSample);

    console.log('📝 Generated multi-diff summary:', summary);

    // Verify we got a unified summary
    expect(summary).toBeTruthy();
    expect(summary.length).toBeGreaterThan(20);
    expect(summary).not.toContain('No changes to summarize');

    // Should mention both Express and server setup
    const lowerSummary = summary.toLowerCase();
    expect(
      lowerSummary.includes('express') ||
        lowerSummary.includes('server') ||
        lowerSummary.includes('dependency') ||
        lowerSummary.includes('package'),
    ).toBe(true);
  }, 45000); // 45 second timeout for multiple API calls

  test('handles empty diff gracefully with real SDK', async () => {
    const diffSummary = new DiffSummary(undefined, logger);

    const summary = await diffSummary.summarizeDiff('');

    // Should return default without calling SDK
    expect(summary).toBe('• No changes detected');
  });

  test('handles very large diff with truncation', async () => {
    const diffSummary = new DiffSummary(undefined, logger);

    // Create a large but realistic diff
    const largeDiff = `diff --git a/src/large.ts b/src/large.ts
index 1234567..8901234 100644
--- a/src/large.ts
+++ b/src/large.ts
@@ -1,100 +1,200 @@
${'+ // Added line\n'.repeat(100)}`;

    console.log('🔄 Testing large diff truncation...');

    const summary = await diffSummary.summarizeDiff(largeDiff);

    console.log('📝 Large diff summary:', summary);

    expect(summary).toBeTruthy();
    expect(summary.length).toBeLessThan(500); // Should be concise despite large input
  }, 30000);
});

// Standalone smoke test that can be run manually
if (import.meta.main) {
  console.log('🚀 Running DiffSummary integration test standalone...\n');

  const testDiff = `diff --git a/test.ts b/test.ts
@@ -1,3 +1,5 @@
 function hello() {
-  console.log('hello');
+  console.log('hello world');
+  // Added comment
+  return true;
 }`;

  const diffSummary = new DiffSummary();

  try {
    const result = await diffSummary.summarizeDiff(testDiff);
    console.log('✅ Success! Summary:', result);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}
