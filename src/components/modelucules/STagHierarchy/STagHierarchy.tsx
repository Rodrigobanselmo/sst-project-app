import React from 'react';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { SCenter, SHStack, SText } from '@components/core';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';
import { hierarchyConstant } from '@constants/maps/hierarchy.map';
import { HierarchyListParents } from '@utils/helpers/hierarchyListParents';
import { HierarchyEnum } from '@constants/enums/hierarchy.enum';

interface ITagRiskProps {
    hideName?: boolean;
    type: HierarchyEnum;
    name: string;
}

export const STagHierarchy = ({ hideName, name, type }: ITagRiskProps) => {
    const constants = hierarchyConstant[type];
    return (
        <SHStack flex={1}>
            <SCenter
                borderWidth={1}
                bg={constants.value != HierarchyEnum.OFFICE ? undefined : 'gray.100'}
                mt={'1px'}
                width="50px"
                height={'20px'}
                borderRadius="4px"
                mr={2}
            >
                <SText fontFamily="heading" fontSize={10}>
                    {constants?.short || ''}
                </SText>
            </SCenter>
            {!hideName && (
                <SText flex={1} fontSize={14}>
                    {!hideName ? name || '' : ''}
                </SText>
            )}
        </SHStack>
    );
};
