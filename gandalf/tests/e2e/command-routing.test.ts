import { expect, test } from 'bun:test';

import { createBotCommandHandler } from '../../src/router-helpers.js';
import { RegisteredGroup } from '../../src/types.js';

test('command handler routes /status to sendMessage', async () => {
  let sentText = '';

  const registration: RegisteredGroup = {
    name: 'main',
    folder: 'main',
    trigger: 'none',
    added_at: new Date().toISOString(),
    requiresTrigger: false,
  };

  const handleBotCommand = createBotCommandHandler({
    sessions: { main: { chan: 'sess-1' } },
    lastAgentTimestamp: {},
    registeredGroups: { chan: registration },
    startTime: Date.now() - 60_000,
    maxConcurrentAgents: 2,
    deleteSession: () => {},
    saveState: () => {},
    storeMessage: () => {},
    enqueueMessageCheck: () => {},
    getActiveCount: () => 0,
    sendMessage: async (_channelId, text) => {
      sentText = text;
    },
  });

  const handled = await handleBotCommand(
    { content: '/status', author: { id: 'user-1' } },
    'chan',
    registration,
  );

  expect(handled).toBe(true);
  expect(sentText).toContain('Gandalf Status');
});
