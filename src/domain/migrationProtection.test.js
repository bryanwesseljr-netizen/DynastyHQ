import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMigrationBackupPayload,
  describeCloudSchema,
  MIGRATION_BACKUP_DOCUMENT_ID,
} from './migrationProtection.js';

test('creates a restorable migration backup without changing source fields', () => {
  const sourceState = {
    player: { name: 'Test Player' },
    recruiting: [{ name: 'Test University' }],
  };

  const backup = createMigrationBackupPayload({
    sourceState,
    targetSchemaVersion: 8,
    createdAt: '2026-07-31T12:00:00.000Z',
  });

  assert.deepEqual(backup.player, sourceState.player);
  assert.deepEqual(backup.recruiting, sourceState.recruiting);
  assert.deepEqual(backup._migrationBackup, {
    sourceDocument: 'main',
    sourceSchemaVersion: 0,
    targetSchemaVersion: 8,
    createdAt: '2026-07-31T12:00:00.000Z',
  });
  assert.equal(MIGRATION_BACKUP_DOCUMENT_ID, 'migration_backup_pre_v8');
});

test('describes versioned and legacy cloud saves clearly', () => {
  assert.equal(describeCloudSchema(8), 'v8');
  assert.equal(describeCloudSchema(undefined), 'Legacy / unversioned');
});
