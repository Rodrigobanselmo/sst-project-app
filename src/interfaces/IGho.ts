import { StatusEnum } from '@constants/enums/status.enum';
import { IWorkspace } from './ICompany';
import { IHierarchy } from './IHierarchy';
import { HomoTypeEnum } from '@constants/enums/homo-type.enum';
import { IRiskData } from './IRiskData';

interface IHierarchyGho extends Omit<IHierarchy, 'workspaceIds'> {
    workspaceId: string;
}

export interface IGho {
    id: string;
    created_at: Date;
    status: StatusEnum;
    name: string;
    description: string;
    companyId: string;
    hierarchies?: IHierarchyGho[];
    workspaces?: IWorkspace[];
    hierarchy?: IHierarchyGho;
    employeeCount: number;
    hierarchyOnHomogeneous?: IHierarchyOnHomogeneous[];
    workspaceIds: string[];
    type?: HomoTypeEnum;
    riskData?: IRiskData;
}

export interface IHierarchyOnHomogeneous {
    id: number;
    hierarchyId: string;
    homogeneousGroupId: string;
    workspaceId: string;
    hierarchy?: IHierarchy;
    workspace?: IWorkspace;
    homogeneousGroup?: IGho;
    endDate: Date;
    startDate: Date;
}
