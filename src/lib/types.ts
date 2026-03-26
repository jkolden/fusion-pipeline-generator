export type ModuleCode = 'HCM' | 'AP' | 'GL' | 'PO' | 'SCM' | 'FIN' | 'OTHER'

export type OracleType = 'NUMBER' | 'VARCHAR2' | 'TIMESTAMP(6)' | 'CLOB'

export type ExtractionType = 'BICC' | 'BIP' | 'OTBI'

export interface EntityConfig {
  loadType: string
  entityName: string
  moduleCode: ModuleCode
  priority: number
  fileLikePattern: string
  biccFileName: string
  rawCsvHeader: string
}

export interface BipConfig {
  tableName: string
  reportCatalogPath: string
  parameterXml: string
  rawColumnNames: string
}

export interface OtbiConfig {
  tableName: string
  logicalSql: string
  instanceBaseUrl: string
}

export interface ColumnDef {
  landingName: string
  stagingName: string
  includeInStaging: boolean
  oracleType: OracleType
  typeSize?: number
  isPrimaryKey: boolean
  isSecondaryIndex: boolean
  isDateField: boolean
  customExpression?: string
  xmlPath?: string          // OTBI: Column1, Column2, etc.
  isDescriptor?: boolean    // OTBI: DESCRIPTOR_IDOF column
}

export interface DedupConfig {
  partitionByColumns: string[]
  orderByColumn: string
  orderDirection: 'DESC NULLS LAST' | 'ASC'
  filterExpression?: string
}

export interface LawsonColumn {
  name: string
  type: string
}

export interface JoinKeyPair {
  fusionColumn: string
  lawsonColumn: string
  transform?: string
}

export interface ColumnMapping {
  fusionColumn: string
  lawsonColumn: string
  matchFlagName: string
}

export interface MashupConfig {
  enabled: boolean
  pattern: 'FULL_OUTER_JOIN' | 'UNION_ALL'
  lawsonTableDdl: string
  lawsonTableName: string
  lawsonColumns: LawsonColumn[]
  joinKeys: JoinKeyPair[]
  columnMappings: ColumnMapping[]
}

export interface PipelineConfig {
  extractionType: ExtractionType
  entity: EntityConfig
  bipConfig: BipConfig
  otbiConfig: OtbiConfig
  columns: ColumnDef[]
  dedup: DedupConfig
  mashup: MashupConfig
}

export interface GeneratedFile {
  filename: string
  content: string
  category: 'landing' | 'staging' | 'final' | 'pkg_spec' | 'pkg_body' | 'view' | 'common_patches' | 'loader_map' | 'test' | 'table' | 'procedure'
}

export interface PatchInstruction {
  target: string
  location: string
  code: string
}

export interface GenerationResult {
  files: GeneratedFile[]
  patchInstructions: PatchInstruction[]
}

export interface GenerateRequest {
  apiKey: string
  config: PipelineConfig
}

export type WizardStep = 1 | 2 | 3 | 4

export interface ValidationResult {
  valid: boolean
  errors: string[]
}
