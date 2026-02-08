import { expect, test } from 'bun:test';
import { EventEmitter } from 'events';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { ChildProcess } from 'child_process';
import type { RegisteredGroup } from '../../src/types.js';

const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nanoclaw-runner-'));
process.env.NANOCLAW_PROJECT_ROOT = testRoot;

const { runAgent } = await import('../../src/process-runner.js');
test('runAgent parses output markers', async () => {
  const group: RegisteredGroup = {
    name: 'Test',
    folder: 'test',
    trigger: '@Test',
    added_at: new Date().toISOString(),
    requiresTrigger: false,
  };

  const output = {
    status: 'success',
    result: { outputType: 'message', userMessage: 'hi' },
  };

  let onProcessCalled = false;

  const spawnFn = () => {
    const proc = new EventEmitter() as ChildProcess & {
      stdin: { write: (data: string) => void; end: () => void };
      stdout: EventEmitter;
      stderr: EventEmitter;
      killed: boolean;
      exitCode: number | null;
      pid: number;
      kill: () => boolean;
    };

    proc.stdin = {
      write: () => {},
      end: () => {},
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.killed = false;
    proc.exitCode = null;
    proc.pid = 12345;
    proc.kill = () => {
      proc.killed = true;
      return true;
    };

    queueMicrotask(() => {
      proc.stdout.emit(
        'data',
        `---NANOCLAW_OUTPUT_START---${JSON.stringify(output)}---NANOCLAW_OUTPUT_END---`,
      );
      proc.exitCode = 0;
      proc.emit('close', 0);
    });

    return proc;
  };

  const result = await runAgent(
    group,
    {
      prompt: 'hello',
      groupFolder: group.folder,
      chatJid: 'chat-1',
      isMain: true,
    },
    () => {
      onProcessCalled = true;
    },
    spawnFn,
  );

  expect(onProcessCalled).toBe(true);
  expect(result.status).toBe('success');
  expect(result.result?.outputType).toBe('message');
  expect(result.result?.userMessage).toBe('hi');
});
