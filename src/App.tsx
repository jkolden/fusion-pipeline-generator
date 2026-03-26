import { useState, useEffect, useCallback } from 'react'
import { Wizard } from './components/wizard/Wizard'
import { SetupPage } from './components/SetupPage'
import { Header } from './components/Header'
import { ApiKeyDialog } from './components/ApiKeyDialog'
import { useLocalStorage } from './hooks/useLocalStorage'

type Page = 'generator' | 'setup'
type Theme = 'light' | 'dark'

function App() {
  const [activePage, setActivePage] = useState<Page>('generator')
  const [apiKey, setApiKey] = useLocalStorage('bicc-api-key', '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [theme, setTheme] = useLocalStorage<Theme>('bicc-theme', 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme, setTheme])

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header
        activePage={activePage}
        onPageChange={setActivePage}
        hasApiKey={!!apiKey}
        onApiKeyClick={() => setShowApiKey(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <ApiKeyDialog
        open={showApiKey}
        apiKey={apiKey}
        onSave={setApiKey}
        onClose={() => setShowApiKey(false)}
      />
      <div style={{ display: activePage === 'generator' ? undefined : 'none' }}>
        <Wizard apiKey={apiKey} onOpenApiKey={() => setShowApiKey(true)} />
      </div>
      <div style={{ display: activePage === 'setup' ? undefined : 'none' }}>
        <SetupPage />
      </div>
    </div>
  )
}

export default App
