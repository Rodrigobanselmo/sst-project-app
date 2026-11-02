require('../register.cjs');
const { randomUUID } = require('node:crypto');
const { SyncJournal } = require('../../src/libs/sync/journal.ts');
const { SqliteStorage } = require('./sqlite-storage.cjs');
const storage = new SqliteStorage(process.argv[2]);
const context = JSON.parse(process.argv[3]);
const journal = new SyncJournal(storage, context, { id: randomUUID, now: () => new Date().toISOString() });
(async () => {
  await journal.capture([{ kind: 'CHARACTERIZATION', entityId: 'visit-before-crash', payload: { name: 'Coleta preservada antes de reiniciar', notes: ['offline', 'visita'] } }]);
  process.stdout.write('DURABLE\n');
  // The parent kills this process; no graceful shutdown or flush can rescue the data.
  setInterval(() => {}, 1000);
})().catch((error) => { console.error(error); process.exitCode = 1; });
