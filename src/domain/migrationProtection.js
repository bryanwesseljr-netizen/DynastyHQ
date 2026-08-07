export const MIGRATION_BACKUP_DOCUMENT_ID = 'migration_backup_pre_v8';

export const getMigrationBackupDocumentId = (targetSchemaVersion) => {
  const version = Number(targetSchemaVersion);
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('A valid target schema version is required for migration backup.');
  }
  return `migration_backup_pre_v${version}`;
};

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
