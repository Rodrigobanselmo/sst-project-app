import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

/** Watermelon's default for a missing migration range is to reset the database.
 * A visit database contains original evidence, so refusing to open is safer
 * than silently erasing an older installation with an uncovered upgrade path.
 */
export class PreservingSQLiteAdapter extends SQLiteAdapter {
    _setUpWithMigrations(databaseVersion: number, callback: Parameters<SQLiteAdapter['_setUpWithMigrations']>[1]): void {
        let supported = false;
        try { supported = !!this._migrationSteps(databaseVersion); } catch { /* Keep unknown versions intact. */ }
        if (!supported) {
            callback({ error: new Error(`O banco local está na versão ${databaseVersion}, sem atualização segura disponível para ${this.schema.version}. Os dados foram mantidos. Não reinstale nem limpe o app; entre em contato com o suporte para recuperar as coletas.`) });
            return;
        }
        super._setUpWithMigrations(databaseVersion, callback);
    }
}
