import type { ColumnDef, OracleType } from './types'

interface InferredDefaults {
  oracleType: OracleType
  typeSize?: number
  includeInStaging: boolean
  isDateField: boolean
}

export function inferColumnDefaults(landingName: string): InferredDefaults {
  const upper = landingName.toUpperCase()

  if (upper.endsWith('ID') || upper.endsWith('_ID')) {
    return { oracleType: 'NUMBER', includeInStaging: true, isDateField: false }
  }

  // Check for date columns — but exclude _BY columns (LAST_UPDATED_BY, CREATED_BY, etc.)
  if (!upper.endsWith('_BY') && !upper.endsWith('BY')) {
    if (
      upper.endsWith('_DATE') ||
      upper.endsWith('DATE') ||
      upper.includes('EFFECTIVESTART') ||
      upper.includes('EFFECTIVEEND') ||
      upper.includes('TIMESTAMP')
    ) {
      return { oracleType: 'TIMESTAMP(6)', includeInStaging: true, isDateField: true }
    }
  }

  if (upper.includes('FLAG') || upper.includes('INDICATOR')) {
    return { oracleType: 'VARCHAR2', typeSize: 1, includeInStaging: true, isDateField: false }
  }

  if (
    upper.includes('AMOUNT') ||
    upper.includes('RATE') ||
    upper.includes('SALARY') ||
    upper.includes('BALANCE') ||
    upper.includes('FTE') ||
    upper.includes('HOURS') ||
    upper.includes('SEQUENCE') ||
    upper.includes('REVISION') ||
    upper.includes('QUANTITY') ||
    upper.includes('PRICE')
  ) {
    return { oracleType: 'NUMBER', includeInStaging: true, isDateField: false }
  }

  if (upper.includes('NAME') || upper.includes('DESCRIPTION')) {
    return { oracleType: 'VARCHAR2', typeSize: 400, includeInStaging: true, isDateField: false }
  }

  if (upper.includes('CODE') || upper.includes('TYPE') || upper.includes('STATUS') || upper.includes('NUMBER')) {
    return { oracleType: 'VARCHAR2', typeSize: 80, includeInStaging: true, isDateField: false }
  }

  if (upper.includes('EMAIL')) {
    return { oracleType: 'VARCHAR2', typeSize: 200, includeInStaging: true, isDateField: false }
  }

  return { oracleType: 'VARCHAR2', typeSize: 4000, includeInStaging: false, isDateField: false }
}

export function buildColumnDefs(landingNames: string[]): ColumnDef[] {
  return landingNames.map((name) => {
    const defaults = inferColumnDefaults(name)
    return {
      landingName: name,
      stagingName: name.toUpperCase(),
      includeInStaging: defaults.includeInStaging,
      oracleType: defaults.oracleType,
      typeSize: defaults.typeSize,
      isPrimaryKey: false,
      isSecondaryIndex: false,
      isDateField: defaults.isDateField,
    }
  })
}
