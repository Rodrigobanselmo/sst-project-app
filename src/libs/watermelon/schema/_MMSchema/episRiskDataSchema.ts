import { DBTablesEnum } from '@constants/enums/db-tables';
import { tableSchema } from '@nozbe/watermelondb';

const episRiskDataSchema = tableSchema({
    name: DBTablesEnum.MM_EPIS_TO_RISK_DATA,
    columns: [
        { name: 'description', type: 'string' },
        { name: 'ca', type: 'string' },
        { name: 'epiId', type: 'number' },
        { name: 'riskDataId', type: 'string' },
        { name: 'efficientlyCheck', type: 'boolean', isOptional: true },
        { name: 'epcCheck', type: 'boolean', isOptional: true },
        { name: 'lifeTimeInDays', type: 'number', isOptional: true },
        { name: 'longPeriodsCheck', type: 'boolean', isOptional: true },
        { name: 'maintenanceCheck', type: 'boolean', isOptional: true },
        { name: 'sanitationCheck', type: 'boolean', isOptional: true },
        { name: 'tradeSignCheck', type: 'boolean', isOptional: true },
        { name: 'trainingCheck', type: 'boolean', isOptional: true },
        { name: 'unstoppedCheck', type: 'boolean', isOptional: true },
        { name: 'validationCheck', type: 'boolean', isOptional: true },
        { name: 'user_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
    ],
});

export { episRiskDataSchema };
