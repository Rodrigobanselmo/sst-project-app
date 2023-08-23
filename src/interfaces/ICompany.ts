import { StatusEnum } from '@constants/enums/status.enum';

export interface ICompany {
    id: string;
    cnpj: string;
    name: string;
    fantasy: string;
    status: StatusEnum;
    // type: CompanyTypesEnum;
    isConsulting: boolean;
    created_at: Date;
    updated_at: Date;
    licenseId?: number;
    logoUrl?: string;
    parentCompanyId?: string;
    license?: ILicense;
    workspace?: IWorkspace[];
    address?: IAddress;
    size: string;
    phone: string;
    legal_nature: string;
    cadastral_situation: string;
    addressId: string;
    activity_start_date: Date;
    cadastral_situation_date: string;
    legal_nature_code: string;
    cadastral_situation_description: string;
    responsibleName: string;
    operationTime: string;
    riskDegree?: number;
    primary_activity: ICnae[];
    secondary_activity: ICnae[];
    // group: ICompanyGroup;
    // contacts: IContact[];
    employeeCount: number;
    riskGroupCount: number;
    hierarchyCount: number;
    homogenousGroupCount: number;
    professionalCount?: number;
    // doctorResponsible?: IProfessional;
    episCount?: number;

    examCount?: number;
    usersCount?: number;
    riskCount?: number;
    examsCount?: number;
    characterizationCount?: number;
    // lastDocumentVersion?: IRiskDocument[];
    employeeAwayCount?: number;
    employeeInactiveCount?: number;
    clinicsConnectedCount?: number;
    protocolsCount?: number;

    // step?: CompanyStepEnum;
    // steps?: CompanyStepEnum[];
    responsibleNit: string;
    responsibleCpf: string;
    initials: string;
    description: string;
    unit: string;
    obs: string;
    numAsos: number;
    blockResignationExam: boolean;
    esocialStart: Date;
    esocialSend: boolean;
    doctorResponsibleId: number;
    tecResponsibleId: number;
    // clinicExams: IExamToClinic[];
    // scheduleBlocks?: IScheduleBlock[];
    // report: IDashboard;
    receivingServiceContracts?: ICompanyContract[];
    clinicsAvailable: {
        clinicId: string;
        companyId: string;
    }[];

    // permissions: PermissionCompanyEnum[];

    isGroup: boolean;
    isClinic: boolean;
}

export interface ICompanyContract {
    status: StatusEnum;
    applyingServiceCompanyId: string;
    receivingServiceCompanyId: string;
    receivingServiceCompany: ICompany;
    applyingServiceCompany: ICompany;
}

export interface IWorkspace {
    id: string;
    name: string;
    abbreviation: string;
    description: string;
    status: StatusEnum;
    created_at: Date;
    updated_at: Date;
    companyId: string;
    address?: IAddress;
    employeeCount?: number;
    isOwner?: boolean;
    company?: ICompany;
    cnpj?: string;
    // companyJson?: GetCNPJResponse;
}

export interface IAddress {
    id?: string;
    number: string;
    cep: string;
    street: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    workspaceId?: number;
    workspace?: IWorkspace;
}

export interface ILicense {
    id: number;
    companyId: string;
    status: StatusEnum;
    created_at: Date;
    companies?: ICompany[];
}
export interface ICnae {
    name: string;
    code: string;
    riskDegree: string;
}
