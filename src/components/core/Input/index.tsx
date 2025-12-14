import React, { useState, forwardRef } from 'react';
import { TextInput, TextInputProps, StyleSheet, View } from 'react-native';
import { SSpinner } from '../Spinner';

export interface ISInputProps extends TextInputProps {
    variant?: 'normal' | 'filled';
    h?: number;
    isInvalid?: boolean;
    isDisabled?: boolean;
    isLoading?: boolean;
    InputLeftElement?: React.ReactNode;
    InputRightElement?: React.ReactNode;
}

export const Input = forwardRef<TextInput, ISInputProps>(
    (
        {
            variant = 'normal',
            h = 48,
            isInvalid = false,
            isDisabled = false,
            isLoading = false,
            InputLeftElement,
            InputRightElement,
            style,
            onFocus,
            onBlur,
            ...restProps
        },
        ref,
    ) => {
        const [isFocused, setIsFocused] = useState(false);

        const getBackgroundColor = () => {
            if (variant === 'filled') {
                return isFocused ? '#dddee2' : '#ebf0f0';
            }
            return '#fbfbfb';
        };

        const getBorderColor = () => {
            if (isInvalid) return '#F44336';
            if (isFocused) return '#F27329';
            if (variant === 'filled') return 'transparent';
            return '#e0e0e0';
        };

        return (
            <View
                style={[
                    styles.inputWrapper,
                    {
                        backgroundColor: getBackgroundColor(),
                        borderColor: getBorderColor(),
                        borderWidth: variant === 'filled' && !isFocused && !isInvalid ? 0 : 1,
                        height: h,
                        opacity: isDisabled ? 0.6 : 1,
                    },
                ]}
            >
                {InputLeftElement}

                <TextInput
                    ref={ref}
                    style={[styles.input, style, { color: isDisabled ? '#3d62ba' : '#121214' }]}
                    placeholderTextColor="#7C7C8A"
                    editable={!isDisabled}
                    onFocus={(e) => {
                        setIsFocused(true);
                        onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        onBlur?.(e);
                    }}
                    {...restProps}
                />

                {isLoading && (
                    <View style={styles.adornment}>
                        <SSpinner color="primary.main" size={22} />
                    </View>
                )}

                {InputRightElement}
            </View>
        );
    },
);

const styles = StyleSheet.create({
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 4,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Roboto_400Regular',
        height: '100%',
    },
    adornment: {
        paddingHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
