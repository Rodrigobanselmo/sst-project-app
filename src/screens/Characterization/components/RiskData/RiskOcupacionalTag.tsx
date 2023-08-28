import { SBox, SCenter, SText } from '@components/core';
import React from 'react';
// import * as ImagePicker from 'expo-image-picker';
import { getMatrizRisk } from '@utils/helpers/matriz';
import { UseFormWatch } from 'react-hook-form';
import { IRiskDataValues } from './schemas';

type PageProps = {
    watch: UseFormWatch<IRiskDataValues>;
    severity: number;
    keyValue: 'probability' | 'probabilityAfter';
    mb?: number;
};

export function RiskOcupacionalTag({ watch, severity, mb, keyValue }: PageProps): React.ReactElement {
    const probability = watch(keyValue);
    const actualMatrixLevel = getMatrizRisk(Number(probability || 0), severity);

    return (
        <SText mb={mb} fontSize="sm" color={actualMatrixLevel?.color} fontFamily={'heading'}>
            Risco Ocupacional: {actualMatrixLevel?.label}
        </SText>
    );
}
