import { useState } from 'react'
import { Download, Database, FileBarChart, BarChart3, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

interface SkeletonCard {
  type: 'bicc' | 'bip' | 'otbi'
  title: string
  description: string
  icon: React.ReactNode
  files: { path: string; zipName: string }[]
  prerequisites: string[]
}

const SKELETONS: SkeletonCard[] = [
  {
    type: 'bicc',
    title: 'BICC Extract Pipeline',
    description: 'Shared utilities for the BICC CSV-to-Oracle pipeline. Required by all generated BICC entity packages.',
    icon: <Database className="h-6 w-6" />,
    files: [
      { path: '/skeletons/bicc/pkg_bicc_common.sql', zipName: 'pkg_bicc_common.sql' },
      { path: '/skeletons/bicc/pkg_bicc_common.plb', zipName: 'pkg_bicc_common.plb' },
      { path: '/skeletons/bicc/bicc_files.sql', zipName: 'bicc_files.sql' },
      { path: '/skeletons/bicc/bicc_load_job.sql', zipName: 'bicc_load_job.sql' },
      { path: '/skeletons/bicc/bicc_load_log.sql', zipName: 'bicc_load_log.sql' },
      { path: '/skeletons/bicc/bicc_loader_map.sql', zipName: 'bicc_loader_map.sql' },
      { path: '/skeletons/bicc/README.txt', zipName: 'README.txt' },
    ],
    prerequisites: [
      'OCI Object Storage bucket',
      'DBMS_CLOUD credential',
      'APEX workspace',
    ],
  },
  {
    type: 'bip',
    title: 'BIP Report Pipeline',
    description: 'SOAP infrastructure for BI Publisher report execution and XML parsing. Load procedures are generated and added to this package.',
    icon: <FileBarChart className="h-6 w-6" />,
    files: [
      { path: '/skeletons/bip/pkg_bip_soap.sql', zipName: 'pkg_bip_soap.sql' },
      { path: '/skeletons/bip/pkg_bip_soap.plb', zipName: 'pkg_bip_soap.plb' },
      { path: '/skeletons/bip/README.txt', zipName: 'README.txt' },
    ],
    prerequisites: [
      'APEX Web Credential (Basic Auth)',
      'BIP reports in a shared catalog folder',
    ],
  },
  {
    type: 'otbi',
    title: 'OTBI Report Pipeline',
    description: 'SOAP infrastructure for OTBI logical SQL queries via BI Web Services. Load procedures are generated and added to this package.',
    icon: <BarChart3 className="h-6 w-6" />,
    files: [
      { path: '/skeletons/otbi/pkg_otbi_soap.sql', zipName: 'pkg_otbi_soap.sql' },
      { path: '/skeletons/otbi/pkg_otbi_soap.plb', zipName: 'pkg_otbi_soap.plb' },
      { path: '/skeletons/otbi/README.txt', zipName: 'README.txt' },
    ],
    prerequisites: [
      'Fusion Cloud service account with OTBI access',
      'Instance base URL',
    ],
  },
]

export function SetupPage() {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set())

  const handleDownload = async (skeleton: SkeletonCard) => {
    setDownloading(skeleton.type)
    try {
      const zip = new JSZip()

      for (const file of skeleton.files) {
        const response = await fetch(file.path)
        if (!response.ok) throw new Error(`Failed to fetch ${file.path}`)
        const content = await response.text()
        zip.file(file.zipName, content)
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      saveAs(blob, `pkg_${skeleton.type}_skeleton.zip`)

      setDownloaded((prev) => new Set([...prev, skeleton.type]))
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold">Database Setup</h2>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Download and install the skeleton PL/SQL packages for your extraction type.
          These provide the infrastructure that generated load procedures depend on.
        </p>
      </div>

      <div className="grid gap-6">
        {SKELETONS.map((skeleton) => (
          <Card key={skeleton.type}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[var(--primary)]/10 p-2 text-[var(--primary)]">
                  {skeleton.icon}
                </div>
                <div>
                  <CardTitle className="text-lg">{skeleton.title}</CardTitle>
                  <CardDescription>{skeleton.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Included files:</p>
                    <ul className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {skeleton.files.map((f) => (
                        <li key={f.zipName} className="font-mono text-xs">{f.zipName}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Prerequisites:</p>
                    <ul className="mt-1 space-y-0.5 text-sm text-[var(--muted-foreground)]">
                      {skeleton.prerequisites.map((p, i) => (
                        <li key={i}>- {p}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button
                  onClick={() => handleDownload(skeleton)}
                  disabled={downloading !== null}
                  className="shrink-0 gap-2"
                >
                  {downloaded.has(skeleton.type) ? (
                    <>
                      <Check className="h-4 w-4" />
                      Downloaded
                    </>
                  ) : downloading === skeleton.type ? (
                    'Downloading...'
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download ZIP
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 rounded-lg border bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
        <p className="font-medium text-[var(--foreground)]">Getting started:</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Download the skeleton package for your extraction type</li>
          <li>Update the placeholder constants (URLs, credentials) for your environment</li>
          <li>Compile the spec (.sql) first, then the body (.plb) in your Oracle database</li>
          <li>Switch to the <strong>Generator</strong> tab to create load procedures</li>
        </ol>
      </div>
    </div>
  )
}
