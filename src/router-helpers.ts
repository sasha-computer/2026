import { ASSISTANT_NAME } from './config.js';
import { RegisteredGroup } from './types.js';

export interface BotCommandDeps {
  sessions: Record<string, Record<string, string>>;
  lastAgentTimestamp: Record<string, string>;
  registeredGroups: Record<string, RegisteredGroup>;
  startTime: number;
  maxConcurrentAgents: number;
  logInfo?: (meta: Record<string, unknown>, message: string) => void;
  deleteSession: (folder: string, channelId: string) => void;
  saveState: () => void;
  storeMessage: (
    messageId: string,
    chatJid: string,
    sender: string,
    senderName: string,
    content: string,
    timestamp: string,
    isFromMe: boolean,
  ) => void;
  enqueueMessageCheck: (channelId: string) => void;
  getActiveCount: () => number;
}

export interface BotCommandMessage {
  content: string;
  author: { id: string };
}

export type SendMessageFn = (channelId: string, text: string) => Promise<void>;

/**
 * Split a long message into chunks that fit Discord's 2000-char limit.
 * Prefers splitting at newlines, then spaces, then hard-splits.
 */
export function splitMessage(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a newline within the limit
    let splitIndex = remaining.lastIndexOf('\n', maxLength);
    if (splitIndex <= 0 || splitIndex < maxLength * 0.5) {
      // No good newline; try space
      splitIndex = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitIndex <= 0 || splitIndex < maxLength * 0.5) {
      // Hard split
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  return chunks;
}

/**
 * Execute a bot command. Returns the response string, or null if unknown command.
 */
export function executeBotCommand(
  command: string,
  channelId: string,
  registration: RegisteredGroup,
  deps: BotCommandDeps,
  userId?: string,
): string | null {
  if (command === 'new') {
    const folder = registration.folder;
    if (deps.sessions[folder]?.[channelId]) {
      delete deps.sessions[folder][channelId];
      deps.deleteSession(folder, channelId);
    }
    delete deps.lastAgentTimestamp[channelId];
    deps.saveState();

    deps.logInfo?.({ channelId, folder }, 'Session reset via /new command');
    return 'Session reset. Next message starts a fresh conversation.';
  }

  if (command === 'clear') {
    deps.storeMessage(
      `clear-${Date.now()}`,
      channelId,
      userId || 'unknown',
      'System',
      'Please summarize the key context from our conversation so far in a few bullet points, then continue from this summary.',
      new Date().toISOString(),
      false,
    );
    delete deps.lastAgentTimestamp[channelId];
    deps.saveState();
    deps.enqueueMessageCheck(channelId);

    deps.logInfo?.({ channelId }, 'Context compaction via /clear command');
    return 'Context compaction requested. Summarizing conversation...';
  }

  if (command === 'status') {
    const folder = registration.folder;
    const sessionId = deps.sessions[folder]?.[channelId];
    const uptimeMs = Date.now() - deps.startTime;
    const uptimeH = Math.floor(uptimeMs / 3600000);
    const uptimeM = Math.floor((uptimeMs % 3600000) / 60000);

    const activeAgents = deps.getActiveCount();
    const channelCount = Object.keys(deps.registeredGroups).length;

    return [
      `**${ASSISTANT_NAME} Status**`,
      `Uptime: ${uptimeH}h ${uptimeM}m`,
      `Agents: ${activeAgents} active / ${deps.maxConcurrentAgents} max`,
      `Registered channels: ${channelCount}`,
      ``,
      `**This Channel**`,
      `Folder: \`${folder}\``,
      `Session: \`${sessionId ? sessionId.slice(0, 12) + '...' : 'none'}\``,
    ].join('\n');
  }

  return null;
}

export function createBotCommandHandler(
  deps: BotCommandDeps & { sendMessage: SendMessageFn },
): (
  message: BotCommandMessage,
  channelId: string,
  registration: RegisteredGroup,
) => Promise<boolean> {
  return async (message, channelId, registration) => {
    const content = message.content.trim().toLowerCase();
    if (!content.startsWith('/')) return false;

    const command = content.split(/\s+/)[0].slice(1); // strip leading /
    const response = executeBotCommand(
      command,
      channelId,
      registration,
      deps,
      message.author.id,
    );
    if (response) {
      await deps.sendMessage(channelId, response);
      return true;
    }
    return false;
  };
}
