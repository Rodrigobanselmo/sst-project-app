import { SBox, SCenter, SText } from '@components/core';
import React from 'react';
// import * as ImagePicker from 'expo-image-picker';
import { getMatrizRisk } from '@utils/helpers/matriz';
import { UseFormWatch } from 'react-hook-form';
import { IRiskDataValues } from './schemas';

type PageProps = {
    severity: number;
    probability: number;
    mb?: number;
};

export function RiskOcupacionalTag({ severity, mb, probability }: PageProps): React.ReactElement {
    const actualMatrixLevel = getMatrizRisk(Number(probability || 0), severity);

    return (
        <SText mb={mb} fontSize="sm" color={actualMatrixLevel?.color} fontFamily={'heading'}>
            Risco Ocupacional: {actualMatrixLevel?.label}
        </SText>
    );
}
