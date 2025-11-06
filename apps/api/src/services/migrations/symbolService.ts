import { executeMigration, MigrationResult } from './utils.js'

export async function performSymbolChange(newSymbol: string, newName?: string): Promise<MigrationResult> {
  if (!newSymbol || newSymbol.trim().length === 0) throw new Error('newSymbol is required')
  return executeMigration({ ratio: 1, newSymbol: newSymbol.trim(), newName })
}
