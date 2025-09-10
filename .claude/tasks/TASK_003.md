# Git-Based Deviation Detection System

**Purpose:** Implement automatic git commits at every Stop hook to create clean checkpoints of actual changes, enabling easy deviation detection and recovery

**Status:** planning
**Started:** 2025-09-10 20:35
**Task ID:** 003

## Requirements
- [ ] Create Stop Hook for Auto-commits
  - [ ] Detect if in git repository (initialize if not)
  - [ ] Stage all changes
  - [ ] Commit with structured message including task ID
  - [ ] Include timestamp and change summary
- [ ] Add Deviation Detection
  - [ ] Read current active task requirements
  - [ ] Diff recent changes against last user interaction
  - [ ] Use Claude CLI to evaluate if changes align with task
  - [ ] Generate warning if deviation detected
- [ ] Create Pre-push Migration Guide
  - [ ] Document how to move pre-commit hooks to pre-push
  - [ ] Provide script to automate the migration
  - [ ] Maintain quality gates while allowing dirty commits
- [ ] Add Git Utilities
  - [ ] Create reset utility to revert to last commit before current work session
  - [ ] Create squash utility to combine all commits since last user message
  - [ ] Create show utility to display diff with task alignment analysis
- [ ] Update Settings Template
  - [ ] Add Stop hook configuration
  - [ ] Make it opt-in initially with clear documentation
  - [ ] Include examples for different validation levels
- [ ] Integrate with Task System
  - [ ] Tag commits with active task ID
  - [ ] Link commits to progress_log.md entries
  - [ ] Auto-update task status based on completion detection

## Success Criteria
- Automatic git commits occur at configured Stop events without blocking workflow
- Deviations from task requirements are detected and reported accurately
- Pre-commit hooks can be migrated to pre-push without losing validation
- Git utilities provide easy recovery from deviations
- System integrates seamlessly with existing task tracking
- Configuration allows flexible control over commit frequency and validation levels

## Technical Approach
Build a Stop hook that automatically commits changes to git, creating checkpoints for deviation detection. Use git diff and Claude CLI to analyze whether changes align with active task requirements. Provide utilities for managing the git history created by frequent commits. Make the system configurable and opt-in to avoid disrupting existing workflows.

## Current Focus
Create the basic Stop hook implementation with auto-commit functionality

## Open Questions & Blockers
- Should auto-commits be enabled by default or require explicit opt-in?
- How to handle uncommitted changes when Stop hook runs?
- What validation level should be default: none, basic, or full?
- How to avoid conflicts with existing pre-commit hooks?

## Next Steps
1. Implement basic Stop hook with git detection and initialization
2. Test auto-commit functionality with simple changes
3. Add structured commit message generation with task ID
4. Create deviation detection logic using git diff