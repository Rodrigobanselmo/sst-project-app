import { HierarchyEnum } from '@constants/enums/hierarchy.enum';
import { StatusEnum } from '@constants/enums/status.enum';

export interface IHierarchy {
    id: string;
    type: HierarchyEnum;
    name: string;
    created_at?: Date;
    status?: StatusEnum;
    companyId?: string;
    description?: string;
    realDescription?: string;
    parentId?: string | null;
    workspaceIds?: string[];
}

export type IHierarchyMap = Record<
    string,
    IHierarchy & {
        children: (string | number)[];
    }
>;
