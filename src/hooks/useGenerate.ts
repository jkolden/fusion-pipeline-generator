import { useState, useCallback } from 'react'
import type { PipelineConfig, GenerationResult } from '@/lib/types'
import { generatePipeline } from '@/lib/api'

interface GenerateState {
  loading: boolean
  result: GenerationResult | null
  error: string | null
}

export function useGenerate() {
  const [state, setState] = useState<GenerateState>({
    loading: false,
    result: null,
    error: null,
  })

  const generate = useCallback(async (apiKey: string, config: PipelineConfig) => {
    setState({ loading: true, result: null, error: null })
    try {
      const result = await generatePipeline(apiKey, config)
      setState({ loading: false, result, error: null })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed'
      setState({ loading: false, result: null, error: message })
      throw err
    }
  }, [])

  const clearResult = useCallback(() => {
    setState({ loading: false, result: null, error: null })
  }, [])

  return { ...state, generate, clearResult }
}
