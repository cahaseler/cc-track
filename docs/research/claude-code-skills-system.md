# Research: Claude Code Skills System

**Date:** 2025-10-16
**Question:** What is Anthropic's new Claude Code Skills system, how does it work, and what are the technical details, use cases, and best practices?

## Summary

Claude Skills are customizable, model-invoked capability packages that extend Claude's functionality through organized folders containing instructions, scripts, and resources. Announced October 16, 2025, Skills use progressive disclosure to efficiently deliver specialized expertise—Claude automatically decides when to use relevant skills based on task context, loading only necessary information. Unlike slash commands (user-invoked) or hooks (event-triggered), Skills represent Claude's autonomous ability to recognize and apply specialized knowledge at the right moments.

## Findings

### What Are Claude Skills?

**Core Definition:**
Skills are modular capability packages that Claude autonomously invokes based on relevance to the current task. They package expertise, templates, and executable scripts into discoverable units that Claude can load dynamically without requiring explicit user commands.

**Key Characteristics:**
- **Model-invoked**: Claude decides when to use skills based on task requirements, not user commands
- **Autonomous discovery**: Claude reads skill names and descriptions at startup, determines relevance during execution
- **Progressive disclosure**: Information loads in three tiers (metadata → documentation → supporting files) as needed
- **Composable**: Multiple skills automatically coordinate when needed for complex workflows
- **Portable**: Same format works across Claude.ai, Claude Code, and the Claude API
- **Self-contained**: Include instructions, scripts, templates, and resources in a single directory

**Source:** Official Claude Skills announcement (anthropic.com/news/skills), Claude documentation (docs.claude.com/en/docs/claude-code/skills)

---

### How Skills Are Defined and Structured

**Minimum Viable Skill:**
```
my-skill/
└── SKILL.md
```

**Typical Complete Skill:**
```
my-skill/
├── SKILL.md                 # Required: Core instructions
├── reference.md             # Optional: Detailed reference
├── examples.md              # Optional: Usage examples
├── scripts/
│   ├── helper.py           # Executable utilities
│   └── utility.sh
└── templates/
    ├── template.txt
    └── form.json
```

**SKILL.md Format:**
```yaml
---
name: Skill Display Name
description: Brief description of what this does and when to use it
---

# Skill Name

## Instructions
Step-by-step guidance for Claude to follow.

## Examples
Concrete examples of using this skill.

## Advanced Usage
Optional section for complex scenarios.
```

**Critical Frontmatter Fields:**
- `name` (required): Display name for the skill
- `description` (required): **Critical for discovery**—must include both what it does and when Claude should use it
- `allowed-tools` (optional, Claude Code only): Restricts tool access when skill is active

**Skill Description Best Practice:**
Good descriptions include both the capability and trigger context:
```
Analyze Excel spreadsheets, generate pivot tables, create charts.
Use when working with Excel files, spreadsheets, or .xlsx files.
```

**Source:** Official Claude documentation (docs.claude.com/en/docs/claude-code/skills)

---

### Installation Locations

**Claude Code:** Three installation tiers with different precedence:
1. **Project Skills:** `.claude/skills/skill-name/` (highest priority)
2. **Personal Skills:** `~/.claude/skills/skill-name/` (user-wide)
3. **Plugin Skills:** Bundled with installed plugins (lowest priority)

**Marketplace Installation:**
```bash
/plugin marketplace add anthropics/skills
```
Then use `/plugin` menu to browse and install specific skills.

**Manual Local Installation:**
Copy skill directory to `~/.claude/skills/` and Claude automatically discovers it.

**Source:** Official Claude documentation, Anthropic marketplace announcements

---

### Core Technical Mechanism: Progressive Disclosure

Claude uses a three-tier information architecture to manage context efficiency:

**Tier 1: Metadata (Always Loaded)**
- Skill name and description loaded into system prompt at startup
- Claude uses this to recognize when a skill might be relevant
- Minimal token cost

**Tier 2: Core Documentation (Loaded on Relevance)**
- Full SKILL.md file loaded when Claude determines task relevance
- Claude reads comprehensive instructions and examples
- Selective loading based on task requirements

**Tier 3: Supplementary Resources (Loaded on Demand)**
- Additional files (reference.md, examples.md, scripts) loaded only when needed
- Claude invokes Bash or Python tools to access specific resources
- Never loads entire skill documentation into context

**Implementation Approach:**
When Claude has filesystem access (Code Execution Tool beta enabled), it can:
- Read skill files selectively into context with Bash/Read tools
- Execute bundled scripts deterministically without reading full files
- Navigate between linked documentation based on task requirements

**Benefit:** Context bundling becomes "effectively unbounded"—no theoretical limit on skill complexity since agents load files selectively rather than upfront.

**Source:** Anthropic engineering article (equipping-agents-for-the-real-world-with-agent-skills)

---

### Official Pre-Built Skills

Anthropic provides production-ready skills for common business tasks:

| Skill | Purpose | Bundled With |
|-------|---------|--------------|
| **xlsx** | Excel spreadsheet generation, pivot tables, charts, formula creation | All plans |
| **pptx** | PowerPoint presentation generation, slide formatting, animations | All plans |
| **docx** | Word document creation, formatting, tables, headers | All plans |
| **pdf** | PDF processing, form filling, field extraction, document merging | All plans |

Each includes:
- Detailed Python/Bash instruction documentation
- Pre-written utility scripts (e.g., `fill_fillable_fields.py` for PDF forms)
- Ready-to-use examples and patterns

**Availability:** Included in Pro, Max, Team, and Enterprise plans at no additional cost.

**Source:** Official Claude documentation, simonwillison.net/2025/Oct/10/claude-skills/

---

### Skills vs. Other Claude Code Features

**Skills vs. Slash Commands:**
| Aspect | Skills | Commands |
|--------|--------|----------|
| **Invocation** | Model-autonomous (Claude decides) | User-explicit (`/command-name`) |
| **Purpose** | Provide specialized expertise | Execute predetermined workflows |
| **Discovery** | Auto-invoked when relevant | User-initiated |
| **Context** | Load incrementally as needed | Typically load all content |
| **Interaction** | Passive capability pool | Active workflow trigger |

**Skills vs. Hooks:**
| Aspect | Skills | Hooks |
|--------|--------|-------|
| **Trigger** | Task-based relevance | Event-based (PreToolUse, PostToolUse, etc.) |
| **Purpose** | Provide expertise | Intercept/validate/transform operations |
| **Scope** | Global (all sessions) | Session-specific |
| **Control** | Claude autonomously decides | Predetermined trigger events |

**Skills vs. Sub-agents:**
| Aspect | Skills | Sub-agents |
|--------|--------|-----------|
| **Scope** | Provide knowledge/utilities | Delegate complete tasks |
| **Context** | Shared context with main agent | Isolated context window |
| **Autonomy** | Passive; used by agent | Active; manages subtasks independently |
| **Purpose** | Enhance capabilities | Distribute complex work |

**Skills vs. Plugins:**
| Aspect | Skills | Plugins |
|--------|--------|---------|
| **Scope** | Expertise/templates only | Complete packages (commands + hooks + MCP servers + skills) |
| **Bundling** | Standalone capabilities | Integrated customization suites |
| **Installation** | Via plugin marketplace or manual | Via plugin marketplace |
| **Composition** | Plugins can bundle multiple skills | Single installation unit |

**Key Distinction:** Skills provide **expertise**, while commands provide **actions**, hooks provide **automation**, and agents provide **delegation**.

**Source:** Analysis of official documentation and VentureBeat article

---

### Tool Access Control: allowed-tools

The `allowed-tools` frontmatter field restricts which tools Claude can use when a skill is active. This is **Claude Code specific** and provides security/safety boundaries.

**Syntax:**
```yaml
---
name: Skill Name
description: What this does
allowed-tools: Read, Grep, Glob
---
```

**Common Patterns:**

**File Operations:**
- `Read` : read any file
- `ReadFile:*` : read any file (explicit)
- `ReadFile(docs/*)` : read only docs directory
- `Edit` : change any file
- `Edit(src/*)` : edit only src directory
- `WriteFile:*` : write any file
- `DeleteFile:*` : delete any file

**Bash Operations:**
- `Bash:*` : all shell commands (risky—use rarely)
- `Bash(ls *)` : only `ls` command
- `Bash(git commit:*)` : git commit with any message
- `Bash(npm install)` : only npm install
- `Bash(npm *)` : any npm command

**Search Operations:**
- `Grep` : search files
- `Glob` : pattern matching

**Tool Permission Rules:**
1. **Allow patterns:** `ToolName` (all actions) or `ToolName(filter)` (specific actions)
2. **Deny rules override:** Deny rules stack on top of allow rules; Claude walks the list first-to-last
3. **Effect:** When allowed-tools defined, Claude can only use specified tools within that skill context

**Example: Code Review Skill**
```yaml
allowed-tools: Read, Grep, Glob
```
This skill provides code review capability but cannot edit files, run commands, or make modifications.

**Source:** Official Claude documentation (docs.claude.com/en/docs/claude-code/skills) and allowed-tools documentation

---

### API Integration: /v1/skills Endpoint

The Claude API provides programmatic skill management through the `/v1/skills` endpoint.

**Required Headers:**
```
x-api-key: your-api-key
anthropic-version: 2023-06-01
anthropic-beta: skills-2025-10-02
```

**List Skills Endpoint:**
```
GET https://api.anthropic.com/v1/skills
```

**Query Parameters:**
- `limit` (integer, 1-100, default 20): Results per page
- `page_token` (string): Pagination token for next page
- `source` (string): Filter skills by source

**Response Structure:**
```json
{
  "data": [
    {
      "id": "skill-id",
      "name": "Skill Name",
      "description": "Skill description",
      "created_at": "2025-10-16T00:00:00Z",
      "versions": [...]
    }
  ],
  "has_more": true,
  "next_page": "pagination-token"
}
```

**Skill Versioning:**
```
GET https://api.anthropic.com/v1/skills/{skill_id}/versions
```

Returns paginated list of skill versions with:
- Version number
- Created timestamp
- Description
- Version-specific metadata

**Integration Requirements:**
- Enable Code Execution Tool beta in API requests
- Claude Console web UI provides skill creation, versioning, and management interface

**API Availability:** Developers get programmatic control over skill versioning and team distribution through the API.

**Source:** Claude API documentation (docs.claude.com/en/api/skills/)

---

### Skills in the Messages API

Skills can be added directly to Messages API requests to customize Claude's behavior for specific API calls.

**Usage Pattern:**
```python
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "You are a helpful assistant"
        },
        {
            "type": "skills",
            "skills": [
                {
                    "name": "excel-skill",
                    "id": "skill-excel-v1"
                }
            ]
        }
    ],
    messages=[...]
)
```

**Configuration Options:**
- Specify skill by name or ID
- Include version for specific versions
- Stack multiple skills for complex tasks
- Available across all API tiers (Pro, Team, Enterprise)

**Source:** Anthropic API documentation

---

### File Structure and Content Examples

**Example 1: Basic Skill**
```
excel-helper/
├── SKILL.md
```

**SKILL.md:**
```yaml
---
name: Excel Helper
description: Create and manipulate Excel spreadsheets. Use when working with .xlsx files or spreadsheet data.
---

# Excel Helper

## How to Use

When working with Excel files:
1. Use Python with the openpyxl library
2. Load workbooks with load_workbook()
3. Access sheets by name or index
4. Save with workbook.save()

## Common Tasks

### Creating a Pivot Table
Use the PivotTable class from openpyxl.pivot.table

### Adding Formulas
```python
ws['A1'] = '=SUM(B1:B10)'
```

## Examples

See examples.md for detailed usage patterns.
```

**Example 2: Advanced Skill with Supporting Files**
```
pdf-processing/
├── SKILL.md
├── reference.md
├── examples.md
└── scripts/
    ├── fill_forms.py
    ├── extract_text.py
    └── merge_pdfs.py
```

**SKILL.md (excerpt):**
```yaml
---
name: PDF Processing
description: Create, fill, merge, and extract from PDF documents. Use when working with .pdf files or forms.
allowed-tools: Read, Bash
---

# PDF Processing

## Fillable PDF Forms

Use the fill_forms.py script to populate form fields:

```bash
python /path/to/fill_forms.py --input form.pdf --data '{"field1": "value"}' --output filled.pdf
```

See fill_forms.py for implementation details.

For complex PDF manipulation, see reference.md.
```

**Example 3: Community Skill (from superpowers library)**
```
claude-code-patterns/
├── SKILL.md
├── patterns/
│   ├── error-handling.md
│   ├── testing.md
│   └── performance.md
└── templates/
    ├── test-template.ts
    └── error-handler.ts
```

**Source:** simonwillison.net/2025/Oct/10/claude-skills/, GitHub repositories (simonw/claude-skills, obra/superpowers)

---

### Best Practices for Creating Skills

**1. Description Field is Critical**
- Must clearly state what the skill does
- Must specify when Claude should use it
- Include example file types or task descriptions
- Examples: "Excel files", ".xlsx files", "spreadsheet data", "pivot tables"
- Poor: "Helper skill"
- Good: "Create and manipulate Excel spreadsheets with formulas, pivot tables, and charts. Use when working with .xlsx files or spreadsheet data."

**2. File Organization**
- Keep SKILL.md focused and well-structured
- Split large documentation into `reference.md`, `examples.md`, `advanced.md`
- Use relative links between files: `[See advanced patterns](reference.md)`
- Group scripts by functionality in subdirectories

**3. Referenceable Scripts**
- Include pre-written scripts for deterministic operations
- Better to execute scripts than generate complex code
- Document script usage clearly in SKILL.md
- Include usage examples with arguments and expected output

**4. Progressive Documentation**
- SKILL.md: High-level overview and most common use cases
- reference.md: Detailed API reference and less common patterns
- examples.md: Concrete copy-paste examples
- advanced.md: Edge cases and complex scenarios (optional)

**5. Tool Restrictions**
- Use `allowed-tools` to prevent unintended operations
- Read-only skill? Restrict to `Read, Grep, Glob`
- Code generation skill? Restrict to `Edit(src/*), Bash(npm *)`
- Security-sensitive? Explicitly list allowed operations

**6. Version History**
- Document versions in SKILL.md with dates and changes
- Include breaking changes clearly
- Maintain backward compatibility when possible
- Example format:
  ```
  ## Version History
  - v1.2 (2025-10-16): Added pivot table support
  - v1.1 (2025-10-10): Added formula validation
  - v1.0 (2025-10-01): Initial release
  ```

**7. Skill Dependencies**
- Document required libraries (openpyxl, pypdf, etc.)
- Specify Python version requirements
- Note external tool dependencies (jq, git, etc.)
- Mention skills that work well together

**8. Testing and Validation**
- Include example workflows that demonstrate the skill
- Provide sample inputs and expected outputs
- Test with various edge cases
- Document known limitations

**Source:** Analysis of official documentation, community examples, and Anthropic best practices

---

### Integration with Claude Code Workflows

**Skill Discovery:**
1. At session start, Claude loads skill metadata (names + descriptions) into system prompt
2. During task execution, Claude determines if skill is relevant
3. If relevant, Claude loads full SKILL.md documentation
4. Claude then invokes supporting files/scripts as needed

**Workflow Integration Pattern:**
```
User Request
  ↓
Claude evaluates available skills
  ↓
If relevant skill exists:
  - Load SKILL.md into context
  - Execute recommended approach
  - Use bundled scripts where appropriate
  - Reference supporting files
  ↓
Else:
  - Handle without skill
  ↓
Deliver result
```

**Combining with Commands:**
- **Skills**: Provide expertise when Claude recognizes relevance
- **Commands**: Give Claude explicit workflow steps via `/skill-command`
- Together: Commands can invoke skills, skills can enhance command capabilities

**Combining with Hooks:**
- **Skills**: Provide knowledge during execution
- **Hooks**: Enforce policies/validation around execution
- Together: Hooks can validate skill usage, skills can provide supporting knowledge

**Combining with Sub-agents:**
- **Skills**: Provide shared expertise for main agent and sub-agents
- **Sub-agents**: Delegate complex tasks with isolated context
- Together: Sub-agent uses skills for specialized subtasks

**Team Workflows:**
1. Create skills in `.claude/skills/` directory
2. Commit to version control
3. Team members get skills automatically
4. Centralize best practices and patterns
5. Update skills; all team members get updates on next session

**Example: Multi-Skill Workflow**
```
Task: "Generate quarterly reports with Excel analysis, charts, and PDF export"

Skill Stack (Claude auto-invokes):
1. Excel skill: Create spreadsheet with data analysis
2. PowerPoint skill: Generate chart visuals
3. PDF skill: Export formatted report as PDF

Each skill provides needed expertise; Claude orchestrates coordination.
```

**Source:** Official Claude documentation and engineering articles

---

### Availability and Pricing

**User Plans:**
- **Pro**: Included at no additional cost
- **Max**: Included at no additional cost
- **Team**: Included at no additional cost
- **Enterprise**: Included at no additional cost

**API Users:**
- Standard Claude API pricing applies
- `/v1/skills` endpoint calls included in API usage
- Skill versioning and management included

**Requirements:**
- Code Execution Tool beta must be enabled (required for skill execution)
- Pro or higher plan (Pro, Max, Team, Enterprise)
- Claude Code or Claude API access

**Availability Timeline:**
- Announced: October 16, 2025
- Status: Generally available on Claude.ai, Claude Code, and API

**Source:** Official Anthropic pricing and availability documentation

---

## Recommendation

**For cc-track and similar projects:**

**Short term (research phase):**
- Monitor skills marketplace at anthropics/skills for community patterns
- Review Anthropic-provided skills (xlsx, pdf, etc.) to understand best practices
- Consider how existing patterns could be better served as skills

**Medium term (if applicable):**
- If cc-track commands/hooks become standardized patterns worth reusing, consider packaging as community skills
- Skills are not a replacement for cc-track's spec-driven workflow commands
- Skills complement existing architecture by providing domain expertise Claude can autonomously discover

**Key insight for comparison:**
- **cc-track commands/hooks:** Enforce workflow structure and quality (deliberate, structured, validation-focused)
- **Claude Skills:** Enable autonomous expertise discovery (opportunistic, capability-focused, minimal friction)
- These are orthogonal concerns—skills enhance Claude's baseline capabilities, while cc-track's system enforces development discipline

**When skills become relevant:**
1. When standardized expertise gets packaged for team reuse
2. When autonomous capability discovery adds value over explicit commands
3. When patterns are stable and widely applicable across projects
4. When reducing token usage via progressive disclosure matters for cost/performance

**Not currently applicable because:**
- cc-track's value is workflow enforcement and quality assurance (opposite of autonomous discovery)
- Commands and hooks are deliberately explicit to guide Claude through structured workflow
- Skills would work well *alongside* cc-track, not replacing it

## Implementation Notes

**Skill Creation Process:**
1. Create directory: `~/.claude/skills/skill-name/`
2. Create SKILL.md with required frontmatter (name, description)
3. Add instructions, examples, and references
4. Create scripts/ subdirectory for executable utilities
5. Test by requesting Claude to use the skill
6. Version control for team sharing

**Common Gotchas:**
- **Description field is critical**: Claude's skill discovery depends entirely on quality descriptions
- **Progressive disclosure requires file access**: Skills work best with Code Execution Tool enabled
- **Tool restrictions are Claude Code specific**: `allowed-tools` only works in Claude Code, not API or Claude.ai
- **Skill discovery is autonomous**: Claude may not use even relevant skills if descriptions don't clearly indicate when to use them
- **Files must be readable**: Scripts and supporting files must have correct permissions and be readable by Claude's execution environment

**Debugging:**
- Check skill SKILL.md syntax (YAML frontmatter must be valid)
- Verify skill description clearly indicates when Claude should use it
- Test skill discovery by explicitly asking Claude to use specific skill
- Review allowed-tools restrictions if skill seems limited in capabilities
- Check file permissions if scripts cannot be executed

## References

- Official Claude Skills announcement: https://www.anthropic.com/news/skills
- Claude documentation - Skills: https://docs.claude.com/en/docs/claude-code/skills
- Claude API - Skills endpoint: https://docs.claude.com/en/api/skills/
- Anthropic engineering article: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- Simon Willison's analysis: https://simonwillison.net/2025/Oct/10/claude-skills/
- GitHub: simonw/claude-skills (official skill examples)
- GitHub: obra/superpowers (community skill library)
- VentureBeat article on Skills: https://venturebeat.com/ai/how-anthropics-skills-make-claude-faster-cheaper-and-more-consistent-for
