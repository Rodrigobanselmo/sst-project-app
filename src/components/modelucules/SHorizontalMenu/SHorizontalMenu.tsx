import { SBox, SFlatList } from '@components/core';
import { SInput, SInputProps } from '../SInput/SInput';
import { SButton } from '../SButton';
import { pagePaddingPx } from '@constants/constants';
import { useMemo } from 'react';

interface SHorizontalMenuProps<T> {
    options: T[];
    getLabel: (value: T) => string;
    onChange: (value: T) => void;
    getKeyExtractor: (value: T) => any;
    getIsActive?: (value: T) => boolean;
    // selectedInFirst?: boolean;
    mb?: number;
}

export function SHorizontalMenu<T>({
    onChange,
    options,
    getLabel,
    getKeyExtractor,
    getIsActive,
    mb, // selectedInFirst,
}: SHorizontalMenuProps<T>) {
    // const result = useMemo(() => {
    //     if (!selectedInFirst) return options;

    //     const selected = options.find((e) => getIsActive?.(e));

    //     if (!selected) return options;

    //     const filtered = options.filter((e) => e !== selected);

    //     return [selected, ...filtered];
    // }, [getIsActive, options, selectedInFirst]);

    return (
        <SBox mb={mb}>
            <SFlatList
                horizontal
                data={options}
                keyExtractor={getKeyExtractor}
                renderItem={({ item }) => {
                    const isActive = getIsActive?.(item);
                    return (
                        <SButton
                            fontSize={12}
                            bg="gray.300"
                            w={undefined}
                            variant={'outline'}
                            title={getLabel(item)}
                            onPress={() => onChange(item)}
                            height={7}
                            py={0}
                            {...(isActive && {
                                bg: 'primary.main',
                                variant: 'solid',
                            })}
                        />
                    );
                }}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <SBox style={{ width: 10, height: 1 }} />}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: pagePaddingPx }}
            />
        </SBox>
    );
}
