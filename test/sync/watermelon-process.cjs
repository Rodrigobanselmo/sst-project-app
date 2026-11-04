require('../register.cjs');
const { randomUUID } = require('node:crypto');
const { openDatabase } = require('./watermelon-fixture.cjs');
const { SyncJournal } = require('../../src/libs/sync/journal.ts');
(async () => {
  const opened = await openDatabase(process.argv[2]);
  const journal = new SyncJournal(opened.storage, JSON.parse(process.argv[3]), { id: randomUUID, now: () => new Date().toISOString() });
  await journal.capture([{ kind: 'RISK_DATA', entityId: 'risk-before-kill', payload: { description: 'Coleta persistida antes de SIGKILL' } }]);
  process.stdout.write('DURABLE\n');
  setInterval(() => {}, 1000);
})().catch((error) => { console.error(error); process.exitCode = 1; });
