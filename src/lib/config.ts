import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ValidationConfig {
  enabled: boolean;
  command: string;
}

export interface LintConfig extends ValidationConfig {
  tool?: 'biome' | 'eslint' | 'custom';
  autoFixCommand?: string;
  customParser?: string;
}

export interface EditValidationConfig extends HookConfig {
  typecheck?: ValidationConfig;
  lint?: ValidationConfig | LintConfig;
  knip?: ValidationConfig;
}

interface HookConfig {
  enabled: boolean;
  description: string;
  display?: string;
  auto_create_issues?: boolean;
  use_issue_branches?: boolean;
  auto_create_prs?: boolean;
  repository_url?: string;
  protected_branches?: string[];
  allow_gitignored?: boolean;
}

export interface CodeReviewConfig extends HookConfig {
  tool?: 'claude' | 'coderabbit';
}

interface GitConfig {
  defaultBranch?: string;
  description?: string;
}

interface LoggingConfig {
  enabled: boolean;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  retentionDays: number;
  prettyPrint: boolean;
  directory?: string;
  description?: string;
}

interface InternalConfig {
  hooks: {
    [key: string]: HookConfig | EditValidationConfig;
  };
  features: {
    [key: string]: HookConfig | CodeReviewConfig;
  };
  git?: GitConfig;
  logging?: LoggingConfig;
}

const DEFAULT_CONFIG: InternalConfig = {
  logging: {
    enabled: true,
    level: 'INFO',
    retentionDays: 7,
    prettyPrint: false,
    description: 'Centralized logging system for debugging and monitoring',
  },
  hooks: {
    capture_plan: {
      enabled: true,
      description: 'Captures plans from ExitPlanMode and creates task files',
    },
    pre_compact: {
      enabled: true,
      description: 'Updates task files with progress before compaction',
    },
    stop_review: {
      enabled: true,
      description: 'Reviews changes and auto-commits with conventional format',
    },
    edit_validation: {
      enabled: false,
      description: 'Runs TypeScript and lint checks on edited files',
      typecheck: {
        enabled: true,
        command: 'bunx tsc --noEmit',
      },
      lint: {
        enabled: true,
        tool: 'biome' as const,
        command: 'bunx biome check',
        autoFixCommand: 'bunx biome check --write',
      },
    },
    pre_tool_validation: {
      enabled: true,
      description: 'Pre-tool validation for task files and branch protection',
    },
  },
  features: {
    statusline: {
      enabled: true,
      description: 'Custom status line showing costs and task info',
    },
    git_branching: {
      enabled: false,
      description: 'Create feature branches for tasks and merge on completion',
    },
    api_timer: {
      enabled: true,
      description: 'Display API window reset timer in statusline',
      display: 'sonnet-only',
    },
    github_integration: {
      enabled: false,
      description: 'Integrate with GitHub for issue tracking and PR workflow',
      auto_create_issues: true,
      use_issue_branches: true,
      auto_create_prs: true,
      repository_url: '',
    },
    private_journal: {
      enabled: false,
      description: 'Use private journal MCP for context preservation and learning',
    },
    branch_protection: {
      enabled: false,
      description: 'Block edits on protected branches to enforce feature branch workflow',
      protected_branches: ['main', 'master'],
      allow_gitignored: true,
    },
    code_review: {
      enabled: false,
      description: 'Run comprehensive code review before task completion',
      tool: 'claude' as const,
    },
  },
};

let configCache: InternalConfig | null = null;

export function getConfigPath(startPath?: string): string {
  let currentPath = startPath || process.cwd();

  while (currentPath !== '/') {
    const configPath = join(currentPath, '.claude', 'track.config.json');
    if (existsSync(configPath)) {
      return configPath;
    }
    currentPath = join(currentPath, '..');
  }

  return join(startPath || process.cwd(), '.claude', 'track.config.json');
}

export function getConfig(configPath?: string): InternalConfig {
  if (configCache && !configPath) {
    return configCache;
  }

  const path = configPath || getConfigPath();

  if (!existsSync(path)) {
    return DEFAULT_CONFIG;
  }

  try {
    const configContent = readFileSync(path, 'utf-8');
    const config = JSON.parse(configContent);
    if (!configPath) {
      configCache = config;
    }
    return config || DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error reading config file:', error);
    return DEFAULT_CONFIG;
  }
}

export function isHookEnabled(hookName: string, configPath?: string): boolean {
  const config = getConfig(configPath);

  if (config.hooks?.[hookName]) {
    return config.hooks[hookName].enabled;
  }

  if (config.features?.[hookName]) {
    return config.features[hookName].enabled;
  }

  return true;
}

export function updateConfig(updates: Partial<InternalConfig>, configPath?: string): void {
  const path = configPath || getConfigPath();
  const currentConfig = getConfig(path);

  const newConfig = {
    ...currentConfig,
    hooks: {
      ...currentConfig.hooks,
      ...(updates.hooks || {}),
    },
    features: {
      ...currentConfig.features,
      ...(updates.features || {}),
    },
  };

  writeFileSync(path, JSON.stringify(newConfig, null, 2));

  if (!configPath) {
    configCache = null;
  }
}

export function setHookEnabled(hookName: string, enabled: boolean, configPath?: string): void {
  const config = getConfig(configPath);

  if (config.hooks?.[hookName]) {
    updateConfig(
      {
        hooks: {
          ...config.hooks,
          [hookName]: {
            ...config.hooks[hookName],
            enabled,
          },
        },
      },
      configPath,
    );
  } else if (config.features?.[hookName]) {
    updateConfig(
      {
        features: {
          ...config.features,
          [hookName]: {
            ...config.features[hookName],
            enabled,
          },
        },
      },
      configPath,
    );
  }
}

export function getGitHubConfig(configPath?: string): HookConfig | null {
  const config = getConfig(configPath);
  return config.features?.github_integration || null;
}

export function isGitHubIntegrationEnabled(configPath?: string): boolean {
  const githubConfig = getGitHubConfig(configPath);
  return githubConfig?.enabled || false;
}

export function getCodeReviewConfig(configPath?: string): CodeReviewConfig | null {
  const config = getConfig(configPath);
  return (config.features?.code_review as CodeReviewConfig) || null;
}

export function isCodeReviewEnabled(configPath?: string): boolean {
  const codeReviewConfig = getCodeReviewConfig(configPath);
  return codeReviewConfig?.enabled || false;
}

export function getCodeReviewTool(configPath?: string): 'claude' | 'coderabbit' {
  const codeReviewConfig = getCodeReviewConfig(configPath);
  return codeReviewConfig?.tool || 'claude';
}

export function getGitConfig(configPath?: string): GitConfig | null {
  const config = getConfig(configPath);
  return config.git || null;
}

export function getLoggingConfig(configPath?: string): LoggingConfig {
  const config = getConfig(configPath);
  // DEFAULT_CONFIG.logging is always defined, so this is safe
  return config.logging || (DEFAULT_CONFIG.logging as LoggingConfig);
}

export function clearConfigCache(): void {
  configCache = null;
}

export function getLintConfig(configPath?: string): LintConfig | null {
  const config = getConfig(configPath);
  const editValidation = config.hooks?.edit_validation as EditValidationConfig | undefined;
  const lintConfig = editValidation?.lint;

  if (!lintConfig) {
    return null;
  }

  return lintConfig as LintConfig;
}
