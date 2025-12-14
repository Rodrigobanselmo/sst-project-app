import React from 'react';
import { View, ViewStyle } from 'react-native';
import { SInput, SInputProps } from '../SInput/SInput';

export interface SInputSearchProps extends SInputProps {
    search?: string;
    onSearchChange: (search: string) => void;
    autoFocus?: boolean;
    isLoading?: boolean;
    clearButtonAction?: () => void;
    mb?: number | string;
    mx?: number | string;
    mt?: number | string;
}

const SPACING: Record<string, number> = {
    pagePaddingPx: 16,
    pagePadding: 16,
};

const resolveSpacing = (value?: number | string): number | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return value;
    return SPACING[value] ?? 0;
};

export const SInputSearch = React.forwardRef<any, SInputSearchProps>(
    ({ search, autoFocus, isLoading, clearButtonAction, onSearchChange, mb, mx, mt, ...props }, ref) => {
        const containerStyle: ViewStyle = {
            marginBottom: resolveSpacing(mb),
            marginHorizontal: resolveSpacing(mx),
            marginTop: resolveSpacing(mt),
        };

        return (
            <View style={containerStyle}>
                <SInput
                    inputProps={{
                        placeholder: 'Pesquisar',
                        onChangeText: onSearchChange,
                        variant: 'normal',
                        h: 40,
                        autoFocus,
                        clearButton: true,
                        clearButtonAction,
                        autoComplete: 'off',
                        autoCorrect: false,
                        ...(search && { value: search }),
                    }}
                    ref={ref}
                    isLoading={isLoading}
                    {...props}
                />
            </View>
        );
    },
);
