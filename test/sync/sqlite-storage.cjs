const { DatabaseSync } = require('node:sqlite');
class SqliteStorage {
  constructor(filename) {
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS sync_values (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  }
  async getItem(key) { return this.db.prepare('SELECT value FROM sync_values WHERE key=?').get(key)?.value ?? null; }
  async setItem(key, value) { this.db.prepare('INSERT INTO sync_values(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value); }
  async removeItem(key) { this.db.prepare('DELETE FROM sync_values WHERE key=?').run(key); }
  close() { this.db.close(); }
}
module.exports = { SqliteStorage };
