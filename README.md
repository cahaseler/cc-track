# cc-pars

Claude Code - Plan, Analyze, Refine, Succeed: A comprehensive context management and workflow optimization system for Claude Code.

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd cc-pars

# Install dependencies
bun install

# Initialize cc-pars in your project
bun run init
```

## Development

### TypeScript and Code Quality

This project uses TypeScript with strict type checking and Biome for linting and formatting.

#### Available Scripts

```bash
# Type checking only
bun run typecheck

# Linting only
bun run lint

# Format code
bun run format

# Fix linting issues automatically
bun run fix

# Run both type checking and linting
bun run check
```

#### TypeScript Configuration

The project uses strict TypeScript settings for maximum type safety:
- All strict mode flags enabled
- No implicit `any` types allowed
- Unused variables and parameters flagged
- No implicit returns

See `tsconfig.json` for full configuration.

#### Linting with Biome

Biome provides fast, modern linting and formatting:
- ESLint + Prettier replacement
- Bun-optimized performance
- Automatic import organization
- Consistent code style enforcement

See `biome.json` for linting rules.

### Project Structure

```
cc-pars/
├── .claude/          # Project context and state
│   ├── hooks/        # Claude Code event handlers
│   ├── lib/          # Shared utilities
│   ├── scripts/      # CLI scripts
│   └── *.md          # Context documentation
├── commands/         # Slash commands for Claude Code
├── docs/            # Research and documentation
└── templates/       # Project templates
```

## Features

- **Context Management**: Preserves critical context through compaction cycles
- **Task Tracking**: Captures plans and manages active tasks
- **Quality Assurance**: Automated code review with deviation detection
- **Developer Experience**: Custom status line with cost tracking

## Contributing

1. Run `bun run check` before committing to ensure code quality
2. Fix any TypeScript or linting errors
3. Follow existing code patterns and conventions
4. Update documentation as needed

## License

[License information to be added]