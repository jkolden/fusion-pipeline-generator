import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateWithClaude } from './provider.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(express.json({ limit: '10mb' }))

app.post('/api/generate', async (req, res) => {
  req.setTimeout(300000) // 5 min timeout for Claude generation
  try {
    const { apiKey, config } = req.body

    if (!apiKey) {
      res.status(400).json({ error: 'API key is required' })
      return
    }

    if (!config?.extractionType) {
      res.status(400).json({ error: 'Pipeline configuration is required' })
      return
    }

    // Type-specific validation
    if (config.extractionType === 'BICC' && !config.entity?.loadType) {
      res.status(400).json({ error: 'BICC load type is required' })
      return
    }
    if (config.extractionType === 'BIP' && !config.bipConfig?.tableName) {
      res.status(400).json({ error: 'BIP table name is required' })
      return
    }
    if (config.extractionType === 'OTBI' && !config.otbiConfig?.tableName) {
      res.status(400).json({ error: 'OTBI table name is required' })
      return
    }

    const label = config.extractionType === 'BICC' ? config.entity.loadType
      : config.extractionType === 'BIP' ? config.bipConfig.tableName
      : config.otbiConfig.tableName
    console.log(`[generate] Starting ${config.extractionType} pipeline generation for ${label}...`)
    const startTime = Date.now()

    const result = await generateWithClaude(apiKey, config)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[generate] Done in ${elapsed}s — ${result.files.length} files generated`)

    res.json(result)
  } catch (err: unknown) {
    console.error('[generate] Error:', err)

    // Handle Anthropic SDK errors
    if (err && typeof err === 'object' && 'status' in err) {
      const apiErr = err as { status: number; message?: string }
      if (apiErr.status === 401) {
        res.status(401).json({ error: 'Invalid API key' })
        return
      }
      if (apiErr.status === 429) {
        res.status(429).json({ error: 'Rate limited — please wait and try again' })
        return
      }
      res.status(502).json({ error: `Claude API error: ${apiErr.message || 'Unknown'}` })
      return
    }

    const message = err instanceof Error ? err.message : 'Internal server error'
    res.status(500).json({ error: message })
  }
})

// Serve Vite build output in production
const distPath = path.resolve(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`[server] Pipeline Generator running on http://localhost:${PORT}`)
})
