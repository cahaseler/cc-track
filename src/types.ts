// Shared type definitions for cc-track

export interface HookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: any;
  tool_response?: any;
  tool_use_error?: string;
  user_message?: string;
  assistant_message?: string;
  [key: string]: unknown;
}

export interface HookOutput {
  continue?: boolean;
  suppressOutput?: boolean;
  systemMessage?: string;
  error?: string;
  success?: boolean;
  message?: string;
}

export interface TaskContent {
  number: string;
  title: string;
  content: string;
  requirements?: string[];
  acceptanceCriteria?: string[];
}

export interface GitHubIssue {
  number: number;
  url: string;
  title: string;
  state: string;
}

export interface ConfigFeatures {
  capture_plan?: boolean;
  pre_compact?: boolean;
  post_compact?: boolean;
  stop_review?: boolean;
  edit_validation?: boolean;
  git_integration?: boolean;
  github_integration?: {
    enabled?: boolean;
    description?: string;
    auto_create_issues?: boolean;
    use_issue_branches?: boolean;
    auto_create_prs?: boolean;
    repository_url?: string;
  };
  api_timer?: {
    enabled?: boolean;
    display?: 'hide' | 'show' | 'sonnet-only';
  };
  logging?: {
    enabled?: boolean;
    level?: 'debug' | 'info' | 'warn' | 'error';
    retention_days?: number;
  };
}

export interface Config {
  features?: ConfigFeatures;
  project_root?: string;
}