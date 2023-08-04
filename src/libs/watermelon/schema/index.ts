import { appSchema } from '@nozbe/watermelondb';
import { characterizationSchema } from './characterizationSchema';
import { photoSchema } from './characterizationPhotoSchema';

const schemas = appSchema({
    version: 1,
    tables: [characterizationSchema, photoSchema],
});

export { schemas };
