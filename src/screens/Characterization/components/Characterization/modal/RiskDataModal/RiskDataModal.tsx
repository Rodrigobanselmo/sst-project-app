/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-empty-pattern */
import { SFullPageModal } from '@components/organisms/SModal/components/SFullPageModal';
import { useAuth } from '@hooks/useAuth';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';
import { RiskDataRepository } from '@repositories/riskDataRepository';
import { RiskDataPage } from '@screens/Characterization/components/RiskData/RiskDataPage';
import { RiskDataFormProps } from '@screens/Characterization/types';
import { useCallback } from 'react';
import uuidGenerator from 'react-native-uuid';

type MyComponentProps = {
    onRiskDataSave: (formValues: RiskDataFormProps) => void;
};

export const RiskDataModal = ({ onRiskDataSave }: MyComponentProps) => {
    const characterizationId = useCharacterizationFormStore((state) => state.getCharacterizationId());
    const setForm = useCharacterizationFormStore((state) => state.setForm);
    const riskId = useCharacterizationFormStore((state) => state.selectedRiskId);
    const setSelectedRiskDataId = useCharacterizationFormStore((state) => state.setSelectedRiskDataId);
    const { user } = useAuth();

    const onRiskDataDelete = useCallback(
        async (formValues: RiskDataFormProps) => {
            console.log(formValues);
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
