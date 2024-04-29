import { SBox, SFlatList, SHStack } from '@components/core';
import { SInput, SInputProps } from '../SInput/SInput';
import { SButton } from '../SButton';
import { pagePaddingPx } from '@constants/constants';
import { useMemo } from 'react';

interface SVerticalMenuProps<T> {
    options: T[];
    getLabel: (value: T) => string;
    onChange: (value: T) => void;
    getKeyExtractor: (value: T) => any;
    getIsActive?: (value: T) => boolean;
    mb?: number;
    activeColor?: string;
    paddingHorizontal?: number | string;
    fontSizeButton?: number;
}

export function SVerticalMenu<T>({
    onChange,
    options,
    getLabel,
    getKeyExtractor,
    getIsActive,
    paddingHorizontal,
    activeColor = 'info.main',
    fontSizeButton = 12,
    mb,
}: SVerticalMenuProps<T>) {
    return (
        <SBox mb={mb}>
            <SFlatList
                data={options}
                keyboardShouldPersistTaps={'handled'}
                keyExtractor={getKeyExtractor}
                renderItem={({ item }) => {
                    const isActive = getIsActive?.(item);
                    return (
                        <SButton
                            fontSize={fontSizeButton}
                            bgPressed={activeColor}
                            bg="gray.300"
                            variant={'outline'}
                            title={getLabel(item)}
                            onPress={(e) => {
                                e.stopPropagation();
                                onChange(item);
                            }}
                            height={7}
                            py={0}
                            {...(isActive && {
                                bg: activeColor,
                                variant: 'solid',
                            })}
                        />
                    );
                }}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <SBox style={{ width: 0, height: 10 }} />}
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={{
                    paddingHorizontal: (paddingHorizontal as any) ?? pagePaddingPx,
                }}
            />
        </SBox>
    );
}
