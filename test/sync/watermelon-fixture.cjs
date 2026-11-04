require('../register.cjs');
const { Database, appSchema } = require('@nozbe/watermelondb');
const { readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default;
const { PreservingSQLiteAdapter } = require('../../src/libs/watermelon/PreservingSQLiteAdapter.ts');
const bridge = require('@nozbe/watermelondb/adapters/sqlite/sqlite-node/DatabaseBridge').default;
const { schemas } = require('../../src/libs/watermelon/schema/index.ts');
const { migrations } = require('../../src/libs/watermelon/migrations/index.ts');
const { SyncOperationModel } = require('../../src/libs/watermelon/model/SyncOperationModel.ts');
const { CharacterizationModel } = require('../../src/libs/watermelon/model/CharacterizationModel.ts');
const { CharacterizationPhotoModel } = require('../../src/libs/watermelon/model/CharacterizationPhotoModel.ts');
const { RiskDataModel } = require('../../src/libs/watermelon/model/RiskDataModel.ts');
const { EpisRiskDataModel } = require('../../src/libs/watermelon/model/_MMModel/EpisRiskDataModel.ts');
const { createWatermelonSyncStorage } = require('../../src/libs/sync/watermelonStorage.ts');
const modelRoot = resolve(__dirname, '../../src/libs/watermelon/model');
const modelClasses = readdirSync(modelRoot, { recursive: true }).filter((file) => file.endsWith('.ts') && file !== 'RiskModel.ts')
  .flatMap((file) => Object.values(require(resolve(modelRoot, file))))
  .filter((value) => typeof value === 'function' && typeof value.table === 'string');
// Version 44 is the released schema before SyncOperation. No reset or copying a
// current schema over an existing visit is used in the upgrade test.
const legacySchema = appSchema({ version: 44, tables: Object.values(schemas.tables).filter((table) => table.name !== 'SyncOperation') });
async function openDatabase(filename, legacy = false) {
  const Adapter = legacy ? SQLiteAdapter : PreservingSQLiteAdapter;
  const adapter = new Adapter({ dbName: filename, schema: legacy ? legacySchema : schemas, ...(legacy ? {} : { migrations }) });
  const close = () => {
    const connection = bridge.connections[adapter._tag];
    connection?.driver?.database?.instance?.close();
    delete bridge.connections[adapter._tag];
  };
  try { await adapter._initPromise; } catch (error) { close(); throw error; }
  const db = new Database({ adapter, modelClasses: modelClasses.filter((model) => !legacy || model.table !== 'SyncOperation') });
  return { db, storage: !legacy ? createWatermelonSyncStorage(db) : undefined, close() {
    // Watermelon Node has no public close API. Closing the test-only dispatcher
    // connection avoids relying on GC and allows reopening the same real file.
    close();
  } };
}
module.exports = { openDatabase, legacySchema };
