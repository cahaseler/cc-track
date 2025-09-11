# Repository Guidelines

## Project Structure & Module Organization
- `src/` — TypeScript source:
  - `cli/` entry (`src/cli/index.ts`) builds the CLI binary.
  - `commands/` CLI subcommands (kebab-case files).
  - `hooks/` Claude Code hooks used by the tool.
  - `lib/` shared utilities and helpers.
  - Tests live beside code as `*.test.ts`.
- `dist/` — compiled outputs (CLI at `dist/cc-track`, hooks under `dist/hooks/`).
- `.claude/` — project context, templates, and runtime config (`.claude/track.config.json`).
- `templates/` — files copied by the `init` command.
- `docs/` — additional documentation.

## Build, Test, and Development Commands
- `bun install` — install dependencies.
- `bun run check` — typecheck (`tsc --noEmit`) and lint (Biome).
- `bun test` — run unit tests with Bun’s test runner.
- `bun run build` — compile CLI to `dist/cc-track`.
- `bun run build:hooks` — compile hook executables to `dist/hooks/`.
- Dev run: `bun src/cli/index.ts --help` or `./dist/cc-track --help` after build.
- Formatting: `bun run format` (apply), `bun run lint` (report), `bun run fix` (auto-fix).

## Coding Style & Naming Conventions
- Language: TypeScript (ES modules). Strict mode enabled.
- Indentation: 2 spaces; width 120; single quotes; semicolons; trailing commas (Biome enforced).
- Files: kebab-case for modules (`complete-task.ts`); tests use `*.test.ts`.
- Identifiers: PascalCase for types/classes; camelCase for variables/functions.
- Imports: use `node:` prefix for Node built-ins (e.g., `node:fs`).

## Testing Guidelines
- Framework: `bun:test` (`describe/test/expect/mock`).
- Location: co-located `*.test.ts` next to sources.
- Run: `bun test` (optionally `--coverage`).
- Aim for clear unit tests around `lib/`, hooks, and command behavior.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`; optional scopes.
- In-progress work may use `[wip] TASK_###: ...` to align with task files.
- PRs: include a concise description, linked issues/tasks, CLI output or screenshots if user-facing, and checklist that `bun run check` and `bun test` pass.

## Security & Configuration Tips
- Do not commit local files: `.claude/settings.local.json`, logs (`*.jsonl`), or secrets.
- Primary config is `.claude/track.config.json`; update templates if you change defaults.
- Keep changes minimal and focused; avoid unrelated reformatting.
