import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schemas } from './schema';
import { CharacterizationPhotoModel } from './model/CharacterizationPhotoModel';
import { CharacterizationModel } from './model/CharacterizationModel';

const adapter = new SQLiteAdapter({
    schema: schemas,
});

export const database = new Database({
    adapter,
    modelClasses: [CharacterizationModel, CharacterizationPhotoModel],
});
