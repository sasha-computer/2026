import { expect, test } from 'bun:test';

import {
  executeBotCommand,
  splitMessage,
} from '../../src/router-helpers.js';
import { RegisteredGroup } from '../../src/types.js';

test('splitMessage prefers newlines then spaces', () => {
  const text = 'hello\nworld here';
  const chunks = splitMessage(text, 8);
  expect(chunks).toEqual(['hello', 'world', 'here']);
});

test('executeBotCommand /new clears session and timestamp', () => {
  const sessions = { main: { chan: 'sess-1' } };
  const lastAgentTimestamp = { chan: '2026-01-01T00:00:00.000Z' };
  let deleteSessionCalled = false;
  let saveStateCalled = false;

  const registration: RegisteredGroup = {
    name: 'main',
    folder: 'main',
    trigger: 'none',
    added_at: new Date().toISOString(),
    requiresTrigger: false,
  };

  const response = executeBotCommand(
    'new',
    'chan',
    registration,
    {
      sessions,
      lastAgentTimestamp,
      registeredGroups: { chan: registration },
      startTime: Date.now(),
      maxConcurrentAgents: 3,
      deleteSession: () => {
        deleteSessionCalled = true;
      },
      saveState: () => {
        saveStateCalled = true;
      },
      storeMessage: () => {},
      enqueueMessageCheck: () => {},
      getActiveCount: () => 0,
    },
    'user-1',
  );

  expect(response).toContain('Session reset');
  expect(sessions.main.chan).toBeUndefined();
  expect(lastAgentTimestamp.chan).toBeUndefined();
  expect(deleteSessionCalled).toBe(true);
  expect(saveStateCalled).toBe(true);
});

test('executeBotCommand /clear stores summary and enqueues', () => {
  const sessions = { main: { chan: 'sess-1' } };
  const lastAgentTimestamp = { chan: '2026-01-01T00:00:00.000Z' };
  let storeCalled = false;
  let enqueueCalled = false;

  const registration: RegisteredGroup = {
    name: 'main',
    folder: 'main',
    trigger: 'none',
    added_at: new Date().toISOString(),
    requiresTrigger: false,
  };

  const response = executeBotCommand(
    'clear',
    'chan',
    registration,
    {
      sessions,
      lastAgentTimestamp,
      registeredGroups: { chan: registration },
      startTime: Date.now(),
      maxConcurrentAgents: 3,
      deleteSession: () => {},
      saveState: () => {},
      storeMessage: () => {
        storeCalled = true;
      },
      enqueueMessageCheck: () => {
        enqueueCalled = true;
      },
      getActiveCount: () => 0,
    },
    'user-1',
  );

  expect(response).toContain('Context compaction requested');
  expect(storeCalled).toBe(true);
  expect(enqueueCalled).toBe(true);
  expect(lastAgentTimestamp.chan).toBeUndefined();
});

test('executeBotCommand /status formats status response', () => {
  const registration: RegisteredGroup = {
    name: 'main',
    folder: 'main',
    trigger: 'none',
    added_at: new Date().toISOString(),
    requiresTrigger: true,
  };
  const startTime = Date.now() - (2 * 3600 + 5 * 60) * 1000;

  const response = executeBotCommand(
    'status',
    'chan',
    registration,
    {
      sessions: { main: { chan: 'sess-1234567890abcd' } },
      lastAgentTimestamp: {},
      registeredGroups: { chan: registration, other: registration },
      startTime,
      maxConcurrentAgents: 3,
      deleteSession: () => {},
      saveState: () => {},
      storeMessage: () => {},
      enqueueMessageCheck: () => {},
      getActiveCount: () => 1,
    },
  );

  expect(response).toContain('Gandalf Status');
  expect(response).toContain('Uptime: 2h 5m');
  expect(response).toContain('Agents: 1 active / 3 max');
  expect(response).toContain('Registered channels: 2');
  expect(response).toContain('Folder: `main`');
});
