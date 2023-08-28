import { DBTablesEnum } from '@constants/enums/db-tables';
import { MeasuresTypeEnum, RecTypeEnum } from '@constants/enums/risk.enum';
import { StatusEnum } from '@constants/enums/status.enum';
import { database } from '@libs/watermelon';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { Q } from '@nozbe/watermelondb';

export interface IRiskCreate {
    apiId?: string;
    name: string;
    severity: number;
    companyId?: string;
    representAll?: boolean;
    isAll?: boolean;
    userId: number;
    recMed?: {
        id?: string;
        apiId?: string;
        recName?: string;
        medName?: string;
        medType?: MeasuresTypeEnum;
        recType?: RecTypeEnum;
    }[];
    generateSource?: {
        id?: string;
        apiId?: string;
        name: string;
    }[];
}

export class RiskRepository {
    constructor() {}

    async findMany({ userId }: { userId: number }) {
        const userTable = database.get<UserAuthModel>(DBTablesEnum.USER_AUTH);
        const user = await userTable.find(String(userId));

        const risks: RiskModel[] = await (user?.risks as any)?.fetch();

        return { risks };
    }

    async findByIds({ ids }: { ids: string[] }) {
        const riskCollection = database.get<RiskModel>(DBTablesEnum.RISK);
        const risks = await riskCollection.query(Q.where('id', Q.oneOf(ids)));

        return { risks };
    }

    async findOne(id: string) {
        const riskCollection = database.get<RiskModel>(DBTablesEnum.RISK);

        const risk = await riskCollection.find(id);

        return { risk };
    }
}
