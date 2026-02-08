import { expect, test } from 'bun:test';

import {
  formatMemoryBlock,
  orderMemoryItems,
  selectEffectiveMemoryItems,
} from '../../src/memory-service.js';
import { MemoryItem } from '../../src/types.js';

function makeItem(
  overrides: Partial<MemoryItem> & { id: string },
): MemoryItem {
  return {
    id: overrides.id,
    scope: overrides.scope ?? 'global',
    scope_key: overrides.scope_key ?? null,
    type: overrides.type ?? 'fact',
    content: overrides.content ?? 'content',
    source: overrides.source ?? null,
    importance: overrides.importance ?? 0,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
    ttl_seconds: overrides.ttl_seconds ?? null,
  };
}

test('orderMemoryItems sorts by importance then updated_at', () => {
  const items = [
    makeItem({ id: 'a', importance: 1, updated_at: '2026-01-01T00:00:00.000Z' }),
    makeItem({ id: 'b', importance: 3, updated_at: '2026-01-02T00:00:00.000Z' }),
    makeItem({ id: 'c', importance: 3, updated_at: '2026-01-01T00:00:00.000Z' }),
  ];

  const ordered = orderMemoryItems(items).map((item) => item.id);
  expect(ordered).toEqual(['b', 'c', 'a']);
});

test('selectEffectiveMemoryItems enforces per-type and max limits', () => {
  const globalItems = [
    makeItem({ id: 'g1', type: 'fact', importance: 5 }),
    makeItem({ id: 'g2', type: 'fact', importance: 4 }),
  ];
  const userItems = [
    makeItem({ id: 'u1', scope: 'user', scope_key: 'user', type: 'fact', importance: 3 }),
    makeItem({ id: 'u2', scope: 'user', scope_key: 'user', type: 'preference', importance: 2 }),
  ];
  const channelItems = [
    makeItem({ id: 'c1', scope: 'channel', scope_key: 'chan', type: 'fact', importance: 1 }),
  ];

  const selected = selectEffectiveMemoryItems({
    globalItems,
    userItems,
    channelItems,
    limitPerType: 2,
    maxItems: 3,
  });

  const ids = selected.map((item) => item.id);
  expect(ids).toEqual(['g1', 'g2', 'u2']);
});

test('formatMemoryBlock renders memory block lines', () => {
  const items = [
    makeItem({ id: 'g1', scope: 'global', type: 'fact', content: 'Global fact' }),
    makeItem({ id: 'c1', scope: 'channel', scope_key: 'chan-1', type: 'preference', content: 'Channel pref' }),
  ];

  const block = formatMemoryBlock(items);
  expect(block).toContain('<memory>');
  expect(block).toContain('(global/fact) Global fact');
  expect(block).toContain('(channel:chan-1/preference) Channel pref');
});
