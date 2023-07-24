import { ApiRoutesEnum } from "@constants/enums/api-routes.enums";
import { api } from "@services/api";
import { IUser } from "@interfaces/IUser";

export interface IResponseGetRefreshToken {
  companyId: string;
  permissions: string[];
  roles: string[];
  refresh_token: string;
  token: string;
  user: IUser;
}

export async function getRefreshToken({ refresh_token }: { refresh_token: string; }): Promise<IResponseGetRefreshToken> {
  const { data } = await api.post<IResponseGetRefreshToken>(ApiRoutesEnum.REFRESH, { refresh_token, isApp: true });

  return data;
}
