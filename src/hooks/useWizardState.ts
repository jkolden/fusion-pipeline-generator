import { useReducer, useCallback } from 'react'
import type {
  PipelineConfig, EntityConfig, BipConfig, OtbiConfig,
  ColumnDef, DedupConfig, MashupConfig, ExtractionType, WizardStep,
} from '@/lib/types'
import { buildColumnDefs } from '@/lib/defaults'
import { parseCsvHeader } from '@/lib/csv-parser'
import { parseOtbiSql } from '@/lib/otbi-parser'

interface WizardState {
  currentStep: WizardStep
  config: PipelineConfig
}

type WizardAction =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_EXTRACTION_TYPE'; extractionType: ExtractionType }
  | { type: 'SET_ENTITY'; payload: Partial<EntityConfig> }
  | { type: 'SET_BIP_CONFIG'; payload: Partial<BipConfig> }
  | { type: 'SET_OTBI_CONFIG'; payload: Partial<OtbiConfig> }
  | { type: 'PARSE_CSV'; rawHeader: string }
  | { type: 'PARSE_BIP_COLUMNS'; rawColumnNames: string }
  | { type: 'PARSE_OTBI_SQL'; logicalSql: string }
  | { type: 'SET_COLUMNS'; columns: ColumnDef[] }
  | { type: 'UPDATE_COLUMN'; index: number; payload: Partial<ColumnDef> }
  | { type: 'SET_DEDUP'; payload: Partial<DedupConfig> }
  | { type: 'SET_MASHUP'; payload: Partial<MashupConfig> }
  | { type: 'RESET' }

const initialConfig: PipelineConfig = {
  extractionType: 'BICC',
  entity: {
    loadType: '',
    entityName: '',
    moduleCode: 'HCM',
    priority: 50,
    fileLikePattern: '',
    biccFileName: '',
    rawCsvHeader: '',
  },
  bipConfig: {
    tableName: '',
    reportCatalogPath: '',
    parameterXml: '',
    rawColumnNames: '',
  },
  otbiConfig: {
    tableName: '',
    logicalSql: '',
    instanceBaseUrl: '',
  },
  columns: [],
  dedup: {
    partitionByColumns: [],
    orderByColumn: '',
    orderDirection: 'DESC NULLS LAST',
  },
  mashup: {
    enabled: false,
    pattern: 'FULL_OUTER_JOIN',
    lawsonTableDdl: '',
    lawsonTableName: '',
    lawsonColumns: [],
    joinKeys: [],
    columnMappings: [],
  },
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step }

    case 'SET_EXTRACTION_TYPE':
      return {
        ...state,
        currentStep: 1,
        config: { ...initialConfig, extractionType: action.extractionType },
      }

    case 'SET_ENTITY': {
      const entity = { ...state.config.entity, ...action.payload }
      if (action.payload.loadType !== undefined) {
        entity.entityName = action.payload.loadType.toLowerCase()
      }
      return { ...state, config: { ...state.config, entity } }
    }

    case 'SET_BIP_CONFIG': {
      const bipConfig = { ...state.config.bipConfig, ...action.payload }
      return { ...state, config: { ...state.config, bipConfig } }
    }

    case 'SET_OTBI_CONFIG': {
      const otbiConfig = { ...state.config.otbiConfig, ...action.payload }
      return { ...state, config: { ...state.config, otbiConfig } }
    }

    case 'PARSE_CSV': {
      const columnNames = parseCsvHeader(action.rawHeader)
      const columns = buildColumnDefs(columnNames)
      return {
        ...state,
        config: {
          ...state.config,
          entity: { ...state.config.entity, rawCsvHeader: action.rawHeader },
          columns,
        },
      }
    }

    case 'PARSE_BIP_COLUMNS': {
      // XML stripping now happens in StepEntity.tsx before dispatch —
      // rawColumnNames arriving here is always clean (comma-separated names only)
      const names = action.rawColumnNames
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
      const columns = buildColumnDefs(names)
      return {
        ...state,
        config: {
          ...state.config,
          bipConfig: { ...state.config.bipConfig, rawColumnNames: action.rawColumnNames },
          columns,
        },
      }
    }

    case 'PARSE_OTBI_SQL': {
      const parsed = parseOtbiSql(action.logicalSql)
      const columns: ColumnDef[] = parsed
        .filter((c) => !c.isConstant) // skip the constant placeholder
        .map((c) => ({
          landingName: c.suggestedName,
          stagingName: c.suggestedName,
          includeInStaging: !c.isDescriptor,
          oracleType: 'VARCHAR2' as const,
          typeSize: c.suggestedName.includes('AMOUNT') || c.suggestedName.includes('COST') || c.suggestedName.includes('QUANTITY')
            ? undefined
            : 400,
          isPrimaryKey: false,
          isSecondaryIndex: false,
          isDateField: c.suggestedName.includes('DATE'),
          xmlPath: `Column${c.position}`,
          isDescriptor: c.isDescriptor,
        }))
      // Apply smart type inference
      for (const col of columns) {
        const upper = col.stagingName.toUpperCase()
        if (upper.endsWith('_ID') || upper.endsWith('ID')) {
          col.oracleType = 'NUMBER'
          col.typeSize = undefined
        } else if (upper.includes('AMOUNT') || upper.includes('COST') || upper.includes('QUANTITY') || upper.includes('PRICE')) {
          col.oracleType = 'NUMBER'
          col.typeSize = undefined
        } else if (upper.includes('DATE')) {
          col.oracleType = 'VARCHAR2'
          col.typeSize = 30
          col.isDateField = true
        }
      }
      return {
        ...state,
        config: {
          ...state.config,
          otbiConfig: { ...state.config.otbiConfig, logicalSql: action.logicalSql },
          columns,
        },
      }
    }

    case 'SET_COLUMNS':
      return { ...state, config: { ...state.config, columns: action.columns } }

    case 'UPDATE_COLUMN': {
      const columns = [...state.config.columns]
      columns[action.index] = { ...columns[action.index], ...action.payload }

      const dedup = { ...state.config.dedup }
      if ('isPrimaryKey' in action.payload) {
        dedup.partitionByColumns = columns
          .filter((c) => c.isPrimaryKey && c.includeInStaging)
          .map((c) => c.stagingName)
      }

      return { ...state, config: { ...state.config, columns, dedup } }
    }

    case 'SET_DEDUP':
      return { ...state, config: { ...state.config, dedup: { ...state.config.dedup, ...action.payload } } }

    case 'SET_MASHUP':
      return { ...state, config: { ...state.config, mashup: { ...state.config.mashup, ...action.payload } } }

    case 'RESET':
      return { currentStep: 1, config: initialConfig }

    default:
      return state
  }
}

export function useWizardState() {
  const [state, dispatch] = useReducer(reducer, { currentStep: 1 as WizardStep, config: initialConfig })

  const setStep = useCallback((step: WizardStep) => dispatch({ type: 'SET_STEP', step }), [])
  const setExtractionType = useCallback((extractionType: ExtractionType) => dispatch({ type: 'SET_EXTRACTION_TYPE', extractionType }), [])
  const setEntity = useCallback((payload: Partial<EntityConfig>) => dispatch({ type: 'SET_ENTITY', payload }), [])
  const setBipConfig = useCallback((payload: Partial<BipConfig>) => dispatch({ type: 'SET_BIP_CONFIG', payload }), [])
  const setOtbiConfig = useCallback((payload: Partial<OtbiConfig>) => dispatch({ type: 'SET_OTBI_CONFIG', payload }), [])
  const parseCsv = useCallback((rawHeader: string) => dispatch({ type: 'PARSE_CSV', rawHeader }), [])
  const parseBipColumns = useCallback((rawColumnNames: string) => dispatch({ type: 'PARSE_BIP_COLUMNS', rawColumnNames }), [])
  const parseOtbiSqlAction = useCallback((logicalSql: string) => dispatch({ type: 'PARSE_OTBI_SQL', logicalSql }), [])
  const setColumns = useCallback((columns: ColumnDef[]) => dispatch({ type: 'SET_COLUMNS', columns }), [])
  const updateColumn = useCallback((index: number, payload: Partial<ColumnDef>) => dispatch({ type: 'UPDATE_COLUMN', index, payload }), [])
  const setDedup = useCallback((payload: Partial<DedupConfig>) => dispatch({ type: 'SET_DEDUP', payload }), [])
  const setMashup = useCallback((payload: Partial<MashupConfig>) => dispatch({ type: 'SET_MASHUP', payload }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return {
    ...state,
    setStep,
    setExtractionType,
    setEntity,
    setBipConfig,
    setOtbiConfig,
    parseCsv,
    parseBipColumns,
    parseOtbiSql: parseOtbiSqlAction,
    setColumns,
    updateColumn,
    setDedup,
    setMashup,
    reset,
  }
}
