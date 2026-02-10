export interface RegisteredGroup {
  name: string;
  folder: string;
  trigger: string;
  added_at: string;
  timeout?: number; // Agent timeout in ms. Default: 300000 (5 minutes)
  requiresTrigger?: boolean; // Default: true for groups, false for solo chats
}

export interface NewMessage {
  id: string;
  chat_jid: string;
  sender: string;
  sender_name: string;
  content: string;
  timestamp: string;
}

export interface ScheduledTask {
  id: string;
  group_folder: string;
  chat_jid: string;
  prompt: string;
  schedule_type: 'cron' | 'interval' | 'once';
  schedule_value: string;
  context_mode: 'group' | 'isolated';
  next_run: string | null;
  last_run: string | null;
  last_result: string | null;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
}

export interface TaskRunLog {
  task_id: string;
  run_at: string;
  duration_ms: number;
  status: 'success' | 'error';
  result: string | null;
  error: string | null;
}

export type MemoryScope = 'global' | 'channel' | 'user';

export type MemoryType = 'preference' | 'fact' | 'tool_state';

export interface MemoryItem {
  id: string;
  scope: MemoryScope;
  scope_key: string | null;
  type: MemoryType;
  content: string;
  source: string | null;
  importance: number;
  created_at: string;
  updated_at: string;
  ttl_seconds: number | null;
}
