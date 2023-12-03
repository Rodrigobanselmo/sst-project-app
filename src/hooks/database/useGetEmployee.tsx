import { useEffect } from 'react';

import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import { EmployeeRepository } from '@repositories/employeeRepository';
import { useGetDatabase } from './useGetDatabase';

interface IUseGetDatabase {
    companyId?: string;
    workspaceId?: string;
    userId?: number;
    ids?: string[];
}

const onFetchEmployee = async ({ companyId, ids, workspaceId }: IUseGetDatabase) => {
    const employeeRepository = new EmployeeRepository();
    const employeesData: EmployeeModel[] = [];

    if (companyId) {
        const { employees } = await employeeRepository.findManyByCompanyId({ companyId });
        employeesData.push(...employees);
    } else if (ids) {
        const { employees } = await employeeRepository.findByIds({ ids });
        employeesData.push(...employees);
    } else if (workspaceId) {
        const { employees } = await employeeRepository.findManyByWorkspaceId({ workspaceId });
        employeesData.push(...employees);
    }

    return employeesData;
};

export function useGetEmployee(props: IUseGetDatabase) {
    const { data, fetch, isLoading, setIsLoading } = useGetDatabase({
        onFetchFunction: () =>
            onFetchEmployee({
                companyId: props.companyId,
                ids: props.ids,
                userId: props.userId,
                workspaceId: props.workspaceId,
            }),
    });

    useEffect(() => {
        fetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.companyId, props.ids, props.userId, props.workspaceId]);

    return { employees: data, setIsLoading, isLoading, refetch: fetch };
}
