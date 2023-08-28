import { STabView } from '@components/organisms/STabView';
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import { CharacterizationFormProps, RiskDataFormProps } from '../../types';
import { ICharacterizationValues } from '../../schemas';
import { Control, useForm } from 'react-hook-form';
import { CharacterizationForm } from '../Characterization/CharacterizationForm';
import { SScreenHeader } from '@components/organisms';
import { SBox, SCenter, SSpinner } from '@components/core';
import { RiskTable } from '../Risk/RiskTable';
import { RiskDataForm } from './RiskDataForm';
import { IRiskDataValues } from './schemas';
import { useCallback, useState } from 'react';
import { RiskDataRepository } from '@repositories/riskDataRepository';
import { RiskRepository } from '@repositories/riskRepository';
import { useGetRiskDatabase } from '@hooks/useGetRiskDatabase';
import { SSearchSimpleModal } from '@components/organisms/SSearchModal/components/SSearchSimpleModal';
import { SLoadingPage } from '@components/organisms/SLoadingPage';

type PageProps = {
    onSaveForm: (form: RiskDataFormProps) => void;
    onGoBack: () => void;
    onDeleteForm?: (form: RiskDataFormProps) => Promise<void>;
    isEdit?: boolean;
    onClickRisk?: (risk: any) => void;
    initFormData: RiskDataFormProps;
    title?: string;
};

export function RiskDataPage({ initFormData, title, onSaveForm, onDeleteForm, onGoBack, ...props }: PageProps) {
    const [form, setForm] = useState(initFormData || ({} as RiskDataFormProps));
    const { control, trigger, getValues, setValue, watch } = useForm<IRiskDataValues>();
    const [isLoadingPage, setIsLoading] = useState(false);

    const { risk, isLoading: isLoadingRisk } = useGetRiskDatabase({ riskId: initFormData.riskId });

    const isLoading = isLoadingPage || isLoadingRisk;

    const onEditForm = useCallback((formValues: Partial<RiskDataFormProps>) => {
        setForm((prev) => ({ ...prev, ...formValues }));
    }, []);

    const onSave = useCallback(async () => {
        const isValid = await trigger(['probability']);

        if (isValid) {
            const { probability, probabilityAfter } = getValues();

            onSaveForm({
                ...form,
                probability,
                probabilityAfter,
            });
            onGoBack();
        }
    }, [trigger, getValues, onSaveForm, form, onGoBack]);

    const handleDelete = useCallback(async () => {
        try {
            if (onDeleteForm) {
                setIsLoading(true);
                await onDeleteForm(form);
                onGoBack();
            }
        } catch (e) {
            /* empty */
        }
        setIsLoading(false);
    }, [onDeleteForm, form, onGoBack]);

    const getRiskData = useCallback(async () => {
        try {
            if (initFormData) {
                const id = initFormData?.id;
                let data: RiskDataFormProps = {
                    ...initFormData,
                };

                if (id) {
                    setIsLoading(true);
                    const riskDataRepository = new RiskDataRepository();
                    const { riskData } = await riskDataRepository.findOne(id);

                    const rest = await riskDataRepository.getRiskDataInfo(riskData);
                    data = { ...data, ...(rest as any) };

                    data.probability = riskData.probability;
                    data.probabilityAfter = riskData.probabilityAfter;
                    setIsLoading(false);
                    setForm(data);
                }

                if (data.probability) setValue('probability', data.probability);
                if (data.probabilityAfter) setValue('probabilityAfter', data.probabilityAfter);
            }
        } catch (e) {
            setIsLoading(false);
        }
    }, [initFormData, setValue]);

    React.useEffect(() => {
        getRiskData();
    }, [getRiskData]);

    return (
        <>
            <SScreenHeader
                isAlert={true}
                title={title || risk?.name || (!props.isEdit ? 'Adicionar' : 'Editar')}
                onDelete={onDeleteForm ? () => handleDelete() : undefined}
                backButton
                navidateFn={onGoBack}
                mb={-2}
            />
            <RiskDataForm
                form={form}
                risk={risk}
                onEditForm={onEditForm}
                onSaveForm={onSave}
                control={control}
                watch={watch}
                {...props}
            />
            <SLoadingPage isLoading={isLoading} />
        </>
    );
}
