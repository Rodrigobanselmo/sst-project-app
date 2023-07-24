import { ProfessionalTypeEnum } from "@constants/enums/professional-type.enum";
import { StatusEnum } from "@constants/enums/status.enum";

export type IUserCompany = {
	roles: string[];
	permissions: string[];
	status: StatusEnum;
	userId: number;
	groupId: number;
	companyId: string;
	created_at: Date;
	updated_at: Date;
};

export type IUserToRiskGroup = {
	userId: number;
	riskDataGroupId: string;
	isSigner: boolean;
	user?: IUser;
};

export type IUser = {
	id: number;
	name: string;
	cpf: string;
	crea: string;
	crm: string;
	formation: string[];
	certifications: string[];
	phone: string;
	email: string;
	facebookExternalId: string;
	googleExternalId: string;
	googleUser: string;
	facebookuser: string;
	type: ProfessionalTypeEnum;
	password: string;
	created_at: Date;
	updated_at: Date;
	companies: IUserCompany[];
	userPgrSignature?: IUserToRiskGroup;
	usersPgrSignatures?: IUserToRiskGroup[];
	permissions?: string[];
	roles?: string[];
	companyId?: string;
	councilType: string;
	councilUF: string;
	councilId: string;
	photoUrl?: string;
};
