import type { LawsonColumn } from './types'

export function parseLawsonDdl(ddl: string): { tableName: string; columns: LawsonColumn[] } {
  const tableMatch = ddl.match(/CREATE\s+TABLE\s+"?(\w+)"?\s*\(/i)
  const tableName = tableMatch?.[1] || 'UNKNOWN'

  const columns: LawsonColumn[] = []
  const bodyMatch = ddl.match(/\(([\s\S]+)\)/)
  if (bodyMatch) {
    const lines = bodyMatch[1].split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      // Skip constraints, indexes, etc.
      if (/^(CONSTRAINT|PRIMARY|UNIQUE|INDEX|CHECK|FOREIGN)/i.test(trimmed)) continue
      const colMatch = trimmed.match(/^"?(\w+)"?\s+([\w(),.]+)/)
      if (colMatch) {
        columns.push({ name: colMatch[1], type: colMatch[2] })
      }
    }
  }

  return { tableName, columns }
}
