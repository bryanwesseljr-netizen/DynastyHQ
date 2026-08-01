export const MIGRATION_BACKUP_DOCUMENT_ID = 'migration_backup_pre_v8';

export const createMigrationBackupPayload = ({
  sourceState,
  targetSchemaVersion,
  createdAt,
}) => ({
  ...sourceState,
  _migrationBackup: {
    sourceDocument: 'main',
    sourceSchemaVersion: Number(sourceState?.schemaVersion) || 0,
    targetSchemaVersion,
    createdAt,
  },
});

export const describeCloudSchema = (schemaVersion) => (
  Number(schemaVersion) > 0 ? `v${Number(schemaVersion)}` : 'Legacy / unversioned'
);
