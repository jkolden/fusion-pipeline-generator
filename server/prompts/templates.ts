// This file defines the tool schema for Claude's structured output

export const GENERATE_TOOL = {
  name: 'generate_pipeline_files',
  description: 'Generate all SQL/PLSQL files for a new data pipeline entity (BICC, BIP, or OTBI). Call this tool with the complete file contents.',
  input_schema: {
    type: 'object' as const,
    properties: {
      files: {
        type: 'array' as const,
        description: 'Array of generated SQL files',
        items: {
          type: 'object' as const,
          properties: {
            filename: { type: 'string' as const, description: 'e.g., landing_hcm_benefits.sql' },
            category: {
              type: 'string' as const,
              enum: ['landing', 'staging', 'final', 'pkg_spec', 'pkg_body', 'view', 'common_patches', 'loader_map', 'test', 'table', 'procedure'],
            },
            content: { type: 'string' as const, description: 'Full SQL file content' },
          },
          required: ['filename', 'category', 'content'],
        },
      },
      patchInstructions: {
        type: 'array' as const,
        description: 'Manual patch instructions for existing files',
        items: {
          type: 'object' as const,
          properties: {
            target: { type: 'string' as const, description: 'Target file, e.g., pkg_bicc_common.plb' },
            location: { type: 'string' as const, description: 'Where to add the code, e.g., IN-list filter (~line 231)' },
            code: { type: 'string' as const, description: 'The SQL/PLSQL snippet to add' },
          },
          required: ['target', 'location', 'code'],
        },
      },
    },
    required: ['files', 'patchInstructions'],
  },
}
