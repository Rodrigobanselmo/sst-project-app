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
import { RecsRiskDataModel } from './model/_MMModel/RecsRiskDataModel';
import { GenerateRiskDataModel } from './model/_MMModel/GenerateRiskDataModel';
import { WorkspaceHierarchyModel } from './model/_MMModel/WorkspaceHierarchyModel';
import { CharacterizationHierarchyModel } from './model/_MMModel/CharacterizationHierarchyModel';

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
        GenerateSourceModel,

        AdmsRiskDataModel,
        EngsRiskDataModel,
        EpisRiskDataModel,
        RecsRiskDataModel,
        GenerateRiskDataModel,
        WorkspaceHierarchyModel,
        CharacterizationHierarchyModel,
    ],
});
