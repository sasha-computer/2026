import path from 'path';

export const SCHEDULER_POLL_INTERVAL = 60000;

// Discord configuration
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '';
export const DISCORD_MAIN_CHANNEL_ID = process.env.DISCORD_MAIN_CHANNEL_ID || '';
export const DISCORD_IGNORE_CHANNEL_IDS = new Set(
  (process.env.DISCORD_IGNORE_CHANNEL_IDS || '').split(',').filter(Boolean),
);
export const DISCORD_MAX_MESSAGE_LENGTH = 2000;

// Paths
const PROJECT_ROOT = process.env.GANDALF_PROJECT_ROOT || process.cwd();
export const STORE_DIR = path.resolve(PROJECT_ROOT, 'store');
export const GROUPS_DIR = path.resolve(PROJECT_ROOT, 'groups');
export const DATA_DIR = path.resolve(PROJECT_ROOT, 'data');
export const MAIN_GROUP_FOLDER = 'main';

// Agent configuration (backward-compat env var fallbacks)
export const AGENT_TIMEOUT = parseInt(
  process.env.AGENT_TIMEOUT || process.env.CONTAINER_TIMEOUT || '300000',
  10,
);
export const AGENT_MAX_OUTPUT_SIZE = parseInt(
  process.env.AGENT_MAX_OUTPUT_SIZE || process.env.CONTAINER_MAX_OUTPUT_SIZE || '10485760',
  10,
); // 10MB default
export const IPC_POLL_INTERVAL = 1000;
export const MAX_CONCURRENT_AGENTS = Math.max(
  1,
  parseInt(process.env.MAX_CONCURRENT_AGENTS || process.env.MAX_CONCURRENT_CONTAINERS || '5', 10) || 5,
);

export const ASSISTANT_NAME = process.env.ASSISTANT_NAME || 'Gandalf';
export const BOT_MESSAGE_PREFIX = process.env.BOT_MESSAGE_PREFIX || '';

// Timezone for scheduled tasks (cron expressions, etc.)
// Uses system timezone by default
export const TIMEZONE =
  process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
