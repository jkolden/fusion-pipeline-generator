export function parseCsvHeader(raw: string): string[] {
  let cleaned = raw.replace(/^\uFEFF/, '').trim()

  // Handle if the user pasted multiple lines (take first line only)
  const firstLine = cleaned.split(/\r?\n/)[0]
  if (firstLine) cleaned = firstLine

  const cols: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of cleaned) {
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      const trimmed = current.trim()
      if (trimmed) cols.push(trimmed)
      current = ''
      continue
    }
    current += char
  }

  const last = current.trim()
  if (last) cols.push(last)

  return cols
}
