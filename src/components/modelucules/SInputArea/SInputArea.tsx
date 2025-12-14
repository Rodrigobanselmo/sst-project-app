import { ISTextareaProps, STextarea } from '@components/core';
import React, { useRef } from 'react';
import { TextInput, TouchableOpacity, View, Text, StyleSheet } from 'react-native';

export interface SInputAreaProps {
    errorMessage?: string | null;
    endAdornmentText?: React.ReactNode;
    startAdornmentText?: React.ReactNode;
    isDisabled?: boolean;
    isInvalid?: boolean;
    h?: number;
    inputProps?: ISTextareaProps;
}

export const SInputArea = React.forwardRef<TextInput, SInputAreaProps>(
    ({ isDisabled, startAdornmentText, errorMessage = null, isInvalid, endAdornmentText, h, inputProps }, refPass) => {
        const refValue = useRef<TextInput>(null);
        const invalid = !!errorMessage || isInvalid;

        const ref = (refPass || refValue) as React.RefObject<TextInput>;

        return (
            <View style={styles.container}>
                <STextarea
                    ref={ref}
                    isInvalid={invalid}
                    isDisabled={isDisabled}
                    h={h}
                    InputLeftElement={
                        startAdornmentText ? (
                            <TouchableOpacity onPress={() => ref.current?.focus()} style={styles.adornmentLeft}>
                                <Text style={styles.adornmentText}>{startAdornmentText}</Text>
                            </TouchableOpacity>
                        ) : undefined
                    }
                    InputRightElement={
                        endAdornmentText ? (
                            <View style={styles.adornmentRight}>
                                <Text style={styles.adornmentText}>{endAdornmentText}</Text>
                            </View>
                        ) : undefined
                    }
                    {...inputProps}
                />
                {invalid && errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            </View>
        );
    },
);

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    adornmentLeft: {
        paddingRight: 8,
        paddingTop: 2,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    adornmentRight: {
        paddingLeft: 8,
        paddingTop: 2,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    adornmentText: {
        color: '#7C7C8A',
        fontSize: 16,
    },
    errorText: {
        color: '#F44336',
        fontSize: 12,
        marginTop: 4,
    },
});
