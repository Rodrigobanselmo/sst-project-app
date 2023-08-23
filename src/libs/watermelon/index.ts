import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schemas } from './schema';
import { CharacterizationPhotoModel } from './model/CharacterizationPhotoModel';
import { CharacterizationModel } from './model/CharacterizationModel';
import { migrations } from './migrations';
import { CompanyModel } from './model/CompanyModel';
import { WorkspaceModel } from './model/WorkspaceModel';
import { UserAuthModel } from './model/UserAuthModel';

const adapter = new SQLiteAdapter({
    schema: schemas,
    // migrations: migrations,
});

export const database = new Database({
    adapter,
    modelClasses: [UserAuthModel, CompanyModel, WorkspaceModel, CharacterizationModel, CharacterizationPhotoModel],
});
