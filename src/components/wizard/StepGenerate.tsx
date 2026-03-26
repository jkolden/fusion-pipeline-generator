import { useState } from 'react'
import { Download, Loader2, AlertCircle, FileText, Wrench, Copy, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { SqlPreview } from '../SqlPreview'
import { downloadAsZip, downloadFile } from '@/lib/zip'
import type { PipelineConfig, GenerationResult } from '@/lib/types'

interface StepGenerateProps {
  config: PipelineConfig
  apiKey: string
  loading: boolean
  result: GenerationResult | null
  error: string | null
  onGenerate: () => void
  onBack: () => void
  onOpenApiKey: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  landing: 'Landing Table',
  staging: 'Staging Table',
  final: 'Final Table',
  pkg_spec: 'Package Spec',
  pkg_body: 'Package Body',
  view: 'Mashup View',
  common_patches: 'Common Patches',
  loader_map: 'Loader Map',
  test: 'Test Script',
  table: 'Target Table',
  procedure: 'BIP Procedure',
}

function getEntityLabel(config: PipelineConfig): string {
  if (config.extractionType === 'BICC') return config.entity.loadType
  if (config.extractionType === 'BIP') return config.bipConfig.tableName
  return config.otbiConfig.tableName
}

function getZipName(config: PipelineConfig): string {
  const name = getEntityLabel(config).toLowerCase()
  return `${name}_pipeline.zip`
}

function PatchBlock({ patch }: { patch: { target: string; location: string; code: string } }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(patch.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-1">
      <p className="text-sm">
        <span className="font-medium">{patch.target}</span>
        <span className="text-[var(--muted-foreground)]"> — {patch.location}</span>
      </p>
      <div className="relative">
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded bg-gray-800/80 text-white hover:bg-gray-700 cursor-pointer"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
        <pre className="rounded bg-gray-900 p-3 text-xs text-green-400 overflow-x-auto">{patch.code}</pre>
      </div>
    </div>
  )
}

export function StepGenerate({ config, apiKey, loading, result, error, onGenerate, onBack, onOpenApiKey }: StepGenerateProps) {
  const [activeTab, setActiveTab] = useState(0)

  const handleDownloadAll = () => {
    if (!result) return
    downloadAsZip(result.files, getZipName(config))
  }

  const handleDownloadFile = (filename: string, content: string) => {
    downloadFile(filename, content)
  }

  const loadingTime = config.extractionType === 'BICC' ? '3-4 minutes' : '1-2 minutes'

  return (
    <Card className="mx-auto max-w-5xl">
      <CardHeader>
        <CardTitle>Generate Pipeline</CardTitle>
        <CardDescription>
          Review your configuration and generate all SQL files for {getEntityLabel(config)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="rounded-md border p-4 space-y-2">
          <h3 className="font-semibold text-sm">Configuration Summary</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div><span className="text-[var(--muted-foreground)]">Type:</span> {config.extractionType}</div>

            {config.extractionType === 'BICC' && (
              <>
                <div><span className="text-[var(--muted-foreground)]">Load Type:</span> {config.entity.loadType}</div>
                <div><span className="text-[var(--muted-foreground)]">Module:</span> {config.entity.moduleCode}</div>
                <div><span className="text-[var(--muted-foreground)]">Priority:</span> {config.entity.priority}</div>
                <div><span className="text-[var(--muted-foreground)]">FILE_LIKE:</span> {config.entity.fileLikePattern}</div>
                <div><span className="text-[var(--muted-foreground)]">Mashup View:</span> {config.mashup.enabled ? config.mashup.pattern : 'None'}</div>
              </>
            )}

            {config.extractionType === 'BIP' && (
              <>
                <div><span className="text-[var(--muted-foreground)]">Table:</span> {config.bipConfig.tableName}</div>
                <div><span className="text-[var(--muted-foreground)]">Report:</span> {config.bipConfig.reportCatalogPath}</div>
              </>
            )}

            {config.extractionType === 'OTBI' && (
              <>
                <div><span className="text-[var(--muted-foreground)]">Table:</span> {config.otbiConfig.tableName}</div>
                <div><span className="text-[var(--muted-foreground)]">Package:</span> pkg_otbi_soap</div>
                <div><span className="text-[var(--muted-foreground)]">Instance:</span> {config.otbiConfig.instanceBaseUrl}</div>
              </>
            )}

            <div><span className="text-[var(--muted-foreground)]">Columns:</span> {config.columns.filter((c) => c.includeInStaging).length} selected</div>
            <div><span className="text-[var(--muted-foreground)]">PK:</span> {config.columns.filter((c) => c.isPrimaryKey).map((c) => c.stagingName).join(', ') || 'None'}</div>
          </div>
        </div>

        {/* Generate Button */}
        {!result && (
          <div className="flex flex-col items-center gap-3 py-4">
            {!apiKey && (
              <div className="flex items-center gap-2 text-sm text-[var(--destructive)]">
                <AlertCircle className="h-4 w-4" />
                <span>API key required.</span>
                <Button variant="link" size="sm" className="h-auto p-0" onClick={onOpenApiKey}>Set API Key</Button>
              </div>
            )}
            <Button size="lg" onClick={onGenerate} disabled={loading || !apiKey} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wrench className="h-5 w-5" />
                  Generate Pipeline Files
                </>
              )}
            </Button>
            {loading && (
              <p className="text-sm text-[var(--muted-foreground)]">
                This typically takes {loadingTime}...
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-md border border-[var(--destructive)] bg-red-50 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[var(--destructive)]" />
              <p className="text-sm text-[var(--destructive)]">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={onGenerate}>
              Retry
            </Button>
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted-foreground)]">{result.files.length} files generated</span>
              <Button variant="outline" onClick={handleDownloadAll} className="gap-2">
                <Download className="h-4 w-4" />
                Download All (.zip)
              </Button>
            </div>

            {/* File Tabs */}
            <div className="flex flex-wrap gap-1 border-b pb-1">
              {result.files.map((file, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-1.5 rounded-t px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    i === activeTab
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)]'
                  }`}
                >
                  <FileText className="h-3 w-3" />
                  {file.filename}
                </button>
              ))}
            </div>

            {/* Active File Preview */}
            {result.files[activeTab] && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{result.files[activeTab].filename}</span>
                    <Badge variant="secondary">{CATEGORY_LABELS[result.files[activeTab].category] || result.files[activeTab].category}</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadFile(result.files[activeTab].filename, result.files[activeTab].content)}
                    className="gap-1"
                  >
                    <Download className="h-3 w-3" /> Download
                  </Button>
                </div>
                <SqlPreview sql={result.files[activeTab].content} maxHeight="600px" />
              </div>
            )}

            {/* Patch Instructions */}
            {result.patchInstructions.length > 0 && (
              <div className="rounded-md border p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Manual Patch Instructions
                </h3>
                {result.patchInstructions.map((patch, i) => (
                  <PatchBlock key={i} patch={patch} />
                ))}
              </div>
            )}
          </>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>Back</Button>
          {result && (
            <Button variant="outline" onClick={onGenerate} className="gap-2">
              <Wrench className="h-4 w-4" /> Regenerate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
