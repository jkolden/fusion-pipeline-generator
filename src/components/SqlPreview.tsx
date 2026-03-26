import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import { Button } from './ui/button'
import { useState } from 'react'

interface SqlPreviewProps {
  sql: string
  maxHeight?: string
}

export function SqlPreview({ sql, maxHeight = '500px' }: SqlPreviewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative rounded-md border">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 z-10 h-8 w-8 bg-gray-800/80 text-white hover:bg-gray-700"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <div style={{ maxHeight, overflow: 'auto' }}>
        <SyntaxHighlighter
          language="sql"
          style={vscDarkPlus}
          showLineNumbers
          customStyle={{ margin: 0, borderRadius: '0.375rem', fontSize: '13px' }}
        >
          {sql}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
