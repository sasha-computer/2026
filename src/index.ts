import fs from 'fs';
import path from 'path';

import {
  Client,
  ChatInputCommandInteraction,
  GatewayIntentBits,
  Message,
  REST,
  Routes,
  SlashCommandBuilder,
  TextChannel,
  ThreadChannel,
  Partials,
} from 'discord.js';
import { CronExpressionParser } from 'cron-parser';

import {
  ASSISTANT_NAME,
  BOT_MESSAGE_PREFIX,
  DATA_DIR,
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  DISCORD_IGNORE_CHANNEL_IDS,
  DISCORD_MAIN_CHANNEL_ID,
  DISCORD_MAX_MESSAGE_LENGTH,
  IPC_POLL_INTERVAL,
  MAIN_GROUP_FOLDER,
  MAX_CONCURRENT_AGENTS,
  TIMEZONE,
} from './config.js';
import {
  AgentResponse,
  AvailableGroup,
  runAgent,
  writeGroupsSnapshot,
  writeTasksSnapshot,
} from './process-runner.js';
import {
  createTask,
  deleteSession,
  deleteTask,
  getAllChats,
  getAllRegisteredGroups,
  getAllSessions,
  getAllTasks,
  getLastGroupSync,
  getMessagesSince,
  getRouterState,
  getTaskById,
  initDatabase,
  setLastGroupSync,
  setRegisteredGroup,
  setRouterState,
  setSession,
  storeChatMetadata,
  storeMessage,
  updateChatName,
  updateTask,
} from './db.js';
import { GroupQueue } from './group-queue.js';
import { startSchedulerLoop } from './task-scheduler.js';
import { MemoryItem, RegisteredGroup } from './types.js';
import { logger } from './logger.js';
import {
  forgetMemory,
  formatMemoryBlock,
  getEffectiveMemoryItems,
  saveMemoryItem,
} from './memory-service.js';
import {
  createBotCommandHandler,
  executeBotCommand,
  splitMessage,
} from './router-helpers.js';

const GROUP_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

let client: Client;
let lastTimestamp = '';
let sessions: Record<string, Record<string, string>> = {};
const startTime = Date.now();
let registeredGroups: Record<string, RegisteredGroup> = {};
let lastAgentTimestamp: Record<string, string> = {};
// Cache thread ID -> parent channel ID for thread/forum support
const threadParentCache = new Map<string, string>();
// Guards to prevent duplicate loops on reconnect
let ipcWatcherRunning = false;
let groupSyncTimerStarted = false;

const queue = new GroupQueue();
const MEMORY_INSTRUCTION =
  'If the user asks to remember/save something, you MUST call the memory_save tool to persist it. If they ask to forget, call memory_forget. If they ask what you remember, call memory_list.';

async function setTyping(channelId: string, isTyping: boolean): Promise<void> {
  if (!isTyping) return; // Discord typing auto-expires; no "stop" needed
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel?.isTextBased() && 'sendTyping' in channel) {
      await (channel as TextChannel | ThreadChannel).sendTyping();
    }
  } catch (err) {
    logger.debug({ channelId, err }, 'Failed to send typing indicator');
  }
}

function writeMemorySnapshot(
  groupFolder: string,
  chatJid: string,
  userId: string | undefined,
  items: MemoryItem[],
): void {
  const ipcDir = path.join(DATA_DIR, 'ipc', groupFolder);
  fs.mkdirSync(ipcDir, { recursive: true });
  const snapshotPath = path.join(ipcDir, 'current_memory.json');
  const snapshot = {
    generated_at: new Date().toISOString(),
    chatJid,
    userId: userId ?? null,
    items,
  };
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
}

function loadState(): void {
  // Load from SQLite (migration from JSON happens in initDatabase)
  lastTimestamp = getRouterState('last_timestamp') || '';
  const agentTs = getRouterState('last_agent_timestamp');
  try {
    lastAgentTimestamp = agentTs ? JSON.parse(agentTs) : {};
  } catch {
    logger.warn('Corrupted last_agent_timestamp in DB, resetting');
    lastAgentTimestamp = {};
  }
  sessions = getAllSessions();
  registeredGroups = getAllRegisteredGroups();
  logger.info(
    { groupCount: Object.keys(registeredGroups).length },
    'State loaded',
  );
}

function saveState(): void {
  setRouterState('last_timestamp', lastTimestamp);
  setRouterState(
    'last_agent_timestamp',
    JSON.stringify(lastAgentTimestamp),
  );
}

function registerGroup(jid: string, group: RegisteredGroup): void {
  registeredGroups[jid] = group;
  setRegisteredGroup(jid, group);

  // Create group folder
  const groupDir = path.join(DATA_DIR, '..', 'groups', group.folder);
  fs.mkdirSync(path.join(groupDir, 'logs'), { recursive: true });

  logger.info(
    { jid, name: group.name, folder: group.folder },
    'Group registered',
  );
}

/**
 * Sync channel metadata from Discord.
 * Fetches all guild channels and stores their names in the database.
 * Called on startup, daily, and on-demand via IPC.
 */
async function syncChannelMetadata(force = false): Promise<void> {
  if (!force) {
    const lastSync = getLastGroupSync();
    if (lastSync) {
      const lastSyncTime = new Date(lastSync).getTime();
      const now = Date.now();
      if (now - lastSyncTime < GROUP_SYNC_INTERVAL_MS) {
        logger.debug({ lastSync }, 'Skipping channel sync - synced recently');
        return;
      }
    }
  }

  try {
    logger.info('Syncing channel metadata from Discord...');
    const guild = await client.guilds.fetch(DISCORD_GUILD_ID);
    const channels = await guild.channels.fetch();

    let count = 0;
    for (const [id, channel] of channels) {
      if (channel && channel.name) {
        updateChatName(id, channel.name);
        count++;
      }
    }

    setLastGroupSync();
    logger.info({ count }, 'Channel metadata synced');
  } catch (err) {
    logger.error({ err }, 'Failed to sync channel metadata');
  }
}

/**
 * Get available channels list for the agent.
 * Returns channels ordered by most recent activity.
 */
function getAvailableGroups(): AvailableGroup[] {
  const chats = getAllChats();
  const registeredJids = new Set(Object.keys(registeredGroups));

  return chats
    .filter((c) => c.jid !== '__group_sync__')
    .map((c) => ({
      jid: c.jid,
      name: c.name,
      lastActivity: c.last_message_time,
      isRegistered: registeredJids.has(c.jid),
    }));
}

/**
 * Look up the registration for a channel, supporting threads and forum posts.
 * Threads/forum posts inherit their parent channel's registration.
 * Unregistered channels are auto-registered on first access.
 */
function getRegistrationForChannel(
  channelId: string,
  channelMeta?: { name?: string; isThread?: boolean; parentId?: string },
): RegisteredGroup {
  // Direct registration
  if (registeredGroups[channelId]) {
    return registeredGroups[channelId];
  }

  // Check thread parent cache
  const parentId = channelMeta?.parentId || threadParentCache.get(channelId);
  if (parentId && registeredGroups[parentId]) {
    return registeredGroups[parentId];
  }

  // Auto-register this channel
  return autoRegisterChannel(channelId, channelMeta);
}

/**
 * Auto-register a channel that received its first message.
 * Creates a RegisteredGroup on the fly with a human-readable folder name.
 */
function autoRegisterChannel(
  channelId: string,
  meta?: { name?: string; isThread?: boolean; parentId?: string },
): RegisteredGroup {
  const idSuffix = channelId.slice(-6);
  const rawName = meta?.name || 'unknown';
  const sanitized = rawName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  let folder = `chan-${sanitized}-${idSuffix}`;

  // Check for folder name collision
  const existingFolders = new Set(
    Object.values(registeredGroups).map((g) => g.folder),
  );
  if (existingFolders.has(folder)) {
    folder = `chan-${channelId}`;
  }

  const group: RegisteredGroup = {
    name: rawName,
    folder,
    trigger: 'none',
    added_at: new Date().toISOString(),
    requiresTrigger: false,
  };

  registerGroup(channelId, group);
  logger.info(
    { channelId, folder, name: rawName },
    'Auto-registered channel',
  );
  return group;
}

/**
 * Process all pending messages for a channel.
 * Called by the GroupQueue when it's this channel's turn.
 */
async function processGroupMessages(chatJid: string): Promise<boolean> {
  const group = getRegistrationForChannel(chatJid);

  const isMainGroup = group.folder === MAIN_GROUP_FOLDER;

  // Get all messages since last agent interaction
  const sinceTimestamp = lastAgentTimestamp[chatJid] || '';
  const missedMessages = getMessagesSince(
    chatJid,
    sinceTimestamp,
    BOT_MESSAGE_PREFIX,
  );

  if (missedMessages.length === 0) return true;

  const lines = missedMessages.map((m) => {
    const escapeXml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    return `<message sender="${escapeXml(m.sender_name)}" time="${m.timestamp}">${escapeXml(m.content)}</message>`;
  });
  let prompt = `<messages>\n${lines.join('\n')}\n</messages>`;

  const lastSender = missedMessages[missedMessages.length - 1]?.sender;
  const memoryItems = getEffectiveMemoryItems({
    chatJid,
    userId: lastSender,
  });
  writeMemorySnapshot(group.folder, chatJid, lastSender, memoryItems);
  const memoryBlock = formatMemoryBlock(memoryItems);
  const instructionBlock = `<memory_instructions>${MEMORY_INSTRUCTION}</memory_instructions>`;
  if (memoryBlock) {
    prompt = `${instructionBlock}\n${memoryBlock}\n\n${prompt}`;
  } else {
    prompt = `${instructionBlock}\n\n${prompt}`;
  }

  logger.info(
    { group: group.name, messageCount: missedMessages.length },
    'Processing messages',
  );

  await setTyping(chatJid, true);
  const response = await runAgentForGroup(group, prompt, chatJid);
  await setTyping(chatJid, false);

  if (response === 'error') {
    // Agent error — signal failure so queue can retry with backoff
    return false;
  }

  // Agent processed messages successfully (whether it responded or stayed silent)
  lastAgentTimestamp[chatJid] =
    missedMessages[missedMessages.length - 1].timestamp;
  saveState();

  if (response.outputType === 'message' && response.userMessage) {
    await sendMessage(chatJid, response.userMessage);
  }

  if (response.internalLog) {
    logger.info(
      { group: group.name, outputType: response.outputType },
      `Agent: ${response.internalLog}`,
    );
  }

  return true;
}

async function runAgentForGroup(
  group: RegisteredGroup,
  prompt: string,
  chatJid: string,
): Promise<AgentResponse | 'error'> {
  const isMain = group.folder === MAIN_GROUP_FOLDER;
  const sessionId = sessions[group.folder]?.[chatJid];

  // Update tasks snapshot for agent to read (filtered by group)
  const tasks = getAllTasks();
  writeTasksSnapshot(
    group.folder,
    isMain,
    tasks.map((t) => ({
      id: t.id,
      groupFolder: t.group_folder,
      prompt: t.prompt,
      schedule_type: t.schedule_type,
      schedule_value: t.schedule_value,
      status: t.status,
      next_run: t.next_run,
    })),
  );

  // Update available groups snapshot (main group only can see all groups)
  const availableGroups = getAvailableGroups();
  writeGroupsSnapshot(
    group.folder,
    isMain,
    availableGroups,
    new Set(Object.keys(registeredGroups)),
  );

  try {
    const output = await runAgent(
      group,
      {
        prompt,
        sessionId,
        groupFolder: group.folder,
        chatJid,
        isMain,
      },
      (proc) => queue.registerProcess(chatJid, proc),
    );

    if (output.newSessionId) {
      if (!sessions[group.folder]) {
        sessions[group.folder] = {};
      }
      sessions[group.folder][chatJid] = output.newSessionId;
      setSession(group.folder, chatJid, output.newSessionId);
    }

    if (output.status === 'error') {
      logger.error(
        { group: group.name, error: output.error },
        'Agent error',
      );
      return 'error';
    }

    return output.result ?? { outputType: 'log' };
  } catch (err) {
    logger.error({ group: group.name, err }, 'Agent error');
    return 'error';
  }
}

async function sendMessage(channelId: string, text: string): Promise<void> {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased() || !('send' in channel)) {
      logger.error({ channelId }, 'Channel not found or not text-based');
      return;
    }

    const textChannel = channel as TextChannel | ThreadChannel;

    if (text.length <= DISCORD_MAX_MESSAGE_LENGTH) {
      await textChannel.send(text);
    } else {
      const chunks = splitMessage(text, DISCORD_MAX_MESSAGE_LENGTH);
      for (const chunk of chunks) {
        await textChannel.send(chunk);
      }
    }

    logger.info({ channelId, length: text.length }, 'Message sent');
  } catch (err) {
    logger.error({ channelId, err }, 'Failed to send message');
  }
}

const handleBotCommand = createBotCommandHandler({
  sessions,
  lastAgentTimestamp,
  registeredGroups,
  startTime,
  maxConcurrentAgents: MAX_CONCURRENT_AGENTS,
  logInfo: (meta, message) => logger.info(meta, message),
  deleteSession,
  saveState,
  storeMessage,
  enqueueMessageCheck: (jid) => queue.enqueueMessageCheck(jid),
  getActiveCount: () => queue.getActiveCount(),
  sendMessage,
});

function startIpcWatcher(): void {
  if (ipcWatcherRunning) {
    logger.debug('IPC watcher already running, skipping duplicate start');
    return;
  }
  ipcWatcherRunning = true;

  const ipcBaseDir = path.join(DATA_DIR, 'ipc');
  fs.mkdirSync(ipcBaseDir, { recursive: true });

  const processIpcFiles = async () => {
    // Scan all group IPC directories (identity determined by directory)
    let groupFolders: string[];
    try {
      groupFolders = fs.readdirSync(ipcBaseDir).filter((f) => {
        const stat = fs.statSync(path.join(ipcBaseDir, f));
        return stat.isDirectory() && f !== 'errors';
      });
    } catch (err) {
      logger.error({ err }, 'Error reading IPC base directory');
      setTimeout(processIpcFiles, IPC_POLL_INTERVAL);
      return;
    }

    for (const sourceGroup of groupFolders) {
      const isMain = sourceGroup === MAIN_GROUP_FOLDER;
      const messagesDir = path.join(ipcBaseDir, sourceGroup, 'messages');
      const tasksDir = path.join(ipcBaseDir, sourceGroup, 'tasks');
      const memoryDir = path.join(ipcBaseDir, sourceGroup, 'memory');

      // Process messages from this group's IPC directory
      try {
        if (fs.existsSync(messagesDir)) {
          const messageFiles = fs
            .readdirSync(messagesDir)
            .filter((f) => f.endsWith('.json'));
          for (const file of messageFiles) {
            const filePath = path.join(messagesDir, file);
            try {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              if (data.type === 'message' && data.chatJid && data.text) {
                // Authorization: verify this group can send to this chatJid
                const targetGroup = getRegistrationForChannel(data.chatJid);
                if (
                  isMain ||
                  (targetGroup && targetGroup.folder === sourceGroup)
                ) {
                  await sendMessage(data.chatJid, data.text);
                  logger.info(
                    { chatJid: data.chatJid, sourceGroup },
                    'IPC message sent',
                  );
                } else {
                  logger.warn(
                    { chatJid: data.chatJid, sourceGroup },
                    'Unauthorized IPC message attempt blocked',
                  );
                }
              }
              fs.unlinkSync(filePath);
            } catch (err) {
              logger.error(
                { file, sourceGroup, err },
                'Error processing IPC message',
              );
              const errorDir = path.join(ipcBaseDir, 'errors');
              fs.mkdirSync(errorDir, { recursive: true });
              fs.renameSync(
                filePath,
                path.join(errorDir, `${sourceGroup}-${file}`),
              );
            }
          }
        }
      } catch (err) {
        logger.error(
          { err, sourceGroup },
          'Error reading IPC messages directory',
        );
      }

      // Process tasks from this group's IPC directory
      try {
        if (fs.existsSync(tasksDir)) {
          const taskFiles = fs
            .readdirSync(tasksDir)
            .filter((f) => f.endsWith('.json'));
          for (const file of taskFiles) {
            const filePath = path.join(tasksDir, file);
            try {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              // Pass source group identity to processTaskIpc for authorization
              await processTaskIpc(data, sourceGroup, isMain);
              fs.unlinkSync(filePath);
            } catch (err) {
              logger.error(
                { file, sourceGroup, err },
                'Error processing IPC task',
              );
              const errorDir = path.join(ipcBaseDir, 'errors');
              fs.mkdirSync(errorDir, { recursive: true });
              fs.renameSync(
                filePath,
                path.join(errorDir, `${sourceGroup}-${file}`),
              );
            }
          }
        }
      } catch (err) {
        logger.error({ err, sourceGroup }, 'Error reading IPC tasks directory');
      }

      // Process memory actions from this group's IPC directory
      try {
        if (fs.existsSync(memoryDir)) {
          const memoryFiles = fs
            .readdirSync(memoryDir)
            .filter((f) => f.endsWith('.json'));
          for (const file of memoryFiles) {
            const filePath = path.join(memoryDir, file);
            try {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              await processMemoryIpc(data, sourceGroup, isMain);
              fs.unlinkSync(filePath);
            } catch (err) {
              logger.error(
                { file, sourceGroup, err },
                'Error processing IPC memory action',
              );
              const errorDir = path.join(ipcBaseDir, 'errors');
              fs.mkdirSync(errorDir, { recursive: true });
              fs.renameSync(
                filePath,
                path.join(errorDir, `${sourceGroup}-${file}`),
              );
            }
          }
        }
      } catch (err) {
        logger.error({ err, sourceGroup }, 'Error reading IPC memory directory');
      }
    }

    setTimeout(processIpcFiles, IPC_POLL_INTERVAL);
  };

  processIpcFiles();
  logger.info('IPC watcher started (per-group namespaces)');
}

async function processTaskIpc(
  data: {
    type: string;
    taskId?: string;
    prompt?: string;
    schedule_type?: string;
    schedule_value?: string;
    context_mode?: string;
    groupFolder?: string;
    chatJid?: string;
    targetJid?: string;
  },
  sourceGroup: string, // Verified identity from IPC directory
  isMain: boolean, // Verified from directory path
): Promise<void> {
  switch (data.type) {
    case 'schedule_task':
      if (
        data.prompt &&
        data.schedule_type &&
        data.schedule_value &&
        data.targetJid
      ) {
        // Resolve the target group from channel ID
        const targetJid = data.targetJid as string;
        const targetGroupEntry = registeredGroups[targetJid];

        if (!targetGroupEntry) {
          logger.warn(
            { targetJid },
            'Cannot schedule task: target channel not registered',
          );
          break;
        }

        const targetFolder = targetGroupEntry.folder;

        // Authorization: non-main groups can only schedule for themselves
        if (!isMain && targetFolder !== sourceGroup) {
          logger.warn(
            { sourceGroup, targetFolder },
            'Unauthorized schedule_task attempt blocked',
          );
          break;
        }

        const scheduleType = data.schedule_type as 'cron' | 'interval' | 'once';

        let nextRun: string | null = null;
        if (scheduleType === 'cron') {
          try {
            const interval = CronExpressionParser.parse(data.schedule_value, {
              tz: TIMEZONE,
            });
            nextRun = interval.next().toISOString();
          } catch {
            logger.warn(
              { scheduleValue: data.schedule_value },
              'Invalid cron expression',
            );
            break;
          }
        } else if (scheduleType === 'interval') {
          const ms = parseInt(data.schedule_value, 10);
          if (isNaN(ms) || ms <= 0) {
            logger.warn(
              { scheduleValue: data.schedule_value },
              'Invalid interval',
            );
            break;
          }
          nextRun = new Date(Date.now() + ms).toISOString();
        } else if (scheduleType === 'once') {
          const scheduled = new Date(data.schedule_value);
          if (isNaN(scheduled.getTime())) {
            logger.warn(
              { scheduleValue: data.schedule_value },
              'Invalid timestamp',
            );
            break;
          }
          nextRun = scheduled.toISOString();
        }

        const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const contextMode =
          data.context_mode === 'group' || data.context_mode === 'isolated'
            ? data.context_mode
            : 'isolated';
        createTask({
          id: taskId,
          group_folder: targetFolder,
          chat_jid: targetJid,
          prompt: data.prompt,
          schedule_type: scheduleType,
          schedule_value: data.schedule_value,
          context_mode: contextMode,
          next_run: nextRun,
          status: 'active',
          created_at: new Date().toISOString(),
        });
        logger.info(
          { taskId, sourceGroup, targetFolder, contextMode },
          'Task created via IPC',
        );
      }
      break;

    case 'pause_task':
      if (data.taskId) {
        const task = getTaskById(data.taskId);
        if (task && (isMain || task.group_folder === sourceGroup)) {
          updateTask(data.taskId, { status: 'paused' });
          logger.info(
            { taskId: data.taskId, sourceGroup },
            'Task paused via IPC',
          );
        } else {
          logger.warn(
            { taskId: data.taskId, sourceGroup },
            'Unauthorized task pause attempt',
          );
        }
      }
      break;

    case 'resume_task':
      if (data.taskId) {
        const task = getTaskById(data.taskId);
        if (task && (isMain || task.group_folder === sourceGroup)) {
          updateTask(data.taskId, { status: 'active' });
          logger.info(
            { taskId: data.taskId, sourceGroup },
            'Task resumed via IPC',
          );
        } else {
          logger.warn(
            { taskId: data.taskId, sourceGroup },
            'Unauthorized task resume attempt',
          );
        }
      }
      break;

    case 'cancel_task':
      if (data.taskId) {
        const task = getTaskById(data.taskId);
        if (task && (isMain || task.group_folder === sourceGroup)) {
          deleteTask(data.taskId);
          logger.info(
            { taskId: data.taskId, sourceGroup },
            'Task cancelled via IPC',
          );
        } else {
          logger.warn(
            { taskId: data.taskId, sourceGroup },
            'Unauthorized task cancel attempt',
          );
        }
      }
      break;

    case 'refresh_groups':
      // Only main group can request a refresh
      if (isMain) {
        logger.info(
          { sourceGroup },
          'Channel metadata refresh requested via IPC',
        );
        await syncChannelMetadata(true);
        // Write updated snapshot immediately
        const availableGroups = getAvailableGroups();
        writeGroupsSnapshot(
          sourceGroup,
          true,
          availableGroups,
          new Set(Object.keys(registeredGroups)),
        );
      } else {
        logger.warn(
          { sourceGroup },
          'Unauthorized refresh_groups attempt blocked',
        );
      }
      break;

    default:
      logger.warn({ type: data.type }, 'Unknown IPC task type');
  }
}

async function processMemoryIpc(
  data: {
    type: string;
    scope?: string | null;
    scope_key?: string | null;
    memory_type?: string | null;
    content?: string | null;
    importance?: number | null;
    ttl_seconds?: number | null;
    replace?: boolean | null;
    id?: string | null;
    contains?: string | null;
    chatJid?: string | null;
  },
  sourceGroup: string,
  isMain: boolean,
): Promise<void> {
  const scope = data.scope ?? undefined;
  const scopeKey = data.scope_key ?? undefined;

  if (scope === 'global' && !isMain) {
    logger.warn({ sourceGroup }, 'Unauthorized global memory write blocked');
    return;
  }

  if (scope === 'channel' && scopeKey) {
    const target = registeredGroups[scopeKey];
    if (!target) {
      logger.warn({ scopeKey }, 'Channel memory scope not registered');
      return;
    }
    if (!isMain && target.folder !== sourceGroup) {
      logger.warn(
        { sourceGroup, targetFolder: target.folder },
        'Unauthorized channel memory write blocked',
      );
      return;
    }
  }

  if (data.type === 'memory_save') {
    if (!scope || !data.memory_type || !data.content) {
      logger.warn({ data }, 'Invalid memory_save payload');
      return;
    }

    saveMemoryItem({
      scope: scope as 'global' | 'channel' | 'user',
      scope_key: scope === 'global' ? null : scopeKey,
      type: data.memory_type as 'preference' | 'fact' | 'tool_state',
      content: data.content,
      importance: data.importance ?? 0,
      ttl_seconds: data.ttl_seconds ?? null,
      replace: data.replace ?? false,
      source: 'ipc',
    });
  } else if (data.type === 'memory_forget') {
    if (!data.id && !scope && !data.memory_type && !data.contains) {
      logger.warn({ data }, 'Invalid memory_forget payload');
      return;
    }

    forgetMemory({
      id: data.id ?? undefined,
      scope: scope as 'global' | 'channel' | 'user' | undefined,
      scope_key: scope === 'global' ? null : scopeKey,
      type: data.memory_type as 'preference' | 'fact' | 'tool_state' | undefined,
      contains: data.contains ?? undefined,
    });
  } else {
    logger.warn({ type: data.type }, 'Unknown IPC memory type');
    return;
  }

  if (data.chatJid) {
    const userId =
      scope === 'user' && typeof scopeKey === 'string' ? scopeKey : undefined;
    const memoryItems = getEffectiveMemoryItems({
      chatJid: data.chatJid,
      userId,
    });
    writeMemorySnapshot(sourceGroup, data.chatJid, userId, memoryItems);
  }
}

/**
 * Handle Discord slash command interactions.
 */
async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (interaction.guildId !== DISCORD_GUILD_ID) return;

  const channelId = interaction.channelId;
  const isThread = interaction.channel?.isThread() ?? false;
  const parentId = isThread
    ? (interaction.channel as ThreadChannel).parentId || undefined
    : undefined;
  const channelName = interaction.channel && 'name' in interaction.channel
    ? (interaction.channel as TextChannel).name
    : undefined;

  const registration = getRegistrationForChannel(channelId, {
    name: channelName,
    isThread,
    parentId,
  });

  const response = executeBotCommand(
    interaction.commandName,
    channelId,
    registration,
    {
      sessions,
      lastAgentTimestamp,
      registeredGroups,
      startTime,
      maxConcurrentAgents: MAX_CONCURRENT_AGENTS,
      logInfo: (meta, message) => logger.info(meta, message),
      deleteSession,
      saveState,
      storeMessage,
      enqueueMessageCheck: (jid) => queue.enqueueMessageCheck(jid),
      getActiveCount: () => queue.getActiveCount(),
    },
    interaction.user.id,
  );

  await interaction.reply(response || 'Unknown command.');
}

/** Slash command definitions. */
const slashCommands = [
  new SlashCommandBuilder()
    .setName('new')
    .setDescription('Reset the conversation session in this channel'),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Compact the conversation context (summarize and continue)'),
  new SlashCommandBuilder()
    .setName('status')
    .setDescription(`Show ${ASSISTANT_NAME} status and channel info`),
];

/**
 * Register slash commands for the guild (replaces any stale commands).
 */
async function registerSlashCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
  const appId = client.user!.id;

  try {
    // Clear global commands (leftover from openclaw or previous setups)
    await rest.put(Routes.applicationCommands(appId), { body: [] });

    // Register guild commands (instant update, replaces all previous)
    await rest.put(Routes.applicationGuildCommands(appId, DISCORD_GUILD_ID), {
      body: slashCommands.map((c) => c.toJSON()),
    });

    logger.info('Registered Discord slash commands: /new, /clear, /status');
  } catch (err) {
    logger.error({ err }, 'Failed to register slash commands');
  }
}

/**
 * Handle incoming Discord messages.
 */
async function handleDiscordMessage(message: Message): Promise<void> {
  // Ignore bot's own messages
  if (message.author.id === client.user?.id) return;

  // Ignore all bot messages (prevents bot-to-bot loops)
  if (message.author.bot) return;

  // Only process messages from the configured guild
  if (message.guildId !== DISCORD_GUILD_ID) return;

  // Ignore DMs (server-only bot)
  if (!message.guild) return;

  // Ignore channels in the ignore list
  if (DISCORD_IGNORE_CHANNEL_IDS.has(message.channelId)) return;

  // Determine channel context
  const channelId = message.channelId;
  const timestamp = message.createdAt.toISOString();
  const senderName =
    message.member?.displayName ||
    message.author.globalName ||
    message.author.username;

  // Cache thread parent mapping for thread/forum support
  if (message.channel.isThread()) {
    const parentId = (message.channel as ThreadChannel).parentId;
    if (parentId) {
      threadParentCache.set(channelId, parentId);
    }
  }

  // Get channel name for metadata
  const channelName = message.channel.isThread()
    ? (message.channel as ThreadChannel).name || undefined
    : 'name' in message.channel
      ? (message.channel as TextChannel).name
      : undefined;

  // Always store chat metadata for channel discovery
  storeChatMetadata(channelId, timestamp, channelName);

  // Get registration (auto-registers if needed)
  const isThread = message.channel.isThread();
  const parentId = isThread
    ? (message.channel as ThreadChannel).parentId || undefined
    : undefined;
  const registration = getRegistrationForChannel(channelId, {
    name: channelName,
    isThread,
    parentId,
  });

  // Handle bot commands before storing message
  if (await handleBotCommand(message, channelId, registration)) return;

  // Store message
  storeMessage(
    message.id,
    channelId,
    message.author.id,
    senderName,
    message.content,
    timestamp,
    false,
  );

  // Advance the "seen" cursor and enqueue immediately (event-driven)
  if (timestamp > lastTimestamp) {
    lastTimestamp = timestamp;
    saveState();
  }

  queue.enqueueMessageCheck(channelId);
}

async function connectDiscord(): Promise<void> {
  if (!DISCORD_BOT_TOKEN) {
    logger.error('DISCORD_BOT_TOKEN not set. Add it to .env');
    process.exit(1);
  }
  if (!DISCORD_GUILD_ID) {
    logger.error('DISCORD_GUILD_ID not set. Add it to .env');
    process.exit(1);
  }
  if (!DISCORD_MAIN_CHANNEL_ID) {
    logger.error('DISCORD_MAIN_CHANNEL_ID not set. Add it to .env');
    process.exit(1);
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  client.once('ready', async () => {
    logger.info({ user: client.user?.tag }, 'Connected to Discord');

    // Auto-register main channel if not already registered
    if (!registeredGroups[DISCORD_MAIN_CHANNEL_ID]) {
      registerGroup(DISCORD_MAIN_CHANNEL_ID, {
    name: 'main',
    folder: MAIN_GROUP_FOLDER,
    trigger: 'none',
        added_at: new Date().toISOString(),
        requiresTrigger: false,
      });
    }

    // Sync channel metadata on startup (respects 24h cache)
    await syncChannelMetadata().catch((err) =>
      logger.error({ err }, 'Initial channel sync failed'),
    );

    // Set up daily sync timer (only once)
    if (!groupSyncTimerStarted) {
      groupSyncTimerStarted = true;
      setInterval(() => {
        syncChannelMetadata().catch((err) =>
          logger.error({ err }, 'Periodic channel sync failed'),
        );
      }, GROUP_SYNC_INTERVAL_MS);
    }

    startSchedulerLoop({
      sendMessage,
      registeredGroups: () => registeredGroups,
      getSessions: () => sessions,
      queue,
      onProcess: (groupJid, proc) =>
        queue.registerProcess(groupJid, proc),
    });

    startIpcWatcher();
    queue.setProcessMessagesFn(processGroupMessages);
    recoverPendingMessages();

    // Register slash commands (clears stale global commands too)
    await registerSlashCommands();

    logger.info(`${ASSISTANT_NAME} running on Discord`);
  });

  client.on('messageCreate', handleDiscordMessage);

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    await handleSlashCommand(interaction);
  });

  await client.login(DISCORD_BOT_TOKEN);
}

/**
 * Startup recovery: check for unprocessed messages in registered channels.
 * Handles crash between advancing lastTimestamp and processing messages.
 */
function recoverPendingMessages(): void {
  for (const [chatJid, group] of Object.entries(registeredGroups)) {
    const sinceTimestamp = lastAgentTimestamp[chatJid] || '';
  const pending = getMessagesSince(chatJid, sinceTimestamp, BOT_MESSAGE_PREFIX);
    if (pending.length > 0) {
      logger.info(
        { group: group.name, pendingCount: pending.length },
        'Recovery: found unprocessed messages',
      );
      queue.enqueueMessageCheck(chatJid);
    }
  }
}

async function main(): Promise<void> {
  initDatabase();
  logger.info('Database initialized');
  loadState();

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    await queue.shutdown(10000);
    client?.destroy();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  await connectDiscord();
}

if (process.env.NANOCLAW_TEST_MODE !== '1') {
  main().catch((err) => {
    logger.error({ err }, 'Failed to start NanoClaw');
    process.exit(1);
  });
}
