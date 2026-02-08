/**
 * IPC-based MCP Server for NanoClaw
 * Writes messages and tasks to files for the host process to pick up
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { CronExpressionParser } from 'cron-parser';

export interface IpcMcpContext {
  chatJid: string;
  groupFolder: string;
  isMain: boolean;
  ipcDir: string;
}

export function writeIpcFile(dir: string, data: object): string {
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const filepath = path.join(dir, filename);

  // Atomic write: temp file then rename
  const tempPath = `${filepath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
  fs.renameSync(tempPath, filepath);

  return filename;
}

export function createIpcMcp(ctx: IpcMcpContext) {
  const { chatJid, groupFolder, isMain, ipcDir } = ctx;
  const messagesDir = path.join(ipcDir, 'messages');
  const tasksDir = path.join(ipcDir, 'tasks');
  const memoryDir = path.join(ipcDir, 'memory');

  return createSdkMcpServer({
    name: 'nanoclaw',
    version: '1.0.0',
    tools: [
      tool(
        'send_message',
        'Send a message to the user or group. The message is delivered immediately while you\'re still running. You can call this multiple times to send multiple messages.',
        {
          text: z.string().describe('The message text to send')
        },
        async (args) => {
          const data = {
            type: 'message',
            chatJid,
            text: args.text,
            groupFolder,
            timestamp: new Date().toISOString()
          };

          writeIpcFile(messagesDir, data);

          return {
            content: [{
              type: 'text',
              text: 'Message sent.'
            }]
          };
        }
      ),

      tool(
        'schedule_task',
        `Schedule a recurring or one-time task. The task will run as a full agent with access to all tools.

CONTEXT MODE - Choose based on task type:
- "group": Task runs in the group's conversation context, with access to chat history. Use for tasks that need context about ongoing discussions, user preferences, or recent interactions.
- "isolated": Task runs in a fresh session with no conversation history. Use for independent tasks that don't need prior context. When using isolated mode, include all necessary context in the prompt itself.

If unsure which mode to use, you can ask the user. Examples:
- "Remind me about our discussion" -> group (needs conversation context)
- "Check the weather every morning" -> isolated (self-contained task)
- "Follow up on my request" -> group (needs to know what was requested)
- "Generate a daily report" -> isolated (just needs instructions in prompt)

SCHEDULE VALUE FORMAT (all times are LOCAL timezone):
- cron: Standard cron expression (e.g., "*/5 * * * *" for every 5 minutes, "0 9 * * *" for daily at 9am LOCAL time)
- interval: Milliseconds between runs (e.g., "300000" for 5 minutes, "3600000" for 1 hour)
- once: Local time WITHOUT "Z" suffix (e.g., "2026-02-01T15:30:00"). Do NOT use UTC/Z suffix.`,
        {
          prompt: z.string().describe('What the agent should do when the task runs. For isolated mode, include all necessary context here.'),
          schedule_type: z.enum(['cron', 'interval', 'once']).describe('cron=recurring at specific times, interval=recurring every N ms, once=run once at specific time'),
          schedule_value: z.string().describe('cron: "*/5 * * * *" | interval: milliseconds like "300000" | once: local timestamp like "2026-02-01T15:30:00" (no Z suffix!)'),
          context_mode: z.enum(['group', 'isolated']).default('group').describe('group=runs with chat history and memory, isolated=fresh session (include context in prompt)'),
          ...(isMain ? { target_group_jid: z.string().optional().describe('JID of the group to schedule the task for. The group must be registered. Defaults to the current group.') } : {}),
        },
        async (args) => {
          // Validate schedule_value before writing IPC
          if (args.schedule_type === 'cron') {
            try {
              CronExpressionParser.parse(args.schedule_value);
            } catch (err) {
              return {
                content: [{ type: 'text', text: `Invalid cron: "${args.schedule_value}". Use format like "0 9 * * *" (daily 9am) or "*/5 * * * *" (every 5 min).` }],
                isError: true
              };
            }
          } else if (args.schedule_type === 'interval') {
            const ms = parseInt(args.schedule_value, 10);
            if (isNaN(ms) || ms <= 0) {
              return {
                content: [{ type: 'text', text: `Invalid interval: "${args.schedule_value}". Must be positive milliseconds (e.g., "300000" for 5 min).` }],
                isError: true
              };
            }
          } else if (args.schedule_type === 'once') {
            const date = new Date(args.schedule_value);
            if (isNaN(date.getTime())) {
              return {
                content: [{ type: 'text', text: `Invalid timestamp: "${args.schedule_value}". Use ISO 8601 format like "2026-02-01T15:30:00.000Z".` }],
                isError: true
              };
            }
          }

          // Non-main groups can only schedule for themselves
          const targetJid = isMain && args.target_group_jid ? args.target_group_jid : chatJid;

          const data = {
            type: 'schedule_task',
            prompt: args.prompt,
            schedule_type: args.schedule_type,
            schedule_value: args.schedule_value,
            context_mode: args.context_mode || 'group',
            targetJid,
            createdBy: groupFolder,
            timestamp: new Date().toISOString()
          };

          const filename = writeIpcFile(tasksDir, data);

          return {
            content: [{
              type: 'text',
              text: `Task scheduled (${filename}): ${args.schedule_type} - ${args.schedule_value}`
            }]
          };
        }
      ),

      // Reads from current_tasks.json which host keeps updated
      tool(
        'list_tasks',
        'List all scheduled tasks. From main: shows all tasks. From other groups: shows only that group\'s tasks.',
        {},
        async () => {
          const tasksFile = path.join(ipcDir, 'current_tasks.json');

          try {
            if (!fs.existsSync(tasksFile)) {
              return {
                content: [{
                  type: 'text',
                  text: 'No scheduled tasks found.'
                }]
              };
            }

            const allTasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));

            const tasks = isMain
              ? allTasks
              : allTasks.filter((t: { groupFolder: string }) => t.groupFolder === groupFolder);

            if (tasks.length === 0) {
              return {
                content: [{
                  type: 'text',
                  text: 'No scheduled tasks found.'
                }]
              };
            }

            const formatted = tasks.map((t: { id: string; prompt: string; schedule_type: string; schedule_value: string; status: string; next_run: string }) =>
              `- [${t.id}] ${t.prompt.slice(0, 50)}... (${t.schedule_type}: ${t.schedule_value}) - ${t.status}, next: ${t.next_run || 'N/A'}`
            ).join('\n');

            return {
              content: [{
                type: 'text',
                text: `Scheduled tasks:\n${formatted}`
              }]
            };
          } catch (err) {
            return {
              content: [{
                type: 'text',
                text: `Error reading tasks: ${err instanceof Error ? err.message : String(err)}`
              }]
            };
          }
        }
      ),

      tool(
        'memory_save',
        'Save a durable memory item. Use for preferences, facts, or tool defaults you should remember.',
        {
          scope: z.enum(['global', 'channel', 'user']).describe('global=all channels, channel=this chat, user=across channels for one user'),
          scope_key: z.string().optional().describe('Required for channel/user scopes. For channel: chat ID. For user: user ID.'),
          type: z.enum(['preference', 'fact', 'tool_state']).describe('Memory type'),
          content: z.string().describe('The memory content to store'),
          importance: z.number().int().min(0).max(10).optional().describe('Higher importance keeps memory more visible'),
          ttl_seconds: z.number().int().positive().optional().describe('Optional time-to-live in seconds'),
          replace: z.boolean().optional().describe('If true, replaces existing memories of same scope+type'),
          source: z.string().optional().describe('Optional source or rationale for the memory'),
        },
        async (args) => {
          let scopeKey = args.scope_key;
          if (args.scope === 'channel' && !scopeKey) {
            scopeKey = chatJid;
          }
          if (args.scope === 'user' && !scopeKey) {
            return {
              content: [{ type: 'text', text: 'scope_key is required for user scope.' }],
              isError: true,
            };
          }

          const data = {
            type: 'memory_save',
            scope: args.scope,
            scope_key: args.scope === 'global' ? null : scopeKey,
            memory_type: args.type,
            content: args.content,
            importance: args.importance ?? 0,
            ttl_seconds: args.ttl_seconds ?? null,
            replace: args.replace ?? false,
            source: args.source ?? null,
            chatJid,
            groupFolder,
            timestamp: new Date().toISOString(),
          };

          const filename = writeIpcFile(memoryDir, data);
          return {
            content: [{ type: 'text', text: `Memory saved (${filename}).` }],
          };
        }
      ),

      tool(
        'memory_forget',
        'Delete memory items by id or filter.',
        {
          id: z.string().optional().describe('Delete a specific memory item by ID'),
          scope: z.enum(['global', 'channel', 'user']).optional(),
          scope_key: z.string().optional(),
          type: z.enum(['preference', 'fact', 'tool_state']).optional(),
          contains: z.string().optional().describe('Delete items whose content contains this text'),
        },
        async (args) => {
          if (!args.id && !args.scope && !args.type && !args.contains) {
            return {
              content: [{ type: 'text', text: 'Provide id or at least one filter (scope, type, contains).' }],
              isError: true,
            };
          }

          let scopeKey = args.scope_key;
          if (args.scope === 'channel' && !scopeKey) {
            scopeKey = chatJid;
          }

          const data = {
            type: 'memory_forget',
            id: args.id ?? null,
            scope: args.scope ?? null,
            scope_key: scopeKey ?? null,
            memory_type: args.type ?? null,
            contains: args.contains ?? null,
            chatJid,
            groupFolder,
            timestamp: new Date().toISOString(),
          };

          const filename = writeIpcFile(memoryDir, data);
          return {
            content: [{ type: 'text', text: `Memory deletion requested (${filename}).` }],
          };
        }
      ),

      tool(
        'memory_list',
        'List currently effective memory items for this context.',
        {
          scope: z.enum(['global', 'channel', 'user']).optional(),
          scope_key: z.string().optional(),
          type: z.enum(['preference', 'fact', 'tool_state']).optional(),
          limit: z.number().int().positive().optional(),
        },
        async (args) => {
          const snapshotPath = path.join(ipcDir, 'current_memory.json');
          if (!fs.existsSync(snapshotPath)) {
            return {
              content: [{ type: 'text', text: 'No memory snapshot available yet.' }],
            };
          }

          try {
            const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8')) as {
              items?: Array<{ id: string; scope: string; scope_key: string | null; type: string; content: string }>;
            };
            const items = snapshot.items || [];
            const filtered = items.filter((item) => {
              if (args.scope && item.scope !== args.scope) return false;
              if (args.scope_key && item.scope_key !== args.scope_key) return false;
              if (args.type && item.type !== args.type) return false;
              return true;
            });
            const limited = args.limit ? filtered.slice(0, args.limit) : filtered;

            if (limited.length === 0) {
              return { content: [{ type: 'text', text: 'No memory items found.' }] };
            }

            const lines = limited.map((item) =>
              `- [${item.id}] (${item.scope}/${item.type}) ${item.content}`,
            );
            return {
              content: [{ type: 'text', text: `Memory items:\n${lines.join('\n')}` }],
            };
          } catch (err) {
            return {
              content: [{ type: 'text', text: `Error reading memory snapshot: ${err instanceof Error ? err.message : String(err)}` }],
            };
          }
        }
      ),

      tool(
        'pause_task',
        'Pause a scheduled task. It will not run until resumed.',
        {
          task_id: z.string().describe('The task ID to pause')
        },
        async (args) => {
          const data = {
            type: 'pause_task',
            taskId: args.task_id,
            groupFolder,
            isMain,
            timestamp: new Date().toISOString()
          };

          writeIpcFile(tasksDir, data);

          return {
            content: [{
              type: 'text',
              text: `Task ${args.task_id} pause requested.`
            }]
          };
        }
      ),

      tool(
        'resume_task',
        'Resume a paused task.',
        {
          task_id: z.string().describe('The task ID to resume')
        },
        async (args) => {
          const data = {
            type: 'resume_task',
            taskId: args.task_id,
            groupFolder,
            isMain,
            timestamp: new Date().toISOString()
          };

          writeIpcFile(tasksDir, data);

          return {
            content: [{
              type: 'text',
              text: `Task ${args.task_id} resume requested.`
            }]
          };
        }
      ),

      tool(
        'cancel_task',
        'Cancel and delete a scheduled task.',
        {
          task_id: z.string().describe('The task ID to cancel')
        },
        async (args) => {
          const data = {
            type: 'cancel_task',
            taskId: args.task_id,
            groupFolder,
            isMain,
            timestamp: new Date().toISOString()
          };

          writeIpcFile(tasksDir, data);

          return {
            content: [{
              type: 'text',
              text: `Task ${args.task_id} cancellation requested.`
            }]
          };
        }
      )
    ]
  });
}
