import { expect, test } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { writeIpcFile } from '../../src/ipc-mcp.js';

test('writeIpcFile writes JSON atomically', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gandalf-ipc-'));
  const payload = { type: 'message', text: 'hello' };

  const filename = writeIpcFile(dir, payload);
  const filepath = path.join(dir, filename);

  expect(fs.existsSync(filepath)).toBe(true);
  const contents = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  expect(contents).toEqual(payload);
});
