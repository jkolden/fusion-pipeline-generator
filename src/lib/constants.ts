import type { ModuleCode, OracleType } from './types'

export const MODULE_CODES: { value: ModuleCode; label: string }[] = [
  { value: 'HCM', label: 'HCM - Human Capital Management' },
  { value: 'AP', label: 'AP - Accounts Payable' },
  { value: 'GL', label: 'GL - General Ledger' },
  { value: 'PO', label: 'PO - Purchasing' },
  { value: 'SCM', label: 'SCM - Supply Chain' },
  { value: 'FIN', label: 'FIN - Financials' },
  { value: 'OTHER', label: 'OTHER' },
]

export const ORACLE_TYPES: { value: OracleType; label: string }[] = [
  { value: 'VARCHAR2', label: 'VARCHAR2' },
  { value: 'NUMBER', label: 'NUMBER' },
  { value: 'TIMESTAMP(6)', label: 'TIMESTAMP(6)' },
  { value: 'CLOB', label: 'CLOB' },
]

export const DEFAULT_VARCHAR2_SIZES: Record<string, number> = {
  flag: 1,
  indicator: 1,
  code: 30,
  type: 80,
  status: 30,
  number: 30,
  name: 400,
  description: 4000,
  email: 200,
  default: 200,
}
