import { ISInputProps, Input as SI, SIcon, SText } from '@components/core';
import React, { useRef } from 'react';
import { TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export interface SInputProps {
    errorMessage?: string | null;
    endAdornmentText?: React.ReactNode;
    startAdornmentText?: React.ReactNode;
    isLoading?: boolean;
    isDisabled?: boolean;
    isInvalid?: boolean;
    inputProps?: ISInputProps & {
        clearButton?: boolean;
        clearButtonAction?: () => void;
    };
}

export const SInput = React.forwardRef<TextInput, SInputProps>(
    (
        { isLoading, isDisabled, startAdornmentText, errorMessage = null, isInvalid, endAdornmentText, inputProps },
        refPass,
    ) => {
        const refValue = useRef<TextInput>(null);
        const invalid = !!errorMessage || isInvalid;

        const ref = (refPass || refValue) as React.RefObject<TextInput>;

        const { clearButton, clearButtonAction, ...restInputProps } = inputProps || {};

        return (
            <View style={styles.container}>
                <SI
                    ref={ref}
                    isInvalid={invalid}
                    isDisabled={isDisabled}
                    isLoading={isLoading}
                    InputLeftElement={
                        startAdornmentText ? (
                            <TouchableOpacity onPress={() => ref.current?.focus()} style={styles.adornment}>
                                <SText color="text.light">{startAdornmentText}</SText>
                            </TouchableOpacity>
                        ) : undefined
                    }
                    InputRightElement={
                        <>
                            {clearButton && (
                                <TouchableOpacity
                                    style={styles.adornment}
                                    onPress={() => {
                                        ref.current?.clear();
                                        clearButtonAction?.();
                                    }}
                                >
                                    <SIcon as={MaterialIcons} name="close" color="text.light" size={5} />
                                </TouchableOpacity>
                            )}
                            {endAdornmentText && !clearButton && (
                                <View style={styles.adornment}>
                                    <SText color="text.light">{endAdornmentText}</SText>
                                </View>
                            )}
                        </>
                    }
                    {...restInputProps}
                />

                {errorMessage && (
                    <SText color="status.error" fontSize="xs" mt={1}>
                        {errorMessage}
                    </SText>
                )}
            </View>
        );
    },
);

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 16,
    },
    adornment: {
        paddingHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
