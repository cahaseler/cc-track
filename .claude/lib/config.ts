import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface HookConfig {
  enabled: boolean;
  description: string;
  typecheck?: {
    enabled: boolean;
    command: string;
  };
  lint?: {
    enabled: boolean;
    command: string;
  };
}

interface Config {
  hooks: {
    [key: string]: HookConfig;
  };
  features: {
    [key: string]: HookConfig;
  };
}

const DEFAULT_CONFIG: Config = {
  hooks: {
    capture_plan: {
      enabled: true,
      description: 'Captures plans from ExitPlanMode and creates task files',
    },
    pre_compact: {
      enabled: true,
      description: 'Extracts error patterns before compaction',
    },
    post_compact: {
      enabled: true,
      description: 'Restores context after compaction',
    },
    stop_review: {
      enabled: true,
      description: 'Reviews changes and auto-commits with [wip]',
    },
    edit_validation: {
      enabled: false,
      description: 'Runs TypeScript and Biome checks on edited files',
      typecheck: {
        enabled: true,
        command: 'bunx tsc --noEmit',
      },
      lint: {
        enabled: true,
        command: 'bunx biome check',
      },
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
  },
};

let configCache: Config | null = null;

function getConfigPath(): string {
  // Try to find the config file by checking current dir and parent dirs
  let currentPath = process.cwd();

  while (currentPath !== '/') {
    const configPath = join(currentPath, '.claude', 'track.config.json');
    if (existsSync(configPath)) {
      return configPath;
    }
    // Move up one directory
    currentPath = join(currentPath, '..');
  }

  // Default to current working directory
  return join(process.cwd(), '.claude', 'track.config.json');
}

export function getConfig(): Config {
  if (configCache) {
    return configCache;
  }

  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    // Return default config if file doesn't exist
    return DEFAULT_CONFIG;
  }

  try {
    const configContent = readFileSync(configPath, 'utf-8');
    configCache = JSON.parse(configContent);
    return configCache || DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error reading config file:', error);
    return DEFAULT_CONFIG;
  }
}

export function isHookEnabled(hookName: string): boolean {
  const config = getConfig();

  // Check in hooks section
  if (config.hooks?.[hookName]) {
    return config.hooks[hookName].enabled;
  }

  // Check in features section
  if (config.features?.[hookName]) {
    return config.features[hookName].enabled;
  }

  // Default to enabled if not found
  return true;
}

export function updateConfig(updates: Partial<Config>): void {
  const configPath = getConfigPath();
  const currentConfig = getConfig();

  // Merge updates with current config
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

  // Write the updated config
  writeFileSync(configPath, JSON.stringify(newConfig, null, 2));

  // Clear cache
  configCache = null;
}

export function setHookEnabled(hookName: string, enabled: boolean): void {
  const config = getConfig();

  // Determine if it's a hook or feature
  if (config.hooks?.[hookName]) {
    updateConfig({
      hooks: {
        ...config.hooks,
        [hookName]: {
          ...config.hooks[hookName],
          enabled,
        },
      },
    });
  } else if (config.features?.[hookName]) {
    updateConfig({
      features: {
        ...config.features,
        [hookName]: {
          ...config.features[hookName],
          enabled,
        },
      },
    });
  }
}
