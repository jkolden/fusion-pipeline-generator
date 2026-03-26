import type { EntityConfig, BipConfig, OtbiConfig, ColumnDef, DedupConfig, MashupConfig, ExtractionType, ValidationResult } from './types'

const ORACLE_RESERVED = [
  'ACCESS', 'ADD', 'ALL', 'ALTER', 'AND', 'ANY', 'AS', 'ASC', 'AUDIT',
  'BETWEEN', 'BY', 'CHAR', 'CHECK', 'CLUSTER', 'COLUMN', 'COMMENT',
  'COMPRESS', 'CONNECT', 'CREATE', 'CURRENT', 'DATE', 'DECIMAL', 'DEFAULT',
  'DELETE', 'DESC', 'DISTINCT', 'DROP', 'ELSE', 'EXCLUSIVE', 'EXISTS',
  'FILE', 'FLOAT', 'FOR', 'FROM', 'GRANT', 'GROUP', 'HAVING', 'IDENTIFIED',
  'IMMEDIATE', 'IN', 'INCREMENT', 'INDEX', 'INITIAL', 'INSERT', 'INTEGER',
  'INTERSECT', 'INTO', 'IS', 'LEVEL', 'LIKE', 'LOCK', 'LONG', 'MAXEXTENTS',
  'MINUS', 'MODE', 'MODIFY', 'NOAUDIT', 'NOCOMPRESS', 'NOT', 'NOWAIT', 'NULL',
  'NUMBER', 'OF', 'OFFLINE', 'ON', 'ONLINE', 'OPTION', 'OR', 'ORDER',
  'PCTFREE', 'PRIOR', 'PUBLIC', 'RAW', 'RENAME', 'RESOURCE', 'REVOKE',
  'ROW', 'ROWID', 'ROWNUM', 'ROWS', 'SELECT', 'SESSION', 'SET', 'SHARE',
  'SIZE', 'SMALLINT', 'START', 'SUCCESSFUL', 'SYNONYM', 'SYSDATE', 'TABLE',
  'THEN', 'TO', 'TRIGGER', 'UID', 'UNION', 'UNIQUE', 'UPDATE', 'USER',
  'VALIDATE', 'VALUES', 'VARCHAR', 'VARCHAR2', 'VIEW', 'WHENEVER', 'WHERE', 'WITH',
]

export function validateStep1(
  extractionType: ExtractionType,
  entity: EntityConfig,
  bipConfig: BipConfig,
  otbiConfig: OtbiConfig,
): ValidationResult {
  const errors: string[] = []

  if (extractionType === 'BICC') {
    if (!entity.loadType) {
      errors.push('Load type is required')
    } else if (!/^[A-Z][A-Z0-9_]*$/.test(entity.loadType)) {
      errors.push('Load type must be uppercase letters, numbers, and underscores')
    }
    if (!entity.moduleCode) errors.push('Module code is required')
    if (!entity.priority || entity.priority < 10 || entity.priority > 99) {
      errors.push('Priority must be between 10 and 99')
    }
    if (!entity.fileLikePattern || !entity.fileLikePattern.includes('%')) {
      errors.push('FILE_LIKE pattern must contain at least one % wildcard')
    }
    if (!entity.rawCsvHeader) {
      errors.push('CSV header is required — paste a header row or upload a CSV')
    }
  } else if (extractionType === 'BIP') {
    if (!bipConfig.tableName) {
      errors.push('Target table name is required')
    } else if (!/^[A-Z][A-Z0-9_]*$/.test(bipConfig.tableName)) {
      errors.push('Table name must be uppercase letters, numbers, and underscores')
    }
    if (!bipConfig.reportCatalogPath) {
      errors.push('Report catalog path is required')
    }
    if (!bipConfig.rawColumnNames) {
      errors.push('BIP column names are required')
    }
  } else if (extractionType === 'OTBI') {
    if (!otbiConfig.tableName) {
      errors.push('Target table name is required')
    } else if (!/^[A-Z][A-Z0-9_]*$/.test(otbiConfig.tableName)) {
      errors.push('Table name must be uppercase letters, numbers, and underscores')
    }
    if (!otbiConfig.logicalSql) {
      errors.push('OTBI logical SQL is required')
    }
    if (!otbiConfig.instanceBaseUrl) {
      errors.push('Fusion instance base URL is required')
    }
  }

  return { valid: errors.length === 0, errors }
}

export function validateStep2(
  columns: ColumnDef[],
  dedup: DedupConfig,
  extractionType: ExtractionType = 'BICC',
): ValidationResult {
  const errors: string[] = []
  const staging = columns.filter((c) => c.includeInStaging)

  if (staging.length === 0) errors.push('At least one column must be included in staging')
  if (!staging.some((c) => c.isPrimaryKey)) errors.push('At least one primary key column is required')

  for (const col of staging) {
    if (ORACLE_RESERVED.includes(col.stagingName.toUpperCase())) {
      errors.push(`"${col.stagingName}" is an Oracle reserved word — rename it (e.g., ${col.stagingName}_CODE)`)
    }
  }

  // Dedup validation only for BICC (BIP/OTBI use direct MERGE ON PK)
  if (extractionType === 'BICC') {
    if (!dedup.orderByColumn) errors.push('Dedup order-by column is required')
  }

  return { valid: errors.length === 0, errors }
}

export function validateStep3(mashup: MashupConfig): ValidationResult {
  if (!mashup.enabled) return { valid: true, errors: [] }

  const errors: string[] = []

  if (!mashup.lawsonTableName || mashup.lawsonTableName === 'UNKNOWN') {
    errors.push('Lawson table DDL is required')
  }

  if (mashup.pattern === 'FULL_OUTER_JOIN' && mashup.joinKeys.length === 0) {
    errors.push('At least one join key pair is required for FULL OUTER JOIN')
  }

  return { valid: errors.length === 0, errors }
}
