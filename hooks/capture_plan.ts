#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    plan: string;
  };
}

interface HookOutput {
  continue?: boolean;
  suppressOutput?: boolean;
  systemMessage?: string;
}

async function main() {
  try {
    // Read input from stdin
    const input = await Bun.stdin.text();
    const data: HookInput = JSON.parse(input);
    
    const plan = data.tool_input.plan;
    if (!plan) {
      console.error('No plan found in tool input');
      process.exit(0);
    }
    
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
        `claude --output-format text < "${tempPromptPath}"`,
        { 
          encoding: 'utf-8',
          cwd: projectRoot,
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large responses
          shell: '/bin/bash'
        }
      ).trim();
    } catch (cmdError: any) {
      console.error('Claude CLI error:', cmdError.message);
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
    console.error(`Error in capture_plan hook: ${error}`);
    // Don't block on error
    process.exit(0);
  }
}

main();