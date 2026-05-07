# Using Impeccable Alongside cc-track

[Impeccable](https://impeccable.style/) is a design-fluency skill pack for AI coding harnesses (Claude Code, Cursor, Codex, Gemini). It pairs naturally with cc-track on UI-heavy projects: cc-track owns the workflow (specs, plans, validation, completion), Impeccable owns the design vocabulary (typography, color, layout, motion, anti-patterns) and produces the persistent design context that AI agents follow.

This guide assumes you already have cc-track set up. If not, run `/cc-track:setup-cc-track` first.

---

## When you want this integration

You want Impeccable if **any** of the following apply:

- The project renders a UI (web, native, or otherwise) and you care about visual consistency
- Claude has been improvising its own design system on the fly across sessions
- You want AI-generated UI to stay on brand without re-explaining brand rules every task
- You want a structured design audit (a11y, performance, theming, responsive, anti-patterns) as part of completion checks

For pure backend, library, or CLI projects, skip this — there's nothing for Impeccable to anchor to.

---

## What Impeccable produces

After installation, Impeccable generates two files at the project root:

| File | What it is | Standard |
|---|---|---|
| `PRODUCT.md` | Strategy: register (brand vs product), audience, brand personality, anti-references, principles | Impeccable-specific |
| `DESIGN.md` | Visual system: colors, typography, elevation, components, do's/don'ts | Google Labs' [DESIGN.md](https://github.com/google-labs-code/design.md) format (portable) |

`DESIGN.md` is the artifact other tools can read. `PRODUCT.md` is Impeccable's own control surface (most importantly, the `## Register` field which switches Impeccable's command behavior between `brand` and `product` defaults).

---

## Setup (one-time, after cc-track is initialized)

### 1. Install the Impeccable skill

```bash
npx skills add pbakaus/impeccable
```

This auto-detects your AI harness (Claude Code in our case) and drops the skill into the right location. See the [Impeccable getting-started guide](https://impeccable.style/tutorials/getting-started/) for manual install or other harnesses.

### 2. Generate `PRODUCT.md`

Run inside Claude Code:

```
/impeccable teach
```

Impeccable interviews you about the product (audience, register, personality, anti-references) and writes `PRODUCT.md` at the project root.

### 3. Generate `DESIGN.md`

Pick the variant that matches where you are:

- **Brownfield** (UI code already exists, you want Impeccable to extract its design system):
  ```
  /impeccable document
  ```
- **Greenfield** (no UI code yet, or you want to scaffold a fresh design system):
  ```
  /impeccable document --seed
  ```
  This asks five strategic questions and writes a scaffold marked with `<!-- SEED -->` comments. Re-run without `--seed` once real tokens land in code.

Both variants write `DESIGN.md` (and a `DESIGN.json` sidecar) at the project root.

### 4. Wire `DESIGN.md` into persistent context

Add `@DESIGN.md` (and optionally `@PRODUCT.md`) to the top of `CLAUDE.md` so Claude Code loads them on every session, the same way cc-track imports `system_patterns.md` and `decision_log.md`. Example:

```markdown
# Project: my-app

## Active Task
no_active_task

## Design System
@DESIGN.md

## Product Strategy
@PRODUCT.md

## Product Vision
@.cc-track/product_context.md

...
```

`DESIGN.md` then informs every Claude turn in the project, not just Impeccable's own commands.

---

## Where Impeccable plugs into the cc-track workflow

cc-track's stages don't change. Impeccable's commands become discretionary tools you reach for at specific moments.

### During `/cc-track:specify`

No change. Specs stay tech-agnostic — describe UI requirements in user-facing terms ("a clear empty state", "primary action prominent") rather than in design-token terms.

### During `/cc-track:plan`

For UI-touching features, before drafting `plan.md`, run one of:

- **`/impeccable craft`** — design-aware composition for a new surface
- **`/impeccable shape`** — when you have a rough shape and want it tightened against the design system

The output informs `plan.md`'s component, layout, and styling decisions. `plan.md` should reference DESIGN.md tokens (e.g., "uses `--color-primary`, `--space-4`") rather than reinventing values.

If `DESIGN.md` exists at the project root and the spec touches UI, the `/cc-track:plan` command will surface this suggestion automatically.

### During implementation

Reach for Impeccable's refinement commands as needed:

| Concern | Command |
|---|---|
| Typography | `/impeccable typeset` |
| Color | `/impeccable colorize` |
| Layout | `/impeccable layout` |
| Motion | `/impeccable animate` |
| Polish pass | `/impeccable polish` |
| Reduce visual noise | `/impeccable quieter` / `/distill` |
| Increase emphasis | `/impeccable bolder` / `/overdrive` |

These are tools, not steps — use them when a specific concern arises.

### During `/cc-track:prepare-completion`

For UI-touching changes, after validation passes, run both:

- **`/impeccable audit`** — technical quality (a11y, performance, theming, responsive, anti-patterns) scored 0–4 per dimension with **P0–P3 severity**
- **`/impeccable critique`** — subjective design quality ("does this feel right")

Findings flow into cc-track's existing `/cc-track:fix-issues` triage naturally — Impeccable's P0/P1/P2/P3 maps directly onto Fix / Defer / Dismiss / Discuss decisions, with **P0 = blocks release** matching cc-track's score-100 issues. No new triage UX needed.

If `DESIGN.md` exists at the project root and the changed files include UI assets, the `/cc-track:prepare-completion` command will surface this suggestion automatically.

---

## File-layout reference

After integration, expect the following at project root:

```
my-project/
├── CLAUDE.md                  # cc-track + @DESIGN.md / @PRODUCT.md imports
├── DESIGN.md                  # Impeccable / Google Stitch format (portable)
├── DESIGN.json                # Impeccable sidecar (machine-readable tokens)
├── PRODUCT.md                 # Impeccable-specific strategy file
├── .cc-track/                 # cc-track context, specs, config
│   ├── specs/
│   ├── product_context.md
│   ├── decision_log.md
│   └── ...
├── .claude/                   # Impeccable skill files land here per harness
│   └── skills/impeccable/...
└── (your code)
```

cc-track and Impeccable own different directories — there is no overlap or conflict. The only shared touchpoint is `CLAUDE.md` (where you import both sets of context).

---

## Going further

- The standalone `npx impeccable detect <path|url>` CLI runs anti-pattern detection non-interactively. You could wire it into a pre-commit hook or CI step independent of Claude.
- If you stop using Impeccable, `DESIGN.md` remains valuable — it's a portable format other AI tools (Cursor, Copilot, Stitch) understand. `PRODUCT.md` is Impeccable-coupled and would need re-expression elsewhere.

## Sources

- [Impeccable docs](https://impeccable.style/docs/impeccable/)
- [Impeccable: /teach](https://impeccable.style/docs/teach/)
- [Impeccable: /document](https://impeccable.style/docs/document/)
- [Impeccable: /audit](https://impeccable.style/docs/audit/)
- [Impeccable: getting started](https://impeccable.style/tutorials/getting-started/)
- [Impeccable on GitHub](https://github.com/pbakaus/impeccable)
- [DESIGN.md specification (Google Labs)](https://github.com/google-labs-code/design.md)
