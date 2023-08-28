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

type PageProps = {
    // onIndexChange: (index: number) => void;
    // index: number;
    openCamera: () => void;
    form: CharacterizationFormProps;
    onEditForm: (form: Partial<CharacterizationFormProps>) => void;
    onSaveForm: () => Promise<void>;
    onGoBack: () => void;
    onDeleteForm?: () => Promise<void>;
    control: Control<ICharacterizationValues, any>;
    isEdit?: boolean;
    onClickRisk?: (risk: RiskModel, options?: { cb: () => void }) => Promise<void>;
    onAddRisk: (formValues: RiskDataFormProps) => void;
};

export function CharacterizationTabView(props: PageProps) {
    const [index, setIndex] = React.useState(0);
    const [routes] = React.useState([
        { key: 'first', title: 'Principal' },
        { key: 'second', title: 'Riscos' },
        { key: 'third', title: 'Cargos' },
    ]);

    const onSave = React.useCallback(async () => {
        props.onSaveForm();
        setIndex(0);
    }, [props]);

    const renderScene = React.useCallback(
        ({ route }: any) => {
            switch (route.key) {
                case 'first':
                    return <CharacterizationForm {...props} />;
                case 'second':
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
                case 'third':
                    return <HierarchyTable {...props} onSaveForm={onSave} />;
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
                title={!props.isEdit ? 'Adicionar' : 'Editar'}
                onDelete={props.onDeleteForm}
                backButton
                navidateFn={props.onGoBack}
                mb={-2}
            />
            <STabView renderScene={renderScene} onIndexChange={(i) => setIndex(i)} index={index} routes={routes} />
        </>
    );
}
