import { SFlatList } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import { SNoContent } from '@components/modelucules';
import { pagePaddingPx } from '@constants/constants';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { checkArrayEqual } from '@utils/helpers/checkArrayEqual';
import { HierarchyListParents } from '@utils/helpers/hierarchyListParents';
import { memo } from 'react';
import { HierarchyCard } from './HierarchyCard';

type Props = {
    hierarchies?: HierarchyListParents[];
    selectedIds?: string[];
    user?: UserAuthModel;
    onClick?: (risk: HierarchyListParents) => Promise<void>;
    renderRightElement?: (risk: HierarchyListParents, selected: boolean) => React.ReactElement;
};

export const HierarchyList = memo(
    ({ hierarchies, onClick, selectedIds, renderRightElement }: Props) => {
        return (
            <>
                {!!hierarchies?.length && (
                    <SFlatList
                        data={hierarchies || []}
                        keyExtractor={(item) => item.id}
                        keyboardShouldPersistTaps={'handled'}
                        renderItem={({ item }) => (
                            <HierarchyCard
                                renderRightElement={renderRightElement}
                                onClick={onClick}
                                hierarchy={item}
                                selected={selectedIds?.includes(item.id)}
                            />
                        )}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: pagePaddingPx }}
                    />
                )}
                {!hierarchies?.length && <SNoContent mx="pagePaddingPx" />}
            </>
        );
    },
    (prevProps, nextProps) => {
        if (prevProps.hierarchies?.length == undefined) return false;
        if (
            !checkArrayEqual({
                arr1: prevProps.hierarchies || [],
                arr2: nextProps.hierarchies || [],
                getProperty: (r) => r.id,
            })
        )
            return false;
        if (
            !checkArrayEqual({
                arr1: prevProps.selectedIds || [],
                arr2: nextProps.selectedIds || [],
                getProperty: (id) => id,
            })
        )
            return false;

        return true;
    },
);
