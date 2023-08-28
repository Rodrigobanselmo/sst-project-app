import React from 'react';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { SCenter, SHStack, SText } from '@components/core';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { hierarchyConstant } from '@constants/maps/hierarchy.map';
import { HierarchyListParents } from '@utils/helpers/hierarchyListParents';

interface ITagRiskProps {
    hierarchy: HierarchyListParents;
    hideName?: boolean;
}

export const STagHierarchy = ({ hideName, hierarchy }: ITagRiskProps) => {
    return (
        <SHStack flex={1}>
            <SCenter mt={'1px'} width="30px" height={'20px'} borderRadius="4px" mr={2}>
                <SText fontFamily="heading" fontSize={10} color="white">
                    {hierarchyConstant[hierarchy.type]?.short || ''}
                </SText>
            </SCenter>
            {!hideName && (
                <SText flex={1} fontSize={14}>
                    {!hideName ? hierarchy?.name || '' : ''}
                </SText>
            )}
        </SHStack>
    );
};
