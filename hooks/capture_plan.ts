#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { createLogger } from '../.claude/lib/logger';

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    plan: string;
  };
  tool_response?: {
    success?: boolean;
    [key: string]: any;
  };
}

interface HookOutput {
  continue?: boolean;
  suppressOutput?: boolean;
  systemMessage?: string;
}

async function main() {
  const logger = createLogger('capture_plan');
  
  try {
    // Read input from stdin
    const input = await Bun.stdin.text();
    const data: HookInput = JSON.parse(input);
    
    logger.debug('Hook triggered', { 
      session_id: data.session_id,
      hook_event: data.hook_event_name,
      tool_name: data.tool_name,
      has_tool_response: !!data.tool_response,
      tool_response: data.tool_response
    });
    
    // PostToolUse hook - check if the plan was approved
    if (data.hook_event_name === 'PostToolUse') {
      // Check if the tool execution was successful (plan approved)
      if (!data.tool_response?.success) {
        // Plan was rejected - don't create task
        logger.info('Plan was not approved, skipping task creation', {
          tool_response: data.tool_response
        });
        process.exit(0);
      }
      logger.info('Plan was approved, creating task');
    }
    
    const plan = data.tool_input.plan;
    if (!plan) {
      logger.warn('No plan found in tool input', { tool_input: data.tool_input });
      process.exit(0);
    }
    
    logger.debug('Plan content', { plan_length: plan.length, plan_preview: plan.substring(0, 200) });
    
    // Ensure directories exist
    const projectRoot = data.cwd;
    const claudeDir = join(projectRoot, '.claude');
    const plansDir = join(claudeDir, 'plans');
    const tasksDir = join(claudeDir, 'tasks');
    
    if (!existsSync(plansDir)) {
      mkdirSync(plansDir, { recursive: true });
    }
    if (!existsSync(tasksDir)) {
      mkdirSync(tasksDir, { recursive: true });
    }
    
    // Find the next task number
    const now = new Date();
    let nextNumber = 1;
    
    // Look for existing task files to find the highest number
    if (existsSync(tasksDir)) {
      const files = readdirSync(tasksDir);
      const taskNumbers = files
        .filter(f => f.match(/^TASK_(\d{3})\.md$/))
        .map(f => parseInt(f.match(/^TASK_(\d{3})\.md$/)![1], 10))
        .filter(n => !isNaN(n));
      
      if (taskNumbers.length > 0) {
        nextNumber = Math.max(...taskNumbers) + 1;
      }
    }
    
    // Format as 3-digit padded number
    const taskId = String(nextNumber).padStart(3, '0');
    
    // Save raw plan to plans directory
    const planPath = join(plansDir, `${taskId}.md`);
    writeFileSync(planPath, `# Plan: ${taskId}\n\nCaptured: ${now.toISOString()}\n\n${plan}`);
    
    // Create prompt for Claude to generate the task file
    const enrichmentPrompt = `
Based on the following plan, create a comprehensive task file following the active_task template format.

## The Plan:
${plan}

## Instructions:
1. Extract the task name/title from the plan
2. Set status to "planning"
3. List all requirements as checkboxes
4. Define clear success criteria
5. Identify next steps
6. Note any potential blockers or questions

Create the content for TASK_${taskId}.md following this structure:

# [Task Title]

**Purpose:** [Clear description of what this task accomplishes]

**Status:** planning
**Started:** ${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}
**Task ID:** ${taskId}

## Requirements
[Extract all requirements from the plan as checkboxes]

## Success Criteria
[Define what "done" looks like]

## Technical Approach
[Summary of the technical approach from the plan]

## Current Focus
[What to work on first]

## Open Questions & Blockers
[Any unknowns or blockers]

## Next Steps
[Clear next actions]

Respond with ONLY the markdown content for the task file, no explanations.`;

    // Use Claude CLI to enrich the plan
    // Write prompt to temp file to avoid shell escaping issues
    const tempPromptPath = join(claudeDir, '.temp_prompt.txt');
    writeFileSync(tempPromptPath, enrichmentPrompt);
    
    let taskContent: string;
    try {
      taskContent = execSync(
        `claude --model sonnet --output-format text < "${tempPromptPath}"`,
        { 
          encoding: 'utf-8',
          cwd: '/tmp',  // Run in /tmp to avoid triggering Stop hook recursion
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large responses
          shell: '/bin/bash'
        }
      ).trim();
    } catch (cmdError: any) {
      logger.error('Claude CLI failed', { 
        error: cmdError.message,
        command: 'claude --model sonnet --output-format text',
        cwd: '/tmp'
      });
      throw cmdError;
    } finally {
      // Clean up temp file
      if (existsSync(tempPromptPath)) {
        unlinkSync(tempPromptPath);
      }
    }
    
    // Save the enriched task file in tasks directory
    const taskPath = join(tasksDir, `TASK_${taskId}.md`);
    writeFileSync(taskPath, taskContent);
    
    logger.info('Task file created', { taskId, taskPath });
    
    // Update CLAUDE.md to point to the new task
    const claudeMdPath = join(projectRoot, 'CLAUDE.md');
    if (existsSync(claudeMdPath)) {
      let claudeMd = readFileSync(claudeMdPath, 'utf-8');
      
      // Replace the active task import
      if (claudeMd.includes('@.claude/no_active_task.md')) {
        claudeMd = claudeMd.replace(
          '@.claude/no_active_task.md',
          `@.claude/tasks/TASK_${taskId}.md`
        );
      } else if (claudeMd.match(/@\.claude\/tasks\/TASK_.*?\.md/)) {
        // Replace existing task
        claudeMd = claudeMd.replace(
          /@\.claude\/tasks\/TASK_.*?\.md/,
          `@.claude/tasks/TASK_${taskId}.md`
        );
      }
      
      writeFileSync(claudeMdPath, claudeMd);
    }
    
    // Log to progress log
    const progressLogPath = join(claudeDir, 'progress_log.md');
    if (existsSync(progressLogPath)) {
      const logEntry = `\n[${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}] - Started: Task ${taskId} created from plan\n  Details: Plan captured and enriched\n  Files: ${planPath}, ${taskPath}\n`;
      const currentLog = readFileSync(progressLogPath, 'utf-8');
      writeFileSync(progressLogPath, currentLog + logEntry);
    }
    
    // Return success with a message
    const output: HookOutput = {
      continue: true,
      systemMessage: `✅ Plan captured as task ${taskId}. Task file created and set as active.`
    };
    
    console.log(JSON.stringify(output));
    process.exit(0);
    
  } catch (error) {
    logger.exception('Fatal error in capture_plan hook', error as Error);
    // Don't block on error
    process.exit(0);
  }
}

main();