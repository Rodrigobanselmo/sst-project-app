import React from 'react';
import { SInput, SInputProps } from '../SInput/SInput';
import { TouchableOpacity } from 'react-native';
import { SIcon } from '@components/core';
import { MaterialIcons } from '@expo/vector-icons';

interface SInputSearchProps extends SInputProps {
    search?: string;
    onSearchChange: (search: string) => void;
    autoFocus?: boolean;
    clearButtonAction?: () => void;
}

export const SInputSearch = React.forwardRef<any, SInputSearchProps>(
    ({ search, autoFocus, clearButtonAction, onSearchChange, ...props }, ref) => {
        return (
            <SInput
                inputProps={{
                    placeholder: 'Pesquisar',
                    onChangeText: onSearchChange,
                    variant: 'normal',
                    h: 10,
                    autoFocus,
                    clearButton: true,
                    clearButtonAction,
                    autoComplete: 'off',
                    autoCorrect: false,
                    ...(search && { value: search }),
                }}
                ref={ref}
                {...props}
            />
        );
    },
);
