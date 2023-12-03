import { SButton } from '@components/modelucules';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { RiskDataFormProps } from '../../../../types';
import { RiskTable } from '../../../Risk/RiskTable';

type PageProps = {
    onClickRisk?: (risk: RiskModel, options?: { cb: () => void }) => Promise<void>;
    onAddRisk: (formValues: RiskDataFormProps) => void;
    onSave: () => Promise<any>;
};

export function RiskTab({ onSave, onAddRisk, onClickRisk }: PageProps) {
    const riskIds = useCharacterizationFormStore(
        useShallow((state) => state.form?.riskData?.map((risk) => risk.riskId)),
    );

    return (
        <RiskTable
            riskIds={riskIds || []}
            onClickRisk={onClickRisk}
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
                        onPress={() => onAddRisk({ riskId: risk.id })}
                    />
                );
            }}
        />
    );
}
