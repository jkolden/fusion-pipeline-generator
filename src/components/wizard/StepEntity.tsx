import { useState } from 'react'
import { Upload, FileText, Database, FileBarChart, BarChart3, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { MODULE_CODES } from '@/lib/constants'
import { validateStep1 } from '@/lib/validators'
import type { EntityConfig, BipConfig, OtbiConfig, ExtractionType, ModuleCode } from '@/lib/types'

interface StepEntityProps {
  extractionType: ExtractionType
  entity: EntityConfig
  bipConfig: BipConfig
  otbiConfig: OtbiConfig
  columnCount: number
  onExtractionTypeChange: (type: ExtractionType) => void
  onEntityChange: (payload: Partial<EntityConfig>) => void
  onBipConfigChange: (payload: Partial<BipConfig>) => void
  onOtbiConfigChange: (payload: Partial<OtbiConfig>) => void
  onParseCsv: (rawHeader: string) => void
  onParseBipColumns: (rawColumnNames: string) => void
  onParseOtbiSql: (logicalSql: string) => void
  onNext: () => void
}

const TYPE_OPTIONS: { value: ExtractionType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'BICC', label: 'BICC Extract', description: 'CSV from Oracle Fusion BICC', icon: <Database className="h-5 w-5" /> },
  { value: 'BIP', label: 'BIP Report', description: 'BI Publisher SOAP/XML report', icon: <FileBarChart className="h-5 w-5" /> },
  { value: 'OTBI', label: 'OTBI Report', description: 'Transactional BI logical SQL', icon: <BarChart3 className="h-5 w-5" /> },
]

export function StepEntity({
  extractionType, entity, bipConfig, otbiConfig, columnCount,
  onExtractionTypeChange, onEntityChange, onBipConfigChange, onOtbiConfigChange,
  onParseCsv, onParseBipColumns, onParseOtbiSql, onNext,
}: StepEntityProps) {
  const [csvText, setCsvText] = useState(entity.rawCsvHeader)
  const [bipColumnsText, setBipColumnsText] = useState(bipConfig.rawColumnNames)
  const [bipXmlStripped, setBipXmlStripped] = useState(false)
  const [otbiSqlText, setOtbiSqlText] = useState(otbiConfig.logicalSql)
  const validation = validateStep1(extractionType, entity, bipConfig, otbiConfig)

  const handleCsvPaste = (text: string) => {
    setCsvText(text)
    if (text.trim()) onParseCsv(text)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const firstLine = text.split(/\r?\n/)[0] || ''
      setCsvText(firstLine)
      onParseCsv(firstLine)
    }
    reader.readAsText(file)
  }

  const handleBipColumnsPaste = (text: string) => {
    // Detect XML and strip values client-side for privacy
    const xmlTagPattern = /<([A-Za-z_][A-Za-z0-9_]*)>/
    if (xmlTagPattern.test(text)) {
      const seen = new Set<string>()
      const names: string[] = []
      for (const match of text.matchAll(/<([A-Za-z_][A-Za-z0-9_]*)>/g)) {
        const tag = match[1]
        if (!seen.has(tag)) {
          seen.add(tag)
          names.push(tag)
        }
      }
      const cleaned = names.join(', ')
      setBipColumnsText(cleaned)
      setBipXmlStripped(true)
      if (cleaned) onParseBipColumns(cleaned)
    } else {
      setBipColumnsText(text)
      setBipXmlStripped(false)
      if (text.trim()) onParseBipColumns(text)
    }
  }

  const handleOtbiSqlPaste = (text: string) => {
    setOtbiSqlText(text)
    if (text.trim()) onParseOtbiSql(text)
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Entity Setup</CardTitle>
        <CardDescription>Choose the extraction type and provide the source metadata</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Extraction Type Selector */}
        <div className="space-y-2">
          <Label>Extraction Type</Label>
          <div className="grid grid-cols-3 gap-3">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors ${
                  extractionType === opt.value
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                    : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                }`}
                onClick={() => {
                  onExtractionTypeChange(opt.value)
                  setCsvText('')
                  setBipColumnsText('')
                  setOtbiSqlText('')
                }}
              >
                {opt.icon}
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-[var(--muted-foreground)]">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* BICC Fields */}
        {extractionType === 'BICC' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loadType">Load Type</Label>
                <Input
                  id="loadType"
                  placeholder="e.g., GL_JOURNAL"
                  value={entity.loadType}
                  onChange={(e) => onEntityChange({ loadType: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                />
                <p className="text-xs text-[var(--muted-foreground)]">Uppercase, underscores only</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="moduleCode">Module</Label>
                <select
                  id="moduleCode"
                  className="flex h-10 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
                  value={entity.moduleCode}
                  onChange={(e) => onEntityChange({ moduleCode: e.target.value as ModuleCode })}
                >
                  {MODULE_CODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min={10}
                  max={99}
                  value={entity.priority}
                  onChange={(e) => onEntityChange({ priority: parseInt(e.target.value) || 50 })}
                />
                <p className="text-xs text-[var(--muted-foreground)]">Lower = runs first (10-99)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fileLike">FILE_LIKE Pattern</Label>
                <Input
                  id="fileLike"
                  placeholder="e.g., %journalextract%"
                  value={entity.fileLikePattern}
                  onChange={(e) => onEntityChange({ fileLikePattern: e.target.value })}
                />
                <p className="text-xs text-[var(--muted-foreground)]">Matches BICC ZIP filename</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="biccFileName">BICC ZIP Filename</Label>
              <Input
                id="biccFileName"
                placeholder="e.g., file_hcmtopmodelanalyticsglobalam_...-batch1234-20260320_120000.zip"
                className="font-mono text-xs"
                value={entity.biccFileName}
                onChange={(e) => onEntityChange({ biccFileName: e.target.value.trim() })}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Paste from Object Storage after running the BICC extract. Used for Step 0 (extract_and_stage_csv).
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>CSV Header Row</Label>
                <div className="flex items-center gap-2">
                  {columnCount > 0 && (
                    <Badge variant="secondary">
                      <FileText className="mr-1 h-3 w-3" />
                      {columnCount} columns parsed
                    </Badge>
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    <span className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs hover:bg-[var(--accent)]">
                      <Upload className="h-3 w-3" /> Upload CSV
                    </span>
                  </label>
                </div>
              </div>
              <Textarea
                placeholder="Paste the first row of your BICC CSV here (comma-separated column names)..."
                rows={4}
                className="font-mono text-xs"
                value={csvText}
                onChange={(e) => handleCsvPaste(e.target.value)}
              />
            </div>
          </>
        )}

        {/* BIP Fields */}
        {extractionType === 'BIP' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bipTableName">Target Table Name</Label>
                <Input
                  id="bipTableName"
                  placeholder="e.g., EXT_FLEX_STG"
                  value={bipConfig.tableName}
                  onChange={(e) => onBipConfigChange({ tableName: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                />
                <p className="text-xs text-[var(--muted-foreground)]">Oracle table name for the report data</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bipReportPath">Report Catalog Path</Label>
                <Input
                  id="bipReportPath"
                  placeholder="e.g., /Custom/SCI/BIP/My_Report.xdo"
                  value={bipConfig.reportCatalogPath}
                  onChange={(e) => onBipConfigChange({ reportCatalogPath: e.target.value.trim() })}
                />
                <p className="text-xs text-[var(--muted-foreground)]">Full path or just the report name (.xdo)</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bipParams">Report Parameters XML (optional)</Label>
              <Textarea
                id="bipParams"
                placeholder='e.g., <pub:parameterNameValues><pub:item><pub:name>P_PARAM</pub:name><pub:values><pub:item>VALUE</pub:item></pub:values></pub:item></pub:parameterNameValues>'
                rows={3}
                className="font-mono text-xs"
                value={bipConfig.parameterXml}
                onChange={(e) => onBipConfigChange({ parameterXml: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>BIP Column Names</Label>
                {columnCount > 0 && (
                  <Badge variant="secondary">
                    <FileText className="mr-1 h-3 w-3" />
                    {columnCount} columns parsed
                  </Badge>
                )}
              </div>
              <Textarea
                placeholder={"Paste column names (comma-separated) or a sample <ROW> from the BIP report.\nIf XML is pasted, only column names are extracted — data values are immediately discarded."}
                rows={4}
                className="font-mono text-xs"
                value={bipColumnsText}
                onChange={(e) => handleBipColumnsPaste(e.target.value)}
              />
              {bipXmlStripped && columnCount > 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {columnCount} column names extracted from XML. Data values were discarded and will not be sent to the AI.
                </p>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)]">
                  These are the XML element names from the BIP report's &lt;ROW&gt; output.
                </p>
              )}
            </div>
          </>
        )}

        {/* OTBI Fields */}
        {extractionType === 'OTBI' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="otbiTableName">Target Table Name</Label>
              <Input
                id="otbiTableName"
                placeholder="e.g., OTBI_BILLING_EVENTS"
                value={otbiConfig.tableName}
                onChange={(e) => onOtbiConfigChange({ tableName: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
              />
              <p className="text-xs text-[var(--muted-foreground)]">Oracle table name for the OTBI data</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="otbiUrl">Fusion Instance Base URL</Label>
              <Input
                id="otbiUrl"
                placeholder="e.g., https://your-instance.fa.ocs.oraclecloud.com"
                value={otbiConfig.instanceBaseUrl}
                onChange={(e) => onOtbiConfigChange({ instanceBaseUrl: e.target.value.trim() })}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                The OTBI SOAP endpoints are derived from this base URL.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>OTBI Logical SQL</Label>
                {columnCount > 0 && (
                  <Badge variant="secondary">
                    <FileText className="mr-1 h-3 w-3" />
                    {columnCount} columns parsed
                  </Badge>
                )}
              </div>
              <Textarea
                placeholder={'Paste the full OTBI logical SQL (SELECT ... FROM "Subject Area" ...)'}
                rows={10}
                className="font-mono text-xs"
                value={otbiSqlText}
                onChange={(e) => handleOtbiSqlPaste(e.target.value)}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Column names will be auto-derived from the SELECT clause. DESCRIPTOR_IDOF columns are auto-excluded.
              </p>
            </div>
          </>
        )}

        {!validation.valid && (
          <div className="rounded-md border border-[var(--destructive)] bg-red-50 p-3">
            <ul className="text-sm text-[var(--destructive)]">
              {validation.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onNext} disabled={!validation.valid}>
            Next: Configure Columns
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
