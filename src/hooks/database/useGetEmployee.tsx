import { useCallback, useContext, useEffect, useState } from 'react';

import { AuthContext } from '@contexts/AuthContext';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { UserAuthRepository } from '@repositories/userAuthRepository';
import { useAuth } from '../useAuth';
import { database } from '@libs/watermelon';
import { DBTablesEnum } from '@constants/enums/db-tables';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { RiskRepository } from '@repositories/riskRepository';
import { HierarchyRepository } from '@repositories/hierarchyRepository';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { useSync } from '@hooks/useSync';
import { getHierarchySync } from '@services/api/sync/getHierarchySync';
import { WorkspaceHierarchyModel } from '@libs/watermelon/model/_MMModel/WorkspaceHierarchyModel';
import { useGetDatabase } from './useGetDatabase';
import { EmployeeRepository } from '@repositories/employeeRepository';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';

interface IUseGetDatabase {
    companyId?: string;
    workspaceId?: string;
    userId?: number;
    ids?: string[];
}

export function useGetEmployee({ companyId, workspaceId, ids }: IUseGetDatabase) {
    const onFetchFunction = useCallback(async () => {
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
    }, [companyId, ids, workspaceId]);

    const { data, isError, isLoading, setIsLoading, refetch } = useGetDatabase({
        onFetchFunction,
    });

    return { employees: data, isError, setIsLoading, isLoading, refetch };
}
