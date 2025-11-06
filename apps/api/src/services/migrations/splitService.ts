import { executeMigration, MigrationResult } from './utils.js'

export async function performStockSplit(ratio = 7): Promise<MigrationResult> {
  if (!Number.isInteger(ratio) || ratio <= 1) throw new Error('Split ratio must be an integer greater than 1')
  return executeMigration({ ratio })
}
