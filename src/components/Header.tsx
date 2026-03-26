import { KeyRound, Database, Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

type Page = 'generator' | 'setup'

interface HeaderProps {
  activePage: Page
  onPageChange: (page: Page) => void
  hasApiKey: boolean
  onApiKeyClick: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Header({ activePage, onPageChange, hasApiKey, onApiKeyClick, theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="border-b bg-[var(--card)] px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-[var(--primary)]" />
            <h1 className="text-lg font-semibold">Fusion Data Pipeline Generator</h1>
          </div>
          <nav className="flex gap-1">
            {(['generator', 'setup'] as const).map((page) => (
              <button
                key={page}
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activePage === page
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
                }`}
                onClick={() => onPageChange(page)}
              >
                {page === 'generator' ? 'Generator' : 'Setup'}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={onApiKeyClick} className="gap-2">
            <KeyRound className="h-4 w-4" />
            API Key
            {hasApiKey ? (
              <Badge variant="default" className="ml-1 text-[10px]">Set</Badge>
            ) : (
              <Badge variant="destructive" className="ml-1 text-[10px]">Missing</Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
