import { useState } from 'react'
import { KeyRound, Eye, EyeOff } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

interface ApiKeyDialogProps {
  open: boolean
  apiKey: string
  onSave: (key: string) => void
  onClose: () => void
}

export function ApiKeyDialog({ open, apiKey, onSave, onClose }: ApiKeyDialogProps) {
  const [value, setValue] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border bg-[var(--card)] p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="text-lg font-semibold">Claude API Key</h2>
        </div>
        <p className="mb-4 text-sm text-[var(--muted-foreground)]">
          Your API key is stored locally in your browser and only sent to the local proxy server.
          It is never sent to any third-party service.
        </p>
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <div className="relative">
            <Input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              placeholder="sk-ant-..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { onSave(value); onClose() } }}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(value); onClose() }}>Save</Button>
        </div>
      </div>
    </div>
  )
}
