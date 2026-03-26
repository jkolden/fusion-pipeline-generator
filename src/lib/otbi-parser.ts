/**
 * Parse OTBI logical SQL to extract column definitions.
 *
 * OTBI SELECT clauses look like:
 *   0 s_0,
 *   "Subject Area"."Folder"."Column Name" s_1,
 *   DESCRIPTOR_IDOF("Subject Area"."Folder"."Column Name") s_15,
 *   "Subject Area"."Measures"."Metric Name" s_24
 *
 * The XML response uses Column1, Column2, ... (matching s_1, s_2, ...).
 * We extract the last quoted segment as the suggested Oracle column name.
 */

export interface OtbiParsedColumn {
  position: number        // maps to ColumnN in XMLTABLE
  alias: string           // e.g., s_1
  suggestedName: string   // e.g., EVENT_NUMBER
  otbiPath: string        // full OTBI path or expression
  isDescriptor: boolean
  isConstant: boolean
}

/**
 * Split a SELECT clause into individual items, respecting nested parens and quotes.
 */
function splitSelectItems(selectClause: string): string[] {
  const items: string[] = []
  let current = ''
  let parenDepth = 0
  let inQuote = false

  for (let i = 0; i < selectClause.length; i++) {
    const ch = selectClause[i]

    if (ch === '"' && parenDepth === 0) {
      inQuote = !inQuote
      current += ch
    } else if (ch === '(' && !inQuote) {
      parenDepth++
      current += ch
    } else if (ch === ')' && !inQuote) {
      parenDepth--
      current += ch
    } else if (ch === ',' && parenDepth === 0 && !inQuote) {
      items.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }

  if (current.trim()) {
    items.push(current.trim())
  }

  return items
}

/**
 * Extract the last quoted segment from an OTBI column path.
 * "Subject Area"."Folder"."Column Name" → "Column Name"
 */
function extractLastQuotedSegment(path: string): string | null {
  const matches = path.match(/"([^"]+)"/g)
  if (!matches || matches.length === 0) return null
  // Return the last quoted segment without quotes
  return matches[matches.length - 1].replace(/"/g, '')
}

/**
 * Convert a human-readable name to SCREAMING_SNAKE_CASE Oracle column name.
 * "Event Number" → EVENT_NUMBER
 * "Bill-to Customer Name" → BILL_TO_CUSTOMER_NAME
 */
function toOracleColumnName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Parse OTBI logical SQL and extract column definitions.
 */
export function parseOtbiSql(sql: string): OtbiParsedColumn[] {
  // Extract the SELECT ... FROM portion
  const selectMatch = sql.match(/SELECT\s+([\s\S]*?)\s+FROM\s+"/i)
  if (!selectMatch) return []

  const items = splitSelectItems(selectMatch[1])
  const columns: OtbiParsedColumn[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i].trim()

    // Extract alias (s_N pattern at end)
    const aliasMatch = item.match(/\bs_(\d+)\s*$/)
    const alias = aliasMatch ? `s_${aliasMatch[1]}` : `s_${i}`
    const position = aliasMatch ? parseInt(aliasMatch[1]) : i

    // Check for constant (e.g., "0 s_0")
    if (/^\d+\s+s_\d+\s*$/.test(item)) {
      columns.push({
        position,
        alias,
        suggestedName: `CONSTANT_${position}`,
        otbiPath: item,
        isDescriptor: false,
        isConstant: true,
      })
      continue
    }

    // Check for DESCRIPTOR_IDOF
    if (/^DESCRIPTOR_IDOF\s*\(/i.test(item)) {
      const innerPath = item.replace(/^DESCRIPTOR_IDOF\s*\(/i, '').replace(/\)\s*s_\d+\s*$/, '')
      const segment = extractLastQuotedSegment(innerPath)
      columns.push({
        position,
        alias,
        suggestedName: segment ? toOracleColumnName(segment) + '_DESC_ID' : `DESCRIPTOR_${position}`,
        otbiPath: item,
        isDescriptor: true,
        isConstant: false,
      })
      continue
    }

    // Normal column: extract last quoted segment
    const pathPart = item.replace(/\s+s_\d+\s*$/, '')
    const segment = extractLastQuotedSegment(pathPart)
    const suggestedName = segment ? toOracleColumnName(segment) : `COLUMN_${position}`

    columns.push({
      position,
      alias,
      suggestedName,
      otbiPath: pathPart.trim(),
      isDescriptor: false,
      isConstant: false,
    })
  }

  return columns
}

/**
 * Convert parsed OTBI columns to the column names array for Step 2.
 * Excludes constants and DESCRIPTOR_IDOF by default.
 */
export function otbiColumnsToNames(parsed: OtbiParsedColumn[]): string[] {
  return parsed
    .filter((c) => !c.isConstant)
    .map((c) => c.suggestedName)
}
