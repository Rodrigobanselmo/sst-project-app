import { DBTablesEnum } from '@constants/enums/db-tables';
import { StatusEnum } from '@constants/enums/status.enum';
import { database } from '@libs/watermelon';
import { GenerateSourceModel } from '@libs/watermelon/model/GenerateSourceModel';

export interface IGenerateSourceCreate {
    apiId?: string;
    riskId: string;
    companyId?: string;
    name?: string;
    status?: StatusEnum;
    userId: string;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

export class GenerateSourceRepository {
    constructor() {}

    async update(id: string, data: Partial<IGenerateSourceCreate>) {
        await database.write(async () => {
            const generateSourceTable = database.get<GenerateSourceModel>(DBTablesEnum.GENERATE_SOURCE);

            try {
                const generateSource = await generateSourceTable.find(id);
                const newGenerateSource = await generateSource.update((recMed) => {
                    if (data.apiId) recMed.apiId = data.apiId;
                    if (data.riskId) recMed.riskId = data.riskId;
                    if (data.userId) recMed.userId = String(data.userId);
                    if (data.name) recMed.name = data.name;
                    if (data.status) recMed.status = data.status;
                    recMed.updated_at = new Date();
                });

                return newGenerateSource;
            } catch (error) {
                console.error(error);
            }
        });
    }
}
