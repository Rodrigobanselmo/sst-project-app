import { ISButtonProps, SBox, SFlatList, SHStack } from '@components/core';
import { SInput, SInputProps } from '../SInput/SInput';
import { SButton } from '../SButton';
import { pagePaddingPx } from '@constants/constants';
import { useMemo } from 'react';
import { ScrollView } from 'native-base';

interface SHorizontalMenuProps<T> {
    options: T[];
    getLabel: (value: T) => string;
    onChange: (value: T) => void;
    getKeyExtractor: (value: T) => any;
    getIsActive?: (value: T) => boolean;
    // selectedInFirst?: boolean;
    onAddButtonChange?: () => void;
    mb?: number;
    activeColor?: string;
    paddingHorizontal?: number | string;
    fontSizeButton?: number;
    buttonAddProps?: Partial<ISButtonProps>;
}

export function SHorizontalMenuScroll<T>({
    onChange,
    options,
    getLabel,
    getKeyExtractor,
    onAddButtonChange,
    getIsActive,
    paddingHorizontal,
    activeColor = 'primary.main',
    fontSizeButton = 12,
    mb, // selectedInFirst,
    buttonAddProps,
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
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: paddingHorizontal ?? pagePaddingPx }}
                showsHorizontalScrollIndicator={false}
                horizontal
            >
                <SHStack>
                    {options.map((item) => {
                        const isActive = getIsActive?.(item);

                        return (
                            <SButton
                                key={getKeyExtractor(item)}
                                fontSize={fontSizeButton}
                                bg="gray.300"
                                autoWidth
                                variant={'outline'}
                                title={getLabel(item)}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onChange(item);
                                }}
                                height={7}
                                py={0}
                                mr={3}
                                {...(isActive && {
                                    bg: activeColor,
                                    variant: 'solid',
                                    _pressed: {
                                        bg: activeColor,
                                        opacity: 0.6,
                                    },
                                })}
                            />
                        );
                    })}

                    {onAddButtonChange && (
                        <SButton
                            title="adicionar"
                            bg="green.500"
                            autoWidth
                            variant={'outline'}
                            height={7}
                            py={0}
                            onPress={onAddButtonChange}
                            {...buttonAddProps}
                        />
                    )}
                </SHStack>
            </ScrollView>
        </SBox>
    );
}
