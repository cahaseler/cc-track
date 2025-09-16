import { Command } from 'commander';
import { embeddedTemplates } from '../lib/embedded-resources';
import type { CommandDeps, CommandResult, PartialCommandDeps } from './context';
import { applyCommandResult, handleCommandException, resolveCommandDeps } from './context';

export type SetupTemplatesDeps = Pick<CommandDeps, 'console' | 'process' | 'fs' | 'path' | 'logger' | 'time'>;

export interface SetupTemplatesResultData {
  targetDir: string;
  created: string[];
  backedUp: string[];
  skipped: string[];
  updatedClaudeMd: boolean;
}

export function runSetupTemplates(deps: SetupTemplatesDeps): CommandResult<SetupTemplatesResultData> {
  const logger = deps.logger('setup-templates');

  try {
    const projectRoot = deps.process.cwd();
    const targetDir = deps.path.join(projectRoot, '.claude');
    const created: string[] = [];
    const backedUp: string[] = [];
    const skipped: string[] = [];
    const messages: string[] = [];

    if (!deps.fs.existsSync(targetDir)) {
      deps.fs.mkdirSync(targetDir, { recursive: true });
      logger.info('Created .claude directory', { targetDir });
      messages.push('✅ Created .claude directory');
    }

    const timestamp = deps.time.now().getTime();

    for (const [filename, content] of Object.entries(embeddedTemplates)) {
      if (filename === 'CLAUDE.md') {
        continue;
      }

      const targetPath = deps.path.join(targetDir, filename);

      if (deps.fs.existsSync(targetPath)) {
        const backupPath = `${targetPath}.backup-${timestamp}`;
        deps.fs.copyFileSync(targetPath, backupPath);
        backedUp.push(backupPath);
        messages.push(`📦 Backed up existing ${filename}`);
      }

      deps.fs.writeFileSync(targetPath, content);
      created.push(filename);
      messages.push(`✅ Created ${filename}`);
    }

    const claudeMdTarget = deps.path.join(projectRoot, 'CLAUDE.md');
    const claudeTemplate = embeddedTemplates['CLAUDE.md'];
    let updatedClaudeMd = false;

    if (claudeTemplate) {
      if (deps.fs.existsSync(claudeMdTarget)) {
        const backupPath = `${claudeMdTarget}.backup-${timestamp}`;
        deps.fs.copyFileSync(claudeMdTarget, backupPath);
        backedUp.push(backupPath);
        messages.push('📦 Backed up existing CLAUDE.md');

        const existingContent = deps.fs.readFileSync(claudeMdTarget, 'utf-8');

        if (!existingContent.includes('## Active Task')) {
          const mergedContent = `${existingContent}\n\n# cc-track Context Management\n\n${claudeTemplate}`;
          deps.fs.writeFileSync(claudeMdTarget, mergedContent);
          updatedClaudeMd = true;
          messages.push('✅ Updated CLAUDE.md');
        } else {
          skipped.push('CLAUDE.md');
          messages.push('ℹ️  CLAUDE.md already has cc-track sections');
        }
      } else {
        deps.fs.writeFileSync(claudeMdTarget, claudeTemplate);
        created.push('CLAUDE.md');
        updatedClaudeMd = true;
        messages.push('✅ Created CLAUDE.md');
      }
    }

    messages.push('');
    messages.push(`📊 Setup complete: ${created.length} files created, ${skipped.length} skipped`);
    messages.push('📝 Templates are ready for Claude to configure!');

    return {
      success: true,
      messages,
      data: {
        targetDir,
        created,
        backedUp,
        skipped,
        updatedClaudeMd,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to set up templates', { error: message });
    return {
      success: false,
      error: `Failed to set up templates: ${message}`,
      exitCode: 1,
    };
  }
}

export function createSetupTemplatesCommand(overrides?: PartialCommandDeps): Command {
  return new Command('setup-templates').description('Copy cc-track templates to your project').action(async () => {
    const deps = resolveCommandDeps(overrides);
    try {
      const result = runSetupTemplates(deps);
      applyCommandResult(result, deps);
    } catch (error) {
      handleCommandException(error, deps);
    }
  });
}

export const setupTemplatesCommand = createSetupTemplatesCommand();
