import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from './prompts/system.ts'
import { buildBipSystemPrompt } from './prompts/bip-system.ts'
import { buildOtbiSystemPrompt } from './prompts/otbi-system.ts'
import { GENERATE_TOOL } from './prompts/templates.ts'

interface GeneratedFile {
  filename: string
  content: string
  category: string
}

interface PatchInstruction {
  target: string
  location: string
  code: string
}

interface GenerationResult {
  files: GeneratedFile[]
  patchInstructions: PatchInstruction[]
}

interface PipelineConfig {
  extractionType: 'BICC' | 'BIP' | 'OTBI'
  entity: {
    loadType: string
    entityName: string
    moduleCode: string
    priority: number
    fileLikePattern: string
    biccFileName: string
  }
  bipConfig: {
    tableName: string
    reportCatalogPath: string
    parameterXml: string
    rawColumnNames: string
  }
  otbiConfig: {
    tableName: string
    logicalSql: string
    instanceBaseUrl: string
  }
  columns: Array<{
    landingName: string
    stagingName: string
    includeInStaging: boolean
    oracleType: string
    typeSize?: number
    isPrimaryKey: boolean
    isSecondaryIndex: boolean
    isDateField: boolean
    customExpression?: string
    xmlPath?: string
    isDescriptor?: boolean
  }>
  dedup: {
    partitionByColumns: string[]
    orderByColumn: string
    orderDirection: string
    filterExpression?: string
  }
  mashup: {
    enabled: boolean
    pattern: string
    lawsonTableDdl: string
    lawsonTableName: string
    lawsonColumns: Array<{ name: string; type: string }>
    joinKeys: Array<{ fusionColumn: string; lawsonColumn: string; transform?: string }>
    columnMappings: Array<{ fusionColumn: string; lawsonColumn: string; matchFlagName: string }>
  }
}

// ========================
// BICC user message builder
// ========================
function buildBiccUserMessage(config: PipelineConfig): string {
  const { entity, columns, dedup, mashup } = config
  const stagingCols = columns.filter((c) => c.includeInStaging)
  const pkCols = stagingCols.filter((c) => c.isPrimaryKey)
  const indexCols = stagingCols.filter((c) => c.isSecondaryIndex)
  const dateCols = stagingCols.filter((c) => c.isDateField)

  const landingColList = columns
    .map((c) => `  ${c.landingName} VARCHAR2(4000)`)
    .join('\n')

  const stagingColList = stagingCols
    .map((c) => {
      let typeDef = c.oracleType
      if (c.oracleType === 'VARCHAR2') typeDef += `(${c.typeSize || 4000})`
      const flags = [c.isPrimaryKey ? 'PK' : '', c.isSecondaryIndex ? 'INDEX' : ''].filter(Boolean).join(', ')
      return `  ${c.stagingName} ${typeDef}${flags ? ` -- ${flags}` : ''}`
    })
    .join('\n')

  const dateColList = dateCols
    .map((c) => `  Landing: ${c.landingName} -> Staging: ${c.stagingName}_RAW + ${c.stagingName}_TS`)
    .join('\n')

  const colMappingList = stagingCols
    .map((c) => {
      if (c.customExpression) return `  ${c.stagingName} = ${c.customExpression}`
      if (c.oracleType === 'NUMBER') return `  ${c.stagingName} = pkg_bicc_common.safe_to_number(l.${c.landingName})`
      if (c.isDateField) return `  ${c.stagingName}_RAW = l.${c.landingName}\n  ${c.stagingName}_TS = pkg_bicc_common.safe_to_timestamp(l.${c.landingName})`
      return `  ${c.stagingName} = l.${c.landingName}`
    })
    .join('\n')

  let mashupSection = 'MASHUP VIEW: No'
  if (mashup.enabled) {
    const joinKeyList =
      mashup.joinKeys
        ?.map((j) => `  Fusion: ${j.fusionColumn} = Lawson: ${j.lawsonColumn}${j.transform ? ` (transform: ${j.transform})` : ''}`)
        .join('\n') || 'N/A'

    const matchFlagList =
      mashup.columnMappings
        ?.map((m) => `  ${m.fusionColumn} vs ${m.lawsonColumn} -> ${m.matchFlagName}`)
        .join('\n') || 'None'

    mashupSection = `MASHUP VIEW: Yes
PATTERN: ${mashup.pattern}
LAWSON TABLE: ${mashup.lawsonTableName}
LAWSON DDL:
${mashup.lawsonTableDdl}

JOIN KEYS:
${joinKeyList}

MATCH FLAG MAPPINGS:
${matchFlagList}`
  }

  return `Generate the complete BICC pipeline for this entity:

ENTITY: ${entity.loadType}
ENTITY_LOWER: ${entity.entityName}
MODULE: ${entity.moduleCode}
PRIORITY: ${entity.priority}
FILE_LIKE: '${entity.fileLikePattern}'
BICC_ZIP_FILENAME: '${entity.biccFileName}'
STAGING CSV NAME: ${entity.entityName}_unzipped.csv

LANDING COLUMNS (in CSV order — this is the exact order they appear in the BICC CSV):
${landingColList}

STAGING COLUMNS (only these go into staging/final):
${stagingColList}

DATE COLUMNS (need _RAW VARCHAR2(50) + _TS TIMESTAMP(6) pairs in staging):
${dateColList || '  (none)'}

PRIMARY KEY: (${pkCols.map((c) => c.stagingName).join(', ')})
SECONDARY INDEXES: ${indexCols.map((c) => c.stagingName).join(', ') || 'None'}

DEDUP LOGIC:
  PARTITION BY: ${dedup.partitionByColumns.join(', ')}
  ORDER BY: ${dedup.orderByColumn} ${dedup.orderDirection}
  ${dedup.filterExpression ? `FILTER: ${dedup.filterExpression}` : 'NO FILTER'}

COLUMN MAPPINGS (landing -> staging expression):
${colMappingList}

${mashupSection}

Generate ALL of these files IN THIS ORDER by calling the generate_pipeline_files tool.
The order follows the actual deployment/execution sequence:

1. landing_${entity.entityName}.sql (Step 0: extract CSV + Step 1: external table + Step 2: landing table)
2. stg_fbx_${entity.entityName}.sql (staging table DDL + indexes)
3. fbx_${entity.entityName}.sql (final table DDL + PK + indexes)
4. pkg_bicc_${entity.entityName}.sql (package spec)
5. pkg_bicc_${entity.entityName}.plb (package body — follow the reference template EXACTLY)
${mashup.enabled ? `6. fbx_${entity.entityName}_v.sql (mashup view)\n` : ''}
Then the integration files:
- pkg_bicc_common_patches_${entity.entityName}.sql — contains the three code snippets to add to pkg_bicc_common.plb (IN-list, Stage CASE, Merge CASE) plus the APEX Ajax callback WHEN clause. Present each as a labeled comment block so the user knows where to paste it.
- bicc_loader_map_${entity.entityName}.sql — the INSERT statement

Finally, a test script:
- test_${entity.entityName}.sql — an anonymous PL/SQL block that:
  1. Calls pkg_bicc_${entity.entityName}.load_and_preview('<BICC_ZIP_FILENAME>') using the actual ZIP filename provided
  2. Queries bicc_load_job for the returned job_id to show row counts (rows_loaded, new_count, changed_count, unchanged_count)
  3. Calls pkg_bicc_${entity.entityName}.merge(p_job_id => l_job_id)
  4. Queries the final table fbx_${entity.entityName} with SELECT COUNT(*) and a sample SELECT * FETCH FIRST 5 ROWS ONLY
  5. Includes DBMS_OUTPUT.PUT_LINE calls so the user can see progress

Also provide patch instructions (patchInstructions array) for pkg_bicc_common.plb (IN-list, Stage CASE, Merge CASE) and APEX Ajax callback.`
}

// ========================
// BIP user message builder
// ========================
function buildBipUserMessage(config: PipelineConfig): string {
  const { bipConfig, columns } = config
  const stagingCols = columns.filter((c) => c.includeInStaging)
  const pkCols = stagingCols.filter((c) => c.isPrimaryKey)
  const tableLower = bipConfig.tableName.toLowerCase()

  const colDefs = stagingCols
    .map((c) => {
      let typeDef = c.oracleType
      if (c.oracleType === 'VARCHAR2') typeDef += `(${c.typeSize || 4000})`
      return `  ${c.stagingName} ${typeDef}${c.isPrimaryKey ? ' -- PK' : ''}`
    })
    .join('\n')

  return `Generate BIP report loading code for this entity:

TABLE NAME: ${bipConfig.tableName}
TABLE_LOWER: ${tableLower}
REPORT CATALOG PATH: '${bipConfig.reportCatalogPath}'
${bipConfig.parameterXml ? `REPORT PARAMETER XML:\n${bipConfig.parameterXml}\n` : ''}

COLUMNS (these are the XML element names from the BIP <ROW> output):
${colDefs}

PRIMARY KEY: (${pkCols.map((c) => c.stagingName).join(', ')})

Generate ALL files by calling the generate_pipeline_files tool:

1. ${tableLower}.sql — CREATE TABLE with PK + LOAD_TS column (category: table)
2. pkg_bip_soap_spec_patch.sql — Procedure declaration to add to pkg_bip_soap spec (category: procedure)
3. pkg_bip_soap_load_${tableLower}.sql — New procedure \`load_${tableLower}\` to add to pkg_bip_soap body (category: procedure)
4. test_bip_${tableLower}.sql — Test script (category: test)

The patchInstructions array should be EMPTY — all code is already in the generated files.`
}

// ========================
// OTBI user message builder
// ========================
function buildOtbiUserMessage(config: PipelineConfig): string {
  const { otbiConfig, columns } = config
  const stagingCols = columns.filter((c) => c.includeInStaging)
  const pkCols = stagingCols.filter((c) => c.isPrimaryKey)
  const tableLower = otbiConfig.tableName.toLowerCase()

  const colDefs = stagingCols
    .map((c) => {
      let typeDef = c.oracleType
      if (c.oracleType === 'VARCHAR2') typeDef += `(${c.typeSize || 4000})`
      const xmlNote = c.xmlPath ? ` -- maps to ${c.xmlPath}` : ''
      return `  ${c.stagingName} ${typeDef}${c.isPrimaryKey ? ' PK' : ''}${xmlNote}`
    })
    .join('\n')

  // Build the ColumnN mapping for the XMLTABLE
  const xmlMappings = stagingCols
    .filter((c) => c.xmlPath)
    .map((c) => `  ${c.stagingName} PATH '${c.xmlPath}'`)
    .join('\n')

  return `Generate OTBI report loading code for this entity:

TABLE NAME: ${otbiConfig.tableName}
TABLE_LOWER: ${tableLower}
INSTANCE BASE URL: ${otbiConfig.instanceBaseUrl}

LOGICAL SQL (store in l_logical_sql using q'[...]' quoting):
${otbiConfig.logicalSql}

COLUMNS (with Oracle types and XML path mappings):
${colDefs}

XML PATH MAPPINGS (ColumnN to column name):
${xmlMappings}

PRIMARY KEY: (${pkCols.map((c) => c.stagingName).join(', ')})

Generate ALL files by calling the generate_pipeline_files tool:

1. ${tableLower}.sql — CREATE TABLE with PK + LOAD_TS column (category: table)
2. pkg_otbi_soap_spec_patch.sql — Procedure declaration to add to pkg_otbi_soap spec (category: procedure)
3. pkg_otbi_soap_load_${tableLower}.sql — New procedure \`load_${tableLower}\` to add to pkg_otbi_soap body (category: procedure)
4. test_otbi_${tableLower}.sql — Test script (category: test)

The patchInstructions array should be EMPTY — all code is already in the generated files.`
}

// ========================
// Main generation function
// ========================
export async function generateWithClaude(apiKey: string, config: PipelineConfig): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey, timeout: 5 * 60 * 1000 })

  let systemPrompt: string
  let userMessage: string

  switch (config.extractionType) {
    case 'BIP':
      systemPrompt = buildBipSystemPrompt()
      userMessage = buildBipUserMessage(config)
      break
    case 'OTBI':
      systemPrompt = buildOtbiSystemPrompt()
      userMessage = buildOtbiUserMessage(config)
      break
    default:
      systemPrompt = buildSystemPrompt()
      userMessage = buildBiccUserMessage(config)
  }

  console.log(`[generate] type=${config.extractionType}, sending request...`)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 64000,
    system: systemPrompt,
    tools: [GENERATE_TOOL],
    tool_choice: { type: 'tool' as const, name: 'generate_pipeline_files' },
    messages: [{ role: 'user', content: userMessage }],
  })

  console.log(`[generate] stop_reason=${response.stop_reason}, usage: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`)

  if (response.stop_reason === 'max_tokens') {
    throw new Error('Output was truncated — too many columns. Try reducing staging columns or splitting the entity.')
  }

  // Extract tool use result
  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'generate_pipeline_files') {
      const input = block.input as { files: GeneratedFile[]; patchInstructions: PatchInstruction[] }
      const files = input.files || []
      if (files.length === 0) {
        throw new Error('Claude returned an empty files array — check the server logs for details')
      }
      return {
        files,
        patchInstructions: input.patchInstructions || [],
      }
    }
  }

  throw new Error('Claude did not return a tool_use response')
}
