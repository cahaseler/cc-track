export interface CodeReviewResult {
  success: boolean;
  review?: string;
  error?: string;
  filePath?: string;
}

export interface CodeReviewOptions {
  taskId: string;
  taskTitle: string;
  taskRequirements: string;
  gitDiff: string;
  projectRoot: string;
  mergeBase?: string;
}

export interface CodeReviewIssue {
  file: string;
  line: number;
  type: 'critical' | 'warning' | 'suggestion' | 'potential_issue';
  comment: string;
  fixPrompt?: string;
  fixCommand?: string;
}

export type CodeReviewTool = 'claude' | 'coderabbit';
