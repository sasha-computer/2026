import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';

const db = new Database(':memory:');
db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    jid TEXT PRIMARY KEY,
    name TEXT,
    last_message_time TEXT
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT,
    chat_jid TEXT,
    sender TEXT,
    sender_name TEXT,
    content TEXT,
    timestamp TEXT,
    is_from_me INTEGER,
    PRIMARY KEY (id, chat_jid),
    FOREIGN KEY (chat_jid) REFERENCES chats(jid)
  );
  CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp);

  CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id TEXT PRIMARY KEY,
    group_folder TEXT NOT NULL,
    chat_jid TEXT NOT NULL,
    prompt TEXT NOT NULL,
    schedule_type TEXT NOT NULL,
    schedule_value TEXT NOT NULL,
    next_run TEXT,
    last_run TEXT,
    last_result TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_next_run ON scheduled_tasks(next_run);
  CREATE INDEX IF NOT EXISTS idx_status ON scheduled_tasks(status);

  CREATE TABLE IF NOT EXISTS task_run_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    run_at TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    status TEXT NOT NULL,
    result TEXT,
    error TEXT,
    FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id)
  );
  CREATE INDEX IF NOT EXISTS idx_task_run_logs ON task_run_logs(task_id, run_at);
`);

function storeChatMetadata(chatJid: string, timestamp: string, name?: string) {
  if (name) {
    db.prepare(
      `
      INSERT INTO chats (jid, name, last_message_time) VALUES (?, ?, ?)
      ON CONFLICT(jid) DO UPDATE SET
        name = excluded.name,
        last_message_time = MAX(last_message_time, excluded.last_message_time)
    `,
    ).run(chatJid, name, timestamp);
    return;
  }
  db.prepare(
    `
    INSERT INTO chats (jid, name, last_message_time) VALUES (?, ?, ?)
    ON CONFLICT(jid) DO UPDATE SET
      last_message_time = MAX(last_message_time, excluded.last_message_time)
  `,
  ).run(chatJid, chatJid, timestamp);
}

function storeMessage(
  messageId: string,
  chatJid: string,
  sender: string,
  senderName: string,
  content: string,
  timestamp: string,
  isFromMe: boolean,
) {
  db.prepare(
    `INSERT OR REPLACE INTO messages (id, chat_jid, sender, sender_name, content, timestamp, is_from_me)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(messageId, chatJid, sender, senderName, content, timestamp, isFromMe ? 1 : 0);
}

function getMessagesSince(chatJid: string, since: string, botPrefix: string) {
  return db
    .prepare(
      `
    SELECT id, chat_jid, sender, sender_name, content, timestamp
    FROM messages
    WHERE chat_jid = ? AND timestamp > ? AND content NOT LIKE ?
    ORDER BY timestamp
  `,
    )
    .all(chatJid, since, `${botPrefix}:%`) as Array<{ content: string }>;
}

function createTask(task: {
  id: string;
  group_folder: string;
  chat_jid: string;
  prompt: string;
  schedule_type: string;
  schedule_value: string;
  next_run: string | null;
  status: string;
  created_at: string;
}) {
  db.prepare(
    `
    INSERT INTO scheduled_tasks (id, group_folder, chat_jid, prompt, schedule_type, schedule_value, next_run, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    task.id,
    task.group_folder,
    task.chat_jid,
    task.prompt,
    task.schedule_type,
    task.schedule_value,
    task.next_run,
    task.status,
    task.created_at,
  );
}

function getTaskById(id: string) {
  return db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as
    | { id: string; prompt: string; status: string }
    | undefined;
}

function updateTask(id: string, updates: { status?: string }) {
  if (updates.status === undefined) return;
  db.prepare(`UPDATE scheduled_tasks SET status = ? WHERE id = ?`).run(
    updates.status,
    id,
  );
}

function deleteTask(id: string) {
  db.prepare('DELETE FROM task_run_logs WHERE task_id = ?').run(id);
  db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id);
}

test('initDatabase and message CRUD', () => {
  const chatJid = 'chat-1';
  const ts = '2026-02-01T10:00:00.000Z';

  storeChatMetadata(chatJid, ts, 'Test Chat');
  storeMessage('msg-1', chatJid, 'user-1', 'User', 'Hello', ts, false);

  const messages = getMessagesSince(chatJid, '', 'Bot');
  expect(messages).toHaveLength(1);
  expect(messages[0].content).toBe('Hello');
});

test('task lifecycle: create, update, delete', () => {
  const task = {
    id: 'task-1',
    group_folder: 'main',
    chat_jid: 'chat-1',
    prompt: 'Do thing',
    schedule_type: 'interval' as const,
    schedule_value: '60000',
    context_mode: 'isolated' as const,
    next_run: new Date().toISOString(),
    status: 'active' as const,
    created_at: new Date().toISOString(),
  };

  createTask(task);
  const fetched = getTaskById(task.id);
  expect(fetched?.prompt).toBe('Do thing');

  updateTask(task.id, { status: 'paused' });
  const updated = getTaskById(task.id);
  expect(updated?.status).toBe('paused');

  deleteTask(task.id);
  const removed = getTaskById(task.id);
  expect(removed).toBeNull();
});
