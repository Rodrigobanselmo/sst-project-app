import { SButton } from '@components/modelucules';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { RiskDataFormProps } from '../../../../types';
import { RiskTable } from '../../../Risk/RiskTable';
import { RiskDataPage } from '@screens/Characterization/components/RiskData/RiskDataPage';
import { useAuth } from '@hooks/useAuth';
import { RiskDataRepository } from '@repositories/riskDataRepository';

type TabProps = {
    onGoBack: () => void;
};

export function RiskDataTab({ onGoBack }: TabProps) {
    const characterizationId = useCharacterizationFormStore((state) => state.getCharacterizationId());
    const setForm = useCharacterizationFormStore((state) => state.setForm);
    const { user } = useAuth();

    const onRiskDataSave = React.useCallback(
        async (formValues: RiskDataFormProps) => {
            try {
                if (characterizationId && formValues.id) {
                    const riskDataRepository = new RiskDataRepository();
                    await riskDataRepository.update(formValues.id, formValues);
                } else if (characterizationId) {
                    const riskDataRepository = new RiskDataRepository();
                    await riskDataRepository.createRiskDataWithRecMedGs([formValues], characterizationId, user.id);
                }

                useCharacterizationFormStore.getState().addFormRiskData(formValues);
            } catch (error) {
                console.error(error);
            }
        },
        [characterizationId, user.id],
    );

    const onRiskDataDelete = React.useCallback(
        async (formValues: RiskDataFormProps) => {
            if (characterizationId && formValues.id) {
                const riskDataRepository = new RiskDataRepository();
                await riskDataRepository.delete(formValues.id);
            }

            setForm((prev) => {
                const riskData = [...(prev.riskData || [])];
                const riskIndex = riskData.findIndex((rd) => rd.riskId === formValues.riskId);

                if (riskIndex >= 0) {
                    riskData.splice(riskIndex, 1);
                }

                return { ...prev, riskData };
            });
        },
        [characterizationId, setForm],
    );

    return (
        <RiskDataPage
            onSaveForm={onRiskDataSave}
            onGoBack={onGoBack}
            isEdit={!!characterizationId}
            onDeleteForm={onRiskDataDelete}
        />
    );
}
