import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ORACLE_TYPES } from '@/lib/constants'
import { validateStep2 } from '@/lib/validators'
import type { ColumnDef, DedupConfig, ExtractionType, OracleType } from '@/lib/types'

interface StepColumnsProps {
  columns: ColumnDef[]
  dedup: DedupConfig
  extractionType: ExtractionType
  onUpdateColumn: (index: number, payload: Partial<ColumnDef>) => void
  onSetColumns: (columns: ColumnDef[]) => void
  onSetDedup: (payload: Partial<DedupConfig>) => void
  onBack: () => void
  onNext: () => void
}

export function StepColumns({ columns, dedup, extractionType, onUpdateColumn, onSetColumns, onSetDedup, onBack, onNext }: StepColumnsProps) {
  const stagingCount = columns.filter((c) => c.includeInStaging).length
  const pkCount = columns.filter((c) => c.isPrimaryKey).length
  const allSelected = columns.length > 0 && stagingCount === columns.length
  const validation = validateStep2(columns, dedup, extractionType)
  const showDedup = extractionType === 'BICC'
  const showXmlPath = extractionType === 'OTBI'

  const stagingColumns = columns.filter((c) => c.includeInStaging)

  const toggleAll = (include: boolean) => {
    onSetColumns(columns.map((c) => ({ ...c, includeInStaging: include })))
  }

  return (
    <Card className="mx-auto max-w-5xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Column Configuration
          <Badge variant="secondary">{stagingCount} of {columns.length} selected</Badge>
          {pkCount > 0 && <Badge>{pkCount} PK</Badge>}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-xs"
            onClick={() => toggleAll(!allSelected)}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </Button>
        </CardTitle>
        <CardDescription>
          Select which columns to include in staging, assign Oracle types, and designate keys
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-h-[500px] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Include</th>
                {showXmlPath && <th className="px-3 py-2 text-left font-medium">XML Path</th>}
                <th className="px-3 py-2 text-left font-medium">{extractionType === 'BICC' ? 'Landing Name' : 'Source Name'}</th>
                <th className="px-3 py-2 text-left font-medium">{extractionType === 'BICC' ? 'Staging Name' : 'Column Name'}</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Size</th>
                <th className="px-3 py-2 text-center font-medium">PK</th>
                <th className="px-3 py-2 text-center font-medium">IDX</th>
                <th className="px-3 py-2 text-center font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col, i) => (
                <tr
                  key={i}
                  className={`border-t ${col.includeInStaging ? 'bg-blue-50/50' : 'opacity-60'}`}
                >
                  <td className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={col.includeInStaging}
                      onChange={(e) => onUpdateColumn(i, { includeInStaging: e.target.checked })}
                    />
                  </td>
                  {showXmlPath && (
                    <td className="px-3 py-1.5 font-mono text-xs text-[var(--muted-foreground)]">
                      {col.xmlPath || ''}
                    </td>
                  )}
                  <td className="px-3 py-1.5 font-mono text-xs">{col.landingName}</td>
                  <td className="px-3 py-1.5">
                    <Input
                      className="h-7 text-xs font-mono"
                      value={col.stagingName}
                      onChange={(e) => onUpdateColumn(i, { stagingName: e.target.value.toUpperCase() })}
                      disabled={!col.includeInStaging}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <select
                      className="h-7 rounded border bg-[var(--background)] px-2 text-xs"
                      value={col.oracleType}
                      onChange={(e) => onUpdateColumn(i, { oracleType: e.target.value as OracleType })}
                      disabled={!col.includeInStaging}
                    >
                      {ORACLE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-1.5">
                    {col.oracleType === 'VARCHAR2' && (
                      <Input
                        className="h-7 w-20 text-xs"
                        type="number"
                        value={col.typeSize || ''}
                        onChange={(e) => onUpdateColumn(i, { typeSize: parseInt(e.target.value) || undefined })}
                        disabled={!col.includeInStaging}
                        placeholder="4000"
                      />
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={col.isPrimaryKey}
                      onChange={(e) => onUpdateColumn(i, { isPrimaryKey: e.target.checked })}
                      disabled={!col.includeInStaging}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={col.isSecondaryIndex}
                      onChange={(e) => onUpdateColumn(i, { isSecondaryIndex: e.target.checked })}
                      disabled={!col.includeInStaging}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={col.isDateField}
                      onChange={(e) => onUpdateColumn(i, { isDateField: e.target.checked })}
                      disabled={!col.includeInStaging}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showDedup && <div className="rounded-md border p-4 space-y-4">
          <h3 className="font-semibold text-sm">Deduplication Config</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order By Column (for ROW_NUMBER)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
                value={dedup.orderByColumn}
                onChange={(e) => onSetDedup({ orderByColumn: e.target.value })}
              >
                <option value="">Select column...</option>
                {stagingColumns.map((c) => (
                  <option key={c.stagingName} value={c.stagingName}>{c.stagingName}</option>
                ))}
              </select>
              <p className="text-xs text-[var(--muted-foreground)]">Usually a date column like LAST_UPDATE_DATE_TS</p>
            </div>
            <div className="space-y-2">
              <Label>Filter Expression (optional)</Label>
              <Input
                placeholder="e.g., nvl(primary_flag,'N') = 'Y'"
                value={dedup.filterExpression || ''}
                onChange={(e) => onSetDedup({ filterExpression: e.target.value || undefined })}
              />
            </div>
          </div>
          {dedup.partitionByColumns.length > 0 && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Partition by (auto from PK): {dedup.partitionByColumns.join(', ')}
            </p>
          )}
        </div>}

        {!validation.valid && (
          <div className="rounded-md border border-[var(--destructive)] bg-red-50 p-3">
            <ul className="text-sm text-[var(--destructive)]">
              {validation.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={onNext} disabled={!validation.valid}>
            {extractionType === 'BICC' ? 'Next: Mashup View' : 'Next: Generate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
