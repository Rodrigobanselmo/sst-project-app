import React from 'react';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { SCenter, SHStack, SText } from '@components/core';

interface ITagRiskProps {
    risk: RiskModel;
    hideRiskName?: boolean;
}

export const STagRisk = ({ hideRiskName, risk }: ITagRiskProps) => {
    return (
        <SHStack flex={1}>
            <SCenter
                mt={'1px'}
                width="30px"
                height={'20px'}
                borderRadius="4px"
                bg={`risk.${risk?.type?.toLowerCase()}`}
                mr={2}
            >
                <SText fontFamily="heading" fontSize={10} color="white">
                    {risk?.type || ''}
                </SText>
            </SCenter>
            {!hideRiskName && (
                <SText flex={1} fontSize={14}>
                    {!hideRiskName ? risk?.name || '' : ''}
                </SText>
            )}
        </SHStack>
    );
};
