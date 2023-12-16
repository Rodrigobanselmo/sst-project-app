/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-empty-pattern */
import { SFullPageModal } from '@components/organisms/SModal/components/SFullPageModal';
import { useAuth } from '@hooks/useAuth';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';
import { RiskDataRepository } from '@repositories/riskDataRepository';
import { RiskDataPage } from '@screens/Characterization/components/RiskData/RiskDataPage';
import { RiskDataFormProps } from '@screens/Characterization/types';
import { useCallback } from 'react';

type MyComponentProps = {};

export const RiskDataModal = ({}: MyComponentProps) => {
    const characterizationId = useCharacterizationFormStore((state) => state.getCharacterizationId());
    const setForm = useCharacterizationFormStore((state) => state.setForm);
    const riskId = useCharacterizationFormStore((state) => state.selectedRiskId);
    const setSelectedRiskDataId = useCharacterizationFormStore((state) => state.setSelectedRiskDataId);
    const { user } = useAuth();

    const onRiskDataSave = useCallback(
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

    const onRiskDataDelete = useCallback(
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

    const onClose = () => {
        setSelectedRiskDataId('');
    };

    const open = !!riskId;

    console.log('modal page');

    return (
        <SFullPageModal open={open} onClose={onClose}>
            <RiskDataPage
                onSaveForm={onRiskDataSave}
                onGoBack={onClose}
                isEdit={!!characterizationId}
                onDeleteForm={onRiskDataDelete}
            />
        </SFullPageModal>
    );
};
