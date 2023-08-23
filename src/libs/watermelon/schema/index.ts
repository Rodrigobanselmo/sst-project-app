import { appSchema } from '@nozbe/watermelondb';
import { characterizationSchema } from './characterizationSchema';
import { photoSchema } from './characterizationPhotoSchema';
import { companySchema } from './companySchema';
import { workspaceSchema } from './workspaceSchema';
import { userAuthSchema } from './userAuthSchema';
import { admsRiskDataSchema } from './_MMSchema/admsRiskDataSchema';
import { engsRiskDataSchema } from './_MMSchema/engsRiskDataSchema';
import { episRiskDataSchema } from './_MMSchema/episRiskDataSchema';
import { generateRiskDataSchema } from './_MMSchema/generateRiskDataSchema';
import { hierarchySchema } from './hierarchySchema';
import { recMedSchema } from './recMedSchema';
import { generateSourceSchema } from './generateSourceSchema';
import { riskDataSchema } from './riskDataSchema';
import { riskSchema } from './riskSchema';

const schemas = appSchema({
    version: 1,
    tables: [
        companySchema,
        workspaceSchema,
        characterizationSchema,
        photoSchema,
        userAuthSchema,
        admsRiskDataSchema,
        engsRiskDataSchema,
        episRiskDataSchema,
        generateRiskDataSchema,
        hierarchySchema,
        recMedSchema,
        generateSourceSchema,
        riskDataSchema,
        riskSchema,
    ],
});

export { schemas };
