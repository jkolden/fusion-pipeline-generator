import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import { parseLawsonDdl } from '@/lib/ddl-parser'
import { validateStep3 } from '@/lib/validators'
import type { MashupConfig, JoinKeyPair, ColumnMapping, ColumnDef, ExtractionType } from '@/lib/types'

interface StepMashupProps {
  mashup: MashupConfig
  fusionColumns: ColumnDef[]
  extractionType: ExtractionType
  onSetMashup: (payload: Partial<MashupConfig>) => void
  onBack: () => void
  onNext: () => void
}

export function StepMashup({ mashup, fusionColumns, extractionType, onSetMashup, onBack, onNext }: StepMashupProps) {
  const validation = validateStep3(mashup)
  const stagingCols = fusionColumns.filter((c) => c.includeInStaging)

  const handleDdlChange = (ddl: string) => {
    const parsed = parseLawsonDdl(ddl)
    onSetMashup({
      lawsonTableDdl: ddl,
      lawsonTableName: parsed.tableName,
      lawsonColumns: parsed.columns,
    })
  }

  const addJoinKey = () => {
    onSetMashup({
      joinKeys: [...mashup.joinKeys, { fusionColumn: '', lawsonColumn: '' }],
    })
  }

  const updateJoinKey = (index: number, payload: Partial<JoinKeyPair>) => {
    const keys = [...mashup.joinKeys]
    keys[index] = { ...keys[index], ...payload }
    onSetMashup({ joinKeys: keys })
  }

  const removeJoinKey = (index: number) => {
    onSetMashup({ joinKeys: mashup.joinKeys.filter((_, i) => i !== index) })
  }

  const addMapping = () => {
    onSetMashup({
      columnMappings: [...mashup.columnMappings, { fusionColumn: '', lawsonColumn: '', matchFlagName: '' }],
    })
  }

  const updateMapping = (index: number, payload: Partial<ColumnMapping>) => {
    const mappings = [...mashup.columnMappings]
    mappings[index] = { ...mappings[index], ...payload }
    onSetMashup({ columnMappings: mappings })
  }

  const removeMapping = (index: number) => {
    onSetMashup({ columnMappings: mashup.columnMappings.filter((_, i) => i !== index) })
  }

  // BIP/OTBI don't use mashup views
  if (extractionType !== 'BICC') {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Mashup View</CardTitle>
          <CardDescription>Not applicable for {extractionType} reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-[var(--muted-foreground)]">
            Mashup views combine Fusion + Lawson data and are only available for BICC extracts.
            Click Next to proceed to generation.
          </p>
          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>Back</Button>
            <Button onClick={onNext}>Next: Generate</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>Mashup View (Optional)</CardTitle>
        <CardDescription>
          Combine Fusion data with a Lawson table in a side-by-side view
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mashup.enabled}
              onChange={(e) => onSetMashup({ enabled: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">Enable Lawson mashup view</span>
          </label>
        </div>

        {mashup.enabled && (
          <>
            <div className="space-y-2">
              <Label>View Pattern</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pattern"
                    checked={mashup.pattern === 'FULL_OUTER_JOIN'}
                    onChange={() => onSetMashup({ pattern: 'FULL_OUTER_JOIN' })}
                  />
                  <span className="text-sm">FULL OUTER JOIN</span>
                  <Badge variant="secondary" className="text-[10px]">Side-by-side</Badge>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pattern"
                    checked={mashup.pattern === 'UNION_ALL'}
                    onChange={() => onSetMashup({ pattern: 'UNION_ALL' })}
                  />
                  <span className="text-sm">UNION ALL</span>
                  <Badge variant="secondary" className="text-[10px]">Stacked</Badge>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lawson Table DDL</Label>
                {mashup.lawsonTableName && mashup.lawsonTableName !== 'UNKNOWN' && (
                  <Badge variant="secondary">{mashup.lawsonTableName} ({mashup.lawsonColumns.length} cols)</Badge>
                )}
              </div>
              <Textarea
                placeholder="Paste the Lawson CREATE TABLE statement here..."
                rows={6}
                className="font-mono text-xs"
                value={mashup.lawsonTableDdl}
                onChange={(e) => handleDdlChange(e.target.value)}
              />
            </div>

            {mashup.pattern === 'FULL_OUTER_JOIN' && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Join Keys</Label>
                    <Button variant="outline" size="sm" onClick={addJoinKey} className="gap-1">
                      <Plus className="h-3 w-3" /> Add Key
                    </Button>
                  </div>
                  {mashup.joinKeys.map((jk, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        className="h-9 flex-1 rounded border bg-[var(--background)] px-2 text-sm"
                        value={jk.fusionColumn}
                        onChange={(e) => updateJoinKey(i, { fusionColumn: e.target.value })}
                      >
                        <option value="">Fusion column...</option>
                        {stagingCols.map((c) => (
                          <option key={c.stagingName} value={c.stagingName}>{c.stagingName}</option>
                        ))}
                      </select>
                      <span className="text-sm text-[var(--muted-foreground)]">=</span>
                      <select
                        className="h-9 flex-1 rounded border bg-[var(--background)] px-2 text-sm"
                        value={jk.lawsonColumn}
                        onChange={(e) => updateJoinKey(i, { lawsonColumn: e.target.value })}
                      >
                        <option value="">Lawson column...</option>
                        {mashup.lawsonColumns.map((c) => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <Input
                        className="h-9 w-48 text-xs"
                        placeholder="Transform (e.g., TRIM(l.COL))"
                        value={jk.transform || ''}
                        onChange={(e) => updateJoinKey(i, { transform: e.target.value || undefined })}
                      />
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeJoinKey(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Match Flag Columns</Label>
                    <Button variant="outline" size="sm" onClick={addMapping} className="gap-1">
                      <Plus className="h-3 w-3" /> Add Mapping
                    </Button>
                  </div>
                  {mashup.columnMappings.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        className="h-9 flex-1 rounded border bg-[var(--background)] px-2 text-sm"
                        value={m.fusionColumn}
                        onChange={(e) => updateMapping(i, { fusionColumn: e.target.value })}
                      >
                        <option value="">Fusion col...</option>
                        {stagingCols.map((c) => (
                          <option key={c.stagingName} value={c.stagingName}>{c.stagingName}</option>
                        ))}
                      </select>
                      <span className="text-sm text-[var(--muted-foreground)]">vs</span>
                      <select
                        className="h-9 flex-1 rounded border bg-[var(--background)] px-2 text-sm"
                        value={m.lawsonColumn}
                        onChange={(e) => updateMapping(i, { lawsonColumn: e.target.value })}
                      >
                        <option value="">Lawson col...</option>
                        {mashup.lawsonColumns.map((c) => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <Input
                        className="h-9 w-40 text-xs"
                        placeholder="FLAG_NAME"
                        value={m.matchFlagName}
                        onChange={(e) => updateMapping(i, { matchFlagName: e.target.value.toUpperCase() })}
                      />
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeMapping(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {mashup.enabled && !validation.valid && (
          <div className="rounded-md border border-[var(--destructive)] bg-red-50 p-3">
            <ul className="text-sm text-[var(--destructive)]">
              {validation.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={onNext} disabled={mashup.enabled && !validation.valid}>
            Next: Generate
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
