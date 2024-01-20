import { SLoading } from '@components/modelucules';
import { SScreenHeader } from '@components/organisms';
import { useGetRiskDatabase } from '@hooks/database/useGetRiskDatabase';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';
import { RiskDataRepository } from '@repositories/riskDataRepository';
import * as React from 'react';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiskDataFormProps } from '../../types';
import { RiskDataForm } from './RiskDataForm';
import { IRiskDataValues } from './schemas';
import { SHeader } from '@components/organisms/SScreenHeader/SHeader';

type PageProps = {
    onSaveForm: (form: RiskDataFormProps) => void;
    onGoBack: () => void;
    onDeleteForm?: (form: RiskDataFormProps) => Promise<void>;
    isEdit?: boolean;
    onClickRisk?: (risk: any) => void;
    title?: string;
};

export function RiskDataPage({ title, onSaveForm, onDeleteForm, onGoBack, ...props }: PageProps) {
    const [form, setForm] = useState({} as RiskDataFormProps);
    const riskId = useCharacterizationFormStore((state) => state.selectedRiskId);

    const { control, getValues, setValue } = useForm<IRiskDataValues>();
    const [isLoadingPage, setIsLoading] = useState(true);

    const { risk, isLoading: isLoadingRisk } = useGetRiskDatabase({ riskId });

    const isLoading = isLoadingPage || isLoadingRisk;

    const onEditForm = useCallback((formValues: Partial<RiskDataFormProps>) => {
        setForm((prev) => ({ ...prev, ...formValues }));
    }, []);

    const onSave = useCallback(async () => {
        const { probability, probabilityAfter } = getValues();

        onSaveForm({
            ...form,
            riskId,
            probability,
            probabilityAfter,
        });

        onGoBack();
    }, [getValues, onSaveForm, riskId, form, onGoBack]);

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
            const riskData = useCharacterizationFormStore.getState().getSelectedRiskData();

            if (riskData) {
                const id = riskData?.id;
                let data: RiskDataFormProps = { ...riskData };

                if (id) {
                    const riskDataRepository = new RiskDataRepository();
                    const { riskData } = await riskDataRepository.findOne(id);

                    const rest = await riskDataRepository.getRiskDataInfo(riskData);
                    data = { ...data, ...(rest as any) };

                    data.probability = riskData.probability;
                    data.probabilityAfter = riskData.probabilityAfter;
                    setForm(data);
                }

                if (data.probability) setValue('probability', data.probability);
                if (data.probabilityAfter) setValue('probabilityAfter', data.probabilityAfter);
            }
        } catch (e) {
            console.info(e);
            // empty
        }

        setIsLoading(false);
    }, [setValue]);

    React.useEffect(() => {
        getRiskData();
    }, [getRiskData]);

    if (isLoading) {
        return <SLoading />;
    }

    return (
        <>
            <SHeader
                isAlert={true}
                title={title || risk?.name || (!props.isEdit ? 'Adicionar' : 'Editar')}
                onDelete={onDeleteForm ? () => handleDelete() : undefined}
                backButton
                navidateFn={onGoBack}
                mb={-2}
                pt={30}
            />
            <RiskDataForm
                form={form}
                risk={risk}
                onEditForm={onEditForm}
                onSaveForm={onSave}
                control={control}
                {...props}
            />
        </>
    );
}
