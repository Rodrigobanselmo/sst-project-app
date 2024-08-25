import React from 'react';
import { SInput, SInputProps } from '../SInput/SInput';

export interface SInputSearchProps extends SInputProps {
    search?: string;
    onSearchChange: (search: string) => void;
    autoFocus?: boolean;
    isLoading?: boolean;
    clearButtonAction?: () => void;
}

export const SInputSearch = React.forwardRef<any, SInputSearchProps>(
    ({ search, autoFocus, isLoading, clearButtonAction, onSearchChange, ...props }, ref) => {
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
                isLoading={isLoading}
                {...props}
            />
        );
    },
);
