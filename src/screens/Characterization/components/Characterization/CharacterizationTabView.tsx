import { STabView } from '@components/organisms/STabView';
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
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

type PageProps = {
    // onIndexChange: (index: number) => void;
    // index: number;
    isLoading?: boolean;
    openCamera: () => void;
    form: CharacterizationFormProps;
    onEditForm: (form: Partial<CharacterizationFormProps>) => void;
    onSaveForm: () => Promise<any>;
    onGoBack: () => void;
    onDeleteForm?: () => Promise<void>;
    control: Control<ICharacterizationValues, any>;
    isEdit?: boolean;
    onClickRisk?: (risk: RiskModel, options?: { cb: () => void }) => Promise<void>;
    onClickHierarchy?: (hierarchy: IHierarchy, options?: { cb: () => void }) => Promise<void>;
    onClickEmployee?: (employee: EmployeeModel, options?: { cb: () => void }) => Promise<void>;
    onAddRisk: (formValues: RiskDataFormProps) => void;
    profilesProps: {
        characterizationsProfiles?: CharacterizationModel[];
        isLoadingProfiles?: boolean;
        principalProfileId?: string;
        isPrincipalProfile?: boolean;
        onChangeProfile?: (characterzationId: string) => Promise<void>;
        onAddProfile?: () => Promise<void>;
    };
};

export function CharacterizationTabView(props: PageProps) {
    const [index, setIndex] = React.useState(0);
    const [routes] = React.useState([
        { key: '1', title: 'Principal' },
        { key: '2', title: 'Riscos' },
        { key: '3', title: 'Cargos' },
        { key: '4', title: 'Funcionários' },
    ]);

    const onSave = React.useCallback(async () => {
        props.onSaveForm();
        setIndex(0);
    }, [props]);

    const renderScene = React.useCallback(
        ({ route }: any) => {
            switch (route.key) {
                case '1':
                    return <CharacterizationForm {...props} />;
                case '2':
                    return (
                        <>
                            <RiskTable
                                {...props}
                                onSaveForm={onSave}
                                renderRightElement={(risk, selected) => {
                                    if (selected) return <></>;
                                    return (
                                        <SButton
                                            title={'adicionar'}
                                            fontSize={13}
                                            variant="outline"
                                            autoWidth
                                            height={6}
                                            p={0}
                                            px={3}
                                            onPress={() => props.onAddRisk({ riskId: risk.id })}
                                        />
                                    );
                                }}
                            />
                        </>
                    );
                case '3':
                    return <HierarchyTable {...props} onClick={props?.onClickHierarchy} onSaveForm={onSave} />;
                case '4':
                    return <EmployeesTable {...props} onClick={props?.onClickEmployee} onSaveForm={onSave} />;
                default:
                    return null as any;
            }
        },
        [onSave, props],
    );

    return (
        <>
            <SScreenHeader
                isAlert={true}
                title={
                    (!props.isEdit ? 'Adicionar' : 'Editar') +
                    (props.form.profileName ? ` (${props.form.profileName})` : '')
                }
                onDelete={props.onDeleteForm}
                backButton
                navidateFn={props.onGoBack}
                mb={-2}
            />
            <STabView renderScene={renderScene} onIndexChange={(i) => setIndex(i)} index={index} routes={routes} />
        </>
    );
}
