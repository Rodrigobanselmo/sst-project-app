import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { CharacterizationModel } from './model/CharacterizationModel';
import { CharacterizationPhotoModel } from './model/CharacterizationPhotoModel';
import { CompanyModel } from './model/CompanyModel';
import { GenerateSourceModel } from './model/GenerateSourceModel';
import { HierarchyModel } from './model/HierarchyModel';
import { RecMedModel } from './model/RecMedModel';
import { RiskDataModel } from './model/RiskDataModel';
import { RiskModel } from './model/RiskModel';
import { UserAuthModel } from './model/UserAuthModel';
import { WorkspaceModel } from './model/WorkspaceModel';
import { AdmsRiskDataModel } from './model/_MMModel/AdmsRiskDataModel';
import { EngsRiskDataModel } from './model/_MMModel/EngsRiskDataModel';
import { EpisRiskDataModel } from './model/_MMModel/EpisRiskDataModel';
import { schemas } from './schema';

const adapter = new SQLiteAdapter({
    schema: schemas,
    // migrations: migrations,
});

export const database = new Database({
    adapter,
    modelClasses: [
        UserAuthModel,
        CompanyModel,
        WorkspaceModel,
        CharacterizationModel,
        CharacterizationPhotoModel,
        RiskModel,
        HierarchyModel,
        RiskDataModel,
        RecMedModel,
        AdmsRiskDataModel,
        EngsRiskDataModel,
        EpisRiskDataModel,
        GenerateSourceModel,
    ],
});
