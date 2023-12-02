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

type PageProps = {
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

export function CharacterizationTabView({ onSaveForm, ...props }: PageProps) {
    const tabRef = React.useRef<any>(null);
    const onSave = React.useCallback(async () => {
        onSaveForm();
        tabRef.current?.setIndex(0);
    }, [onSaveForm]);

    const riskIds = React.useMemo(() => {
        return props.form.riskData?.map((risk) => risk.riskId) || [];
    }, [props.form]);

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
            <STabView
                tabsRef={tabRef}
                routes={[
                    {
                        label: 'Principal',
                        component: (
                            <CharacterizationForm
                                profilesProps={props.profilesProps}
                                onSaveForm={onSaveForm}
                                onEditForm={props.onEditForm}
                                control={props.control}
                                openCamera={props.openCamera}
                                audios={props.form.audios}
                                videos={props.form.videos}
                                photos={props.form.photos}
                                selectedId={props.form.id}
                            />
                        ),
                    },
                    {
                        label: 'Riscos',
                        component: (
                            <RiskTable
                                riskIds={riskIds}
                                isEdit={props.isEdit}
                                onClickRisk={props.onClickRisk}
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
                        ),
                    },
                    {
                        label: 'Cargos',
                        component: <HierarchyTable {...props} onClick={props?.onClickHierarchy} onSaveForm={onSave} />,
                    },
                    {
                        label: 'Funcionários',
                        component: <EmployeesTable {...props} onClick={props?.onClickEmployee} onSaveForm={onSave} />,
                    },
                ]}
            />
        </>
    );
}
