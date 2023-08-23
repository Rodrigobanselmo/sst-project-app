import { appSchema } from '@nozbe/watermelondb';
import { characterizationSchema } from './characterizationSchema';
import { photoSchema } from './characterizationPhotoSchema';
import { companySchema } from './companySchema';
import { workspaceSchema } from './workspaceSchema';
import { userAuthSchema } from './userAuthSchema';

const schemas = appSchema({
    version: 1,
    tables: [companySchema, workspaceSchema, characterizationSchema, photoSchema, userAuthSchema],
});

export { schemas };
