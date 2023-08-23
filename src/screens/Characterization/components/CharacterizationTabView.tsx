import { STabView } from '@components/organisms/STabView';
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import { CharacterizationFormProps } from '../types';
import { ICharacterizationValues } from '../schemas';
import { Control } from 'react-hook-form';
import { CharacterizationForm } from './CharacterizationForm';
import { SScreenHeader } from '@components/organisms';
import { SBox } from '@components/core';
import { RiskPage } from './RiskPage';

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
};

export function CharacterizationTabView(props: PageProps) {
    const [index, setIndex] = React.useState(0);
    const [routes] = React.useState([
        { key: 'first', title: 'Principal' },
        { key: 'second', title: 'Riscos' },
        { key: 'third', title: 'Cargos' },
    ]);

    const renderScene = React.useCallback(
        ({ route }: any) => {
            switch (route.key) {
                case 'first':
                    return <CharacterizationForm {...props} />;
                case 'second':
                    return <RiskPage {...props} />;
                default:
                    return null as any;
            }
        },
        [props],
    );

    return (
        <>
            <SScreenHeader
                isAlert={props.isEdit}
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
