---
description: Create a feature specification through Socratic questioning and iterative refinement
---

# Creating Feature Specifications

**Goal**: Transform rough ideas into structured, tech-agnostic specifications through systematic questioning.

**Core Principle**: Gather complete understanding BEFORE creating artifacts. Questions first, documents second.

---

## Phase 1: Understanding (Socratic Questioning)

**DO NOT create any files yet.** First, build complete understanding through questions.

### Questioning Approach:
1. **Ask ONE question at a time** - Wait for answer before next question
2. **Prefer multiple choice** when possible - Makes answering easier
3. **Be specific** - "What authentication method?" not "How will users log in?"
4. **Gather systematically**:
   - **Purpose**: What problem does this solve? For whom?
   - **Scope**: What's included? What's explicitly out of scope?
   - **Success criteria**: How do we know it's working?
   - **Constraints**: Tech limitations? Timeline? Resources?
   - **User flows**: Who does what, and why?

### Critical Rule:
**Continue questioning while ANY aspect remains unclear.** Don't rush to artifact creation. A well-understood spec takes 5-10 clarifying questions minimum.

### Examples of Good Questions:
- "This feature has 3 main user types - which should we focus on first?"
- "For authentication, choose one: A) Email/password B) OAuth only C) Both D) Something else?"
- "What happens when a user tries to delete something that's in use?"

---

## Phase 2: Artifact Creation

Once you have complete understanding (not before!):

### Step 1: Generate Task ID and Feature Name
```typescript
// Use spec-helpers to get next ID
const taskId = getNextTaskId(projectRoot);
const featureName = generateFeatureName(title); // e.g., "add-user-authentication"
```

### Step 2: Create Git Branch
```bash
git checkout -b ${taskId}-${featureName}
```

### Step 3: Create Spec Directory
```typescript
const specDir = createSpecDirectory(projectRoot, taskId, featureName);
// Creates: .claude/specs/001-add-user-authentication/
```

### Step 4: Generate spec.md from Template
Use `templates/spec-template.md` and fill in:
- **Feature ID**: `${taskId}`
- **Title**: Extracted from understanding phase
- **User Scenarios**: From gathered information
- **Functional Requirements**: As specific FR-XXX items
- **Non-Functional Requirements**: Performance, security, etc.
- **[NEEDS CLARIFICATION]**: Mark ANY remaining ambiguities

**Critical**: If you had to make ANY assumptions, mark them with `[NEEDS CLARIFICATION: specific question]`

### Step 5: Create Metadata
```typescript
const metadata: SpecMetadata = {
  task_id: taskId,
  feature_name: featureName,
  branch: `${taskId}-${featureName}`,
  status: 'draft',
  started: new Date().toISOString()
};
createMetadata(specDir, metadata);
```

### Step 6: GitHub Integration (if enabled)
```typescript
if (isGitHubIntegrationEnabled()) {
  const issue = githubHelpers.createGitHubIssue(title, specContent, projectRoot);
  // Update metadata with issue info
}
```

### Step 7: Update CLAUDE.md
```typescript
claudeMdHelpers.setActiveTask(projectRoot, `.claude/specs/${taskId}-${featureName}/spec.md`);
```

---

## Phase 3: Presentation

Show the user:
1. **Branch created**: `${taskId}-${featureName}`
2. **Spec location**: `.claude/specs/${taskId}-${featureName}/spec.md`
3. **Content preview**: Show first 30-40 lines of spec
4. **Clarification count**: "Marked X areas needing clarification"
5. **Next step suggestion**: "Ready to run `/clarify` to refine requirements?"

---

## Common Pitfalls to Avoid

❌ **Don't**: Create spec after 1-2 questions
✅ **Do**: Ask 5-10 questions minimum

❌ **Don't**: Guess at requirements
✅ **Do**: Mark ambiguities explicitly

❌ **Don't**: Include implementation details (tech stack, APIs, code)
✅ **Do**: Focus only on WHAT and WHY, not HOW

❌ **Don't**: Write vague requirements like "system should be fast"
✅ **Do**: Use [NEEDS CLARIFICATION: what's the performance target?]

---

## Example Flow

```
User: "I want to add user authentication"

Claude: "Let me understand this better. For authentication, which approach fits best?
A) Email/password with registration
B) OAuth only (Google, GitHub, etc.)
C) Both email and OAuth
D) Something else"

User: "A - email and password"

Claude: "Got it. For password security, should we:
A) Basic requirements (8+ chars)
B) Strict requirements (uppercase, numbers, symbols)
C) Let user choose strength"

User: "B"

Claude: "When a user forgets their password, how should reset work?
A) Email link that expires in 24 hours
B) Security questions
C) Admin must reset
D) Different approach"

... (continue until clear) ...

Claude: "Perfect! I have enough to create the spec. Let me create:
- Branch: 001-add-user-authentication
- Spec with functional requirements including password reset flow
- Marked 2 areas needing clarification (session timeout, max login attempts)

[Creates all artifacts]

Ready to run `/clarify` to resolve those 2 open questions?"
```

---

## Implementation Notes

- Use spec-helpers.ts functions for all file operations
- Follow cc-track naming conventions (3-digit IDs)
- Preserve all metadata in .metadata.json
- Git operations done directly with Bash tool
- Check for active task before creating (block if exists)

---

## Next Command

After `/specify` completes successfully, suggest: `/clarify`
