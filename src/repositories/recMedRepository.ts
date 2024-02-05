import { DBTablesEnum } from '@constants/enums/db-tables';
import { MeasuresTypeEnum, RecTypeEnum } from '@constants/enums/risk.enum';
import { StatusEnum } from '@constants/enums/status.enum';
import { database } from '@libs/watermelon';
import { RecMedModel } from '@libs/watermelon/model/RecMedModel';

export interface IRecMedCreate {
    apiId?: string;
    riskId: string;
    companyId?: string;
    recName?: string;
    medName?: string;
    status?: StatusEnum;
    medType?: MeasuresTypeEnum;
    recType?: RecTypeEnum;
    userId: string;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

export class RecMedRepository {
    constructor() {}

    async update(id: string, data: Partial<IRecMedCreate>) {
        await database.write(async () => {
            const recMedTable = database.get<RecMedModel>(DBTablesEnum.REC_MED);

            try {
                const recMed = await recMedTable.find(id);
                const newRecMed = await recMed.update((recMed) => {
                    if (data.apiId) recMed.apiId = data.apiId;
                    if (data.riskId) recMed.riskId = data.riskId;
                    if (data.userId) recMed.userId = String(data.userId);
                    if (data.recName) recMed.recName = data.recName;
                    if (data.medName) recMed.medName = data.medName;
                    if (data.recType) recMed.recType = data.recType;
                    if (data.medType) recMed.medType = data.medType;
                    if (data.status) recMed.status = data.status;
                    recMed.updated_at = new Date();
                });

                return newRecMed;
            } catch (error) {
                console.error(error);
            }
        });
    }
}
