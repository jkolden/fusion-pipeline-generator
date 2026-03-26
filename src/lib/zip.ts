import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { GeneratedFile } from './types'

export async function downloadAsZip(files: GeneratedFile[], zipName: string): Promise<void> {
  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.filename, file.content)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, zipName)
}

export function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, filename)
}
