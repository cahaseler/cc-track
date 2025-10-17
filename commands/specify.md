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
1. **Use AskUserQuestion tool** - Provides clean UI for multiple questions at once
2. **Group questions smartly** - Ask 2-4 questions per batch, but only if early answers won't invalidate later ones
3. **Always prefer multiple choice** - Tool presents these cleanly (2-4 options per question)
4. **Include "Other" for flexibility** - Auto-provided by tool for free-form responses
5. **Be specific** - "What authentication method?" not "How will users log in?"
6. **Gather just enough to start**:
   - **Purpose**: What problem does this solve? For whom?
   - **Scope**: What's included? What's explicitly out of scope?
   - **Success criteria**: How do we know it's working?
   - **User flows**: Core happy path clear?

### Critical Rule:
**Ask just enough questions to create a workable first draft (2-4 questions total).** Mark remaining ambiguities with [NEEDS CLARIFICATION] for the /clarify command to resolve. Better to create the spec sooner with clear markers than delay for complete understanding.

**Tip**: If you need background research on a domain, technology, or pattern during specification:
```
Task: "Research [domain/pattern] to inform feature specification for [feature]"
Subagent: researcher
Output: .claude/specs/research-[topic].md
```

This is useful when the user requests a feature in an unfamiliar domain (e.g., "Add OAuth2 authentication" but you're unsure of OAuth2 flows).

### Examples Using AskUserQuestion Tool:

**Single question batch (if answer might affect follow-ups):**
```typescript
AskUserQuestion({
  questions: [{
    question: "What's the primary purpose of this feature?",
    header: "Purpose",
    multiSelect: false,
    options: [
      { label: "User management", description: "Handle user accounts, profiles, permissions" },
      { label: "Data processing", description: "Transform, analyze, or export data" },
      { label: "Integration", description: "Connect with external services/APIs" },
      { label: "UI enhancement", description: "Improve user interface or experience" }
    ]
  }]
})
```

**Multiple question batch (when independent):**
```typescript
AskUserQuestion({
  questions: [
    {
      question: "Who are the primary users?",
      header: "Users",
      multiSelect: true,  // Can select multiple user types
      options: [
        { label: "End users", description: "Regular application users" },
        { label: "Admins", description: "System administrators" },
        { label: "API clients", description: "External systems via API" }
      ]
    },
    {
      question: "What's the expected scale?",
      header: "Scale",
      multiSelect: false,
      options: [
        { label: "Small", description: "<100 users, <1000 records" },
        { label: "Medium", description: "100-10K users, <1M records" },
        { label: "Large", description: ">10K users, >1M records" }
      ]
    }
  ]
})
```

---

## Phase 2: Artifact Creation

Once you have complete understanding (not before!):

### Step 1: Generate Task ID and Feature Name
**Find next task ID**:
- List `.claude/specs/` directory
- Find directories matching pattern `NNN-*` (e.g., `001-feature`, `002-another`)
- Extract highest number, add 1, pad to 3 digits
- If no directories exist, use `001`

**Generate feature name** from title:
- Convert to lowercase
- Replace non-alphanumeric with dashes
- Remove leading/trailing dashes
- Limit to 50 chars
- Example: "Add User Authentication" → "add-user-authentication"

### Step 2: Create Git Branch
```bash
git checkout -b ${taskId}-${featureName}
```

### Step 3: Create Spec Directory
```bash
mkdir -p .claude/specs/${taskId}-${featureName}
```
Example: `.claude/specs/001-add-user-authentication/`

### Step 4: Generate spec.md from Template
**Read** `templates/spec-template.md` and fill in:
- **Feature ID**: `${taskId}`
- **Title**: Extracted from understanding phase
- **User Scenarios**: From gathered information
- **Functional Requirements**: As specific FR-XXX items
- **Non-Functional Requirements**: Performance, security, etc.
- **[NEEDS CLARIFICATION]**: Mark ANY remaining ambiguities

**Write** to `.claude/specs/${taskId}-${featureName}/spec.md`

**Critical**: If you had to make ANY assumptions, mark them with `[NEEDS CLARIFICATION: specific question]`

### Step 5: Create Metadata
**Write** `.claude/specs/${taskId}-${featureName}/.metadata.json`:
```json
{
  "task_id": "001",
  "feature_name": "add-user-authentication",
  "branch": "001-add-user-authentication",
  "status": "draft",
  "started": "2025-01-14T10:30:00Z"
}
```

### Step 6: GitHub Integration (if enabled)
**Check** `.claude/track.config.json` for `github.enabled: true`

If enabled:
```bash
gh issue create --title "Feature: ${title}" --body "${spec content}"
```

Update `.metadata.json` with issue info:
```json
{
  "github": {
    "issue": 123,
    "url": "https://github.com/user/repo/issues/123"
  }
}
```

### Step 7: Update CLAUDE.md
**Find** line starting with `## Active Task`

**Replace** the `@` import line with:
```markdown
## Active Task
@.claude/specs/${taskId}-${featureName}/spec.md
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

❌ **Don't**: Ask too many questions upfront - defeats the purpose of /clarify
✅ **Do**: Ask 2-4 focused questions to get a workable first draft

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

Claude: [Uses AskUserQuestion tool with 3 questions]

Questions presented in UI:
1. Authentication Method (header: "Auth Method")
   - Email/password: Traditional username and password
   - OAuth only: Google, GitHub, etc.
   - Both: Email and OAuth options
   [Other option auto-provided]

2. Primary Users (header: "Users", multiSelect: true)
   - End users: Regular app users
   - Admins: System administrators
   - API clients: External systems
   [Other option auto-provided]

3. Security Level (header: "Security")
   - Basic: 8+ character passwords
   - Standard: Length + complexity requirements
   - High: MFA required
   [Other option auto-provided]

User: Selects "Email/password", "End users" + "Admins", "Standard"

Claude: "Perfect! I have enough to create the spec. Let me create:
- Branch: 001-add-user-authentication
- Spec with functional requirements for email/password auth with standard security
- Marked 3 areas needing clarification (session timeout, password reset method, max login attempts)

[Creates all artifacts]

Ready to run `/clarify` to resolve those 3 open questions?"
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
