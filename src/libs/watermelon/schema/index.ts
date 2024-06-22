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
import { recsRiskDataSchema } from './_MMSchema/recsRiskDataSchema';
import { workspaceHierarchySchema } from './_MMSchema/workspaceHierarchySchema';
import { characterizationHierarchySchema } from './_MMSchema/characterizationHierarchySchema';
import { characterizationEmployeeSchema } from './_MMSchema/characterizationEmployeeSchema';
import { employeeSchema } from './employeeSchema';

const schemas = appSchema({
    version: 44,
    tables: [
        companySchema,
        workspaceSchema,
        characterizationSchema,
        photoSchema,
        userAuthSchema,
        admsRiskDataSchema,
        engsRiskDataSchema,
        episRiskDataSchema,
        recsRiskDataSchema,
        generateRiskDataSchema,
        hierarchySchema,
        recMedSchema,
        generateSourceSchema,
        riskDataSchema,
        riskSchema,
        workspaceHierarchySchema,
        characterizationHierarchySchema,
        characterizationEmployeeSchema,
        employeeSchema,
    ],
});

export { schemas };
