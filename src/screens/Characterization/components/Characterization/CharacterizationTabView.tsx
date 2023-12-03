import { STabView } from '@components/organisms/STabView';
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { TabView, SceneMap, SceneRendererProps } from 'react-native-tab-view';
import { CharacterizationFormProps, RiskDataFormProps } from '../../types';
import { ICharacterizationValues } from '../../schemas';
import { Control } from 'react-hook-form';
import { CharacterizationForm } from './CharacterizationForm';
import { SScreenHeader } from '@components/organisms';
import { SBox, SVStack } from '@components/core';
import { RiskTable } from '../Risk/RiskTable';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { SButton } from '@components/modelucules';
import { SAFE_AREA_PADDING, pagePadding } from '@constants/constants';
import { HierarchyTable } from '../Hierarchy/HierarchyTable';
import { IHierarchy } from '@interfaces/IHierarchy';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { EmployeesTable } from '../Employees/EmployeesTable';
import { EmployeeModel } from '@libs/watermelon/model/EmployeeModel';
import { RiskTab } from './tabs/RiskTab/RiskTab';
import { HeaderTab } from './tabs/HeaderTab/HeaderTab';

type PageProps = {
    openCamera: () => void;
    onEditForm: (form: Partial<CharacterizationFormProps>) => void;
    onSaveForm: () => Promise<any>;
    onGoBack: () => void;
    onDeleteForm?: () => Promise<void>;
    control: Control<ICharacterizationValues, any>;
    onClickRisk?: (risk: RiskModel, options?: { cb: () => void }) => Promise<void>;
    onClickHierarchy?: (hierarchy: IHierarchy, options?: { cb: () => void }) => Promise<void>;
    onClickEmployee?: (employee: EmployeeModel, options?: { cb: () => void }) => Promise<void>;
    onAddRisk: (formValues: RiskDataFormProps) => void;
    profilesProps: {
        characterizationsProfiles?: CharacterizationModel[];
        principalProfileId?: string;
        onChangeProfile?: (characterzationId: string) => Promise<void>;
        onAddProfile?: () => Promise<void>;
    };
};

export function CharacterizationTabView({
    onSaveForm,
    onAddRisk,
    onClickEmployee,
    onClickHierarchy,
    onDeleteForm,
    onGoBack,
    openCamera,
    profilesProps,
    onEditForm,
    control,
    onClickRisk,
}: PageProps) {
    const tabRef = React.useRef<any>(null);
    const onSave = React.useCallback(async () => {
        onSaveForm();
        tabRef.current?.setIndex(0);
    }, [onSaveForm]);

    return (
        <>
            <HeaderTab onDelete={onDeleteForm} navidateFn={onGoBack} />
            <STabView
                tabsRef={tabRef}
                routes={[
                    {
                        label: 'Principal',
                        component: (
                            <CharacterizationForm
                                profilesProps={profilesProps}
                                onSaveForm={onSaveForm}
                                onEditForm={onEditForm}
                                control={control}
                                openCamera={openCamera}
                            />
                        ),
                    },
                    {
                        label: 'Riscos',
                        component: <RiskTab onClickRisk={onClickRisk} onSave={onSave} onAddRisk={onAddRisk} />,
                    },
                    {
                        label: 'Cargos',
                        component: <HierarchyTable onClick={onClickHierarchy} onSave={onSave} />,
                    },
                    {
                        label: 'Funcionários',
                        component: <EmployeesTable onClick={onClickEmployee} onSave={onSave} />,
                    },
                ]}
            />
        </>
    );
}
