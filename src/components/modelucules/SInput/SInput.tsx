import { ISInputProps, SBox, SCenter, SFormControl, Input as SI, SIcon, SSpinner, SText } from '@components/core';
import React from 'react';
import { useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export interface SInputProps extends ISInputProps {
    errorMessage?: string | null;
    endAdornmentText?: React.ReactNode;
    startAdornmentText?: React.ReactNode;
    isLoading?: boolean;
    inputProps?: ISInputProps & {
        variant?: 'normal' | 'filled';
        clearButton?: boolean;
        clearButtonAction?: () => void;
    };
}

export const SInput = React.forwardRef<any, SInputProps>(
    (
        {
            isLoading,
            isDisabled,
            startAdornmentText,
            errorMessage = null,
            isInvalid,
            endAdornmentText,
            inputProps,
            ...props
        },
        refPass,
    ) => {
        const refValue = useRef(null);
        const invalid = !!errorMessage || isInvalid;

        const ref = refPass || refValue;

        return (
            <SFormControl isDisabled={isDisabled} isReadOnly={isDisabled} isInvalid={invalid} mb={4}>
                <SI
                    bg="background.default"
                    h={12}
                    px={4}
                    borderWidth={1}
                    isInvalid={invalid}
                    ref={ref}
                    {...(inputProps?.clearButton &&
                        (ref as any)?.current && {
                            InputRightElement: (
                                <>
                                    {isLoading && <SSpinner color={'primary.main'} size={22} />}
                                    <TouchableOpacity
                                        style={{ paddingHorizontal: 10 }}
                                        onPress={() => {
                                            (ref as any)?.current?.clear();
                                            inputProps?.clearButtonAction?.();
                                        }}
                                    >
                                        <SIcon as={MaterialIcons} name="close" color="text.light" size={5} />
                                    </TouchableOpacity>
                                </>
                            ),
                        })}
                    {...(endAdornmentText && {
                        InputRightElement: (
                            <>
                                {isLoading && <SSpinner color={'primary.main'} size={22} />}
                                <SText color={'text.light'} mr={3}>
                                    {endAdornmentText}
                                </SText>
                            </>
                        ),
                    })}
                    {...(startAdornmentText && {
                        InputLeftElement: (
                            <SCenter onTouchEnd={() => (ref as any).current?.focus()} h="100%" mr={-1}>
                                <SText color={'text.light'} ml={3} mr={-1}>
                                    {startAdornmentText}
                                </SText>
                            </SCenter>
                        ),
                    })}
                    fontSize="md"
                    color="text.main"
                    placeholderTextColor="text.placeholder"
                    fontFamily="body"
                    _invalid={{
                        borderWidth: 1,
                        borderColor: 'status.error',
                    }}
                    _disabled={{
                        opacity: 1,
                        color: 'text.disabled',
                    }}
                    _focus={{
                        bg: 'background.default',
                        borderWidth: 1,
                        borderColor: 'primary.main',
                        ...(inputProps?.variant == 'filled' && {
                            bg: 'input.paper',
                            borderWidth: 1,
                            borderColor: 'primary.main',
                        }),
                    }}
                    {...(inputProps?.variant == 'filled' && {
                        bg: 'input.paper',
                        borderWidth: 0,
                    })}
                    {...props}
                    {...inputProps}
                    clearButtonMode="always"
                />

                <SFormControl.ErrorMessage
                    _text={{
                        color: 'status.error',
                    }}
                >
                    {errorMessage}
                </SFormControl.ErrorMessage>
            </SFormControl>
        );
    },
);
