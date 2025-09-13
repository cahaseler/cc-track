#!/bin/bash

# Manual test script for task validation hook
# This script tests the PreToolUse validation for task files

set -e

echo "=== Task Validation Hook Manual Test ==="
echo "Testing PreToolUse validation of task file edits"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ensure we're in the right directory
cd /home/ubuntu/projects/cc-pars

# Build the latest version
echo "📦 Building cc-track..."
bun build src/cli/index.ts --compile --minify --sourcemap --outfile dist/cc-track
echo ""

# Create a test task file if it doesn't exist
TEST_TASK_FILE=".claude/tasks/TASK_999.md"
echo "📝 Creating test task file: $TEST_TASK_FILE"

cat > "$TEST_TASK_FILE" << 'EOF'
# Task 999: Test Task for Validation

## Status
Status: in_progress

## Description
This is a test task for validating the task validation hook.

## Requirements
- [ ] All tests must pass
- [ ] All lint checks must pass
- [ ] All type checks must pass

## Progress
Initial task created for testing.
EOF

echo "✅ Test task file created"
echo ""

# Function to create and test a hook input
test_edit() {
    local test_name="$1"
    local old_string="$2"
    local new_string="$3"
    local expected_result="$4"  # "block" or "allow"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧪 Test: $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Create the hook input JSON
    cat > /tmp/hook_input.json << EOF
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "$TEST_TASK_FILE",
    "old_string": "$old_string",
    "new_string": "$new_string"
  },
  "cwd": "$(pwd)"
}
EOF

    echo "📄 Input:"
    echo "  Old: \"$old_string\""
    echo "  New: \"$new_string\""
    echo ""

    # Run the hook
    echo "🔄 Running validation hook..."
    set +e
    OUTPUT=$(cat /tmp/hook_input.json | ./dist/cc-track hook 2>&1)
    RESULT=$?
    set -e

    echo "📤 Output: $OUTPUT"

    # Parse the result
    if echo "$OUTPUT" | grep -q '"permissionDecision":"deny"'; then
        ACTUAL_RESULT="block"
        REASON=$(echo "$OUTPUT" | grep -oP '"permissionDecisionReason":"\K[^"]*' || echo "No reason found")
        echo -e "${YELLOW}🚫 BLOCKED:${NC} $REASON"
    elif echo "$OUTPUT" | grep -q '"continue":true'; then
        ACTUAL_RESULT="allow"
        echo -e "${GREEN}✅ ALLOWED${NC}"
    else
        ACTUAL_RESULT="error"
        echo -e "${RED}❌ ERROR: Unexpected output${NC}"
    fi

    # Check if result matches expectation
    if [ "$ACTUAL_RESULT" = "$expected_result" ]; then
        echo -e "${GREEN}✓ Test PASSED${NC} - Got expected result: $expected_result"
    else
        echo -e "${RED}✗ Test FAILED${NC} - Expected: $expected_result, Got: $ACTUAL_RESULT"
        exit 1
    fi

    echo ""
}

# Test 1: Block status change to completed
test_edit \
    "Block status change to completed" \
    "Status: in_progress" \
    "Status: completed" \
    "block"

# Test 2: Block weasel words about test failures
test_edit \
    "Block weasel words about partial test passes" \
    "- [ ] All tests must pass" \
    "- [x] Most tests pass (2 failing due to environment issues)" \
    "block"

# Test 3: Block excuses about lint errors
test_edit \
    "Block excuses about acceptable lint issues" \
    "- [ ] All lint checks must pass" \
    "- [x] Lint checks mostly pass (minor formatting issues are acceptable)" \
    "block"

# Test 4: Allow legitimate progress update
test_edit \
    "Allow legitimate progress update" \
    "Initial task created for testing." \
    "Made good progress on implementation. Tests are being written." \
    "allow"

# Test 5: Allow updating status to something other than completed
test_edit \
    "Allow status change to blocked" \
    "Status: in_progress" \
    "Status: blocked" \
    "allow"

# Test 6: Block "good enough" language
test_edit \
    "Block 'good enough' completion claim" \
    "- [ ] All type checks must pass" \
    "- [x] Type checks are good enough for now" \
    "block"

# Test for non-task files (should always allow)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test: Allow edits to non-task files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat > /tmp/hook_input.json << EOF
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "src/some-file.ts",
    "old_string": "const x = 1;",
    "new_string": "const x = 2;"
  },
  "cwd": "$(pwd)"
}
EOF

echo "📄 Testing edit to non-task file (src/some-file.ts)"
OUTPUT=$(cat /tmp/hook_input.json | ./dist/cc-track hook 2>&1)

if echo "$OUTPUT" | grep -q '"continue":true'; then
    echo -e "${GREEN}✓ Test PASSED${NC} - Non-task file edit allowed"
else
    echo -e "${RED}✗ Test FAILED${NC} - Non-task file should be allowed"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "The task validation hook is working correctly:"
echo "✅ Blocks status changes to 'completed'"
echo "✅ Blocks weasel words about partial test/lint passes"
echo "✅ Blocks 'good enough' language"
echo "✅ Allows legitimate progress updates"
echo "✅ Allows status changes to non-completed states"
echo "✅ Ignores non-task files"

# Clean up
rm -f /tmp/hook_input.json
echo ""
echo "🧹 Cleaned up test files"