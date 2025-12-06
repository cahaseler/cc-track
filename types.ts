// Shared type definitions for cc-track

export interface HookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_response?: unknown;
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
  decision?: 'block' | 'allow' | undefined;
  reason?: string;
  hookSpecificOutput?: {
    hookEventName: string;
    additionalContext?: string;
    // PreToolUse specific fields
    permissionDecision?: 'allow' | 'deny' | 'ask';
    permissionDecisionReason?: string;
  };
}

export interface GitHubIssue {
  number: number;
  url: string;
  title: string;
  state: string;
  body?: string;
  labels?: Array<{ name: string }>;
  assignees?: Array<{ login: string }>;
  milestone?: { title: string };
}
