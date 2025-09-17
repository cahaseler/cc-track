# Linting Configuration

cc-track now supports multiple linting tools with built-in parsers for Biome and ESLint, plus support for custom tools.

## Configuration

In your `.claude/track.config.json`, configure the lint settings under `hooks.edit_validation.lint`:

### Biome (Default)

```json
{
  "hooks": {
    "edit_validation": {
      "lint": {
        "enabled": true,
        "tool": "biome",
        "command": "bunx biome check",
        "autoFixCommand": "bunx biome check --write"
      }
    }
  }
}
```

### ESLint

```json
{
  "hooks": {
    "edit_validation": {
      "lint": {
        "enabled": true,
        "tool": "eslint",
        "command": "npx eslint",
        "autoFixCommand": "npx eslint --fix"
      }
    }
  }
}
```

### Custom Linter

For other linters, use the "custom" tool type:

```json
{
  "hooks": {
    "edit_validation": {
      "lint": {
        "enabled": true,
        "tool": "custom",
        "command": "your-linter-command",
        "autoFixCommand": "your-linter-command --fix"
      }
    }
  }
}
```

## Fields

- **`tool`**: The linter type - `"biome"`, `"eslint"`, or `"custom"`
- **`command`**: The command to run for linting
- **`autoFixCommand`**: (Optional) Command to automatically fix issues
- **`customParser`**: (Future) Path to a custom parser module

## Backward Compatibility

If your configuration doesn't specify a `tool` field, cc-track automatically assumes Biome for backward compatibility. Existing configurations will continue to work without changes.

## Output Parsing

Each linter has a specialized parser:

- **Biome**: Parses diagnostic counts and compact format output
- **ESLint**: Parses stylish and compact format output, extracts error/warning counts
- **Custom**: Generic line-based error matching

The parsers automatically extract:
- Error messages with line numbers
- Total issue counts
- File-specific errors for validation

## Integration Points

The lint configuration is used by:
- **Edit validation hook**: Real-time validation as you edit files
- **Prepare-completion command**: Pre-completion validation checks
- **Complete-task command**: Final validation before task completion

## Auto-Fix Support

When `autoFixCommand` is configured:
1. The validation system attempts to auto-fix issues before checking
2. If auto-fix fails (e.g., syntax errors), validation continues
3. The prepare-completion command shows tool-specific fix advice