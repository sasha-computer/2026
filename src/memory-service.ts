import crypto from 'crypto';

import { createMemoryItem, deleteMemoryItems, listMemoryItems } from './db.js';
import { logger } from './logger.js';
import { MemoryItem, MemoryScope, MemoryType } from './types.js';

const DEFAULT_LIMIT_PER_TYPE = 5;
const DEFAULT_MAX_ITEMS = 20;

export interface MemorySaveInput {
  scope: MemoryScope;
  scope_key?: string | null;
  type: MemoryType;
  content: string;
  source?: string | null;
  importance?: number;
  ttl_seconds?: number | null;
  replace?: boolean;
}

export interface MemoryListFilters {
  scope?: MemoryScope;
  scope_key?: string | null;
  type?: MemoryType;
  limit?: number;
  includeExpired?: boolean;
}

export function saveMemoryItem(input: MemorySaveInput): MemoryItem {
  const now = new Date().toISOString();
  const id = `mem_${crypto.randomUUID()}`;
  const scopeKey = input.scope === 'global' ? null : input.scope_key ?? null;

  if (input.replace) {
    deleteMemoryItems({
      scope: input.scope,
      scope_key: scopeKey,
      type: input.type,
    });
  }

  const item: MemoryItem = {
    id,
    scope: input.scope,
    scope_key: scopeKey,
    type: input.type,
    content: input.content,
    source: input.source ?? null,
    importance: input.importance ?? 0,
    created_at: now,
    updated_at: now,
    ttl_seconds: input.ttl_seconds ?? null,
  };

  createMemoryItem(item);
  logger.info(
    { id: item.id, scope: item.scope, type: item.type },
    'Memory item saved',
  );
  return item;
}

export function listMemory(filters: MemoryListFilters): MemoryItem[] {
  return listMemoryItems(filters);
}

export function forgetMemory(filters: {
  id?: string;
  scope?: MemoryScope;
  scope_key?: string | null;
  type?: MemoryType;
  contains?: string;
}): number {
  const deleted = deleteMemoryItems(filters);
  logger.info({ deleted }, 'Memory items deleted');
  return deleted;
}

export function orderMemoryItems(items: MemoryItem[]): MemoryItem[] {
  return [...items].sort((a, b) => {
    if (a.importance !== b.importance) return b.importance - a.importance;
    if (a.updated_at !== b.updated_at) return b.updated_at.localeCompare(a.updated_at);
    return b.created_at.localeCompare(a.created_at);
  });
}

export function selectEffectiveMemoryItems(params: {
  globalItems: MemoryItem[];
  userItems: MemoryItem[];
  channelItems: MemoryItem[];
  limitPerType: number;
  maxItems: number;
}): MemoryItem[] {
  const ordered = [
    ...orderMemoryItems(params.globalItems),
    ...orderMemoryItems(params.userItems),
    ...orderMemoryItems(params.channelItems),
  ];
  const perTypeCounts = new Map<MemoryType, number>();
  const result: MemoryItem[] = [];

  for (const item of ordered) {
    if (result.length >= params.maxItems) break;
    const count = perTypeCounts.get(item.type) ?? 0;
    if (count >= params.limitPerType) continue;
    perTypeCounts.set(item.type, count + 1);
    result.push(item);
  }

  return result;
}

export function getEffectiveMemoryItems(params: {
  chatJid: string;
  userId?: string;
  limitPerType?: number;
  maxItems?: number;
}): MemoryItem[] {
  const limitPerType = params.limitPerType ?? DEFAULT_LIMIT_PER_TYPE;
  const maxItems = params.maxItems ?? DEFAULT_MAX_ITEMS;

  const globalItems = listMemoryItems({
    scope: 'global',
    scope_key: null,
    limit: 100,
  });
  const userItems = params.userId
    ? listMemoryItems({
        scope: 'user',
        scope_key: params.userId,
        limit: 100,
      })
    : [];
  const channelItems = listMemoryItems({
    scope: 'channel',
    scope_key: params.chatJid,
    limit: 100,
  });

  return selectEffectiveMemoryItems({
    globalItems,
    userItems,
    channelItems,
    limitPerType,
    maxItems,
  });
}

export function formatMemoryBlock(items: MemoryItem[]): string | null {
  if (items.length === 0) return null;
  const lines = items.map((item) => {
    const scopeLabel =
      item.scope === 'global'
        ? 'global'
        : item.scope === 'channel'
          ? `channel:${item.scope_key ?? 'unknown'}`
          : `user:${item.scope_key ?? 'unknown'}`;
    return `- (${scopeLabel}/${item.type}) ${item.content}`;
  });
  return `<memory>\n${lines.join('\n')}\n</memory>`;
}
