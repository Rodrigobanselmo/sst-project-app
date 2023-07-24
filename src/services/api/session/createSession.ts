import { ApiRoutesEnum } from "@constants/enums/api-routes.enums";
import { ISession } from "@interfaces/ISession";
import { api } from "@services/api";


export async function createSession({ email, password }: { email: string; password: string; }): Promise<ISession> {
  const { data } = await api.post<ISession>(ApiRoutesEnum.SESSION, {
    email,
    password,
    isApp: true,
  });

  return data;
}
