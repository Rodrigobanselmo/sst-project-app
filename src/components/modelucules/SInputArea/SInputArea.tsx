import { ISTextareaProps, SBox, SFormControl, SText, STextarea } from '@components/core';
import { useRef } from 'react';

interface ISInputAreaProps extends ISTextareaProps {
    errorMessage?: string | null;
    endAdornmentText?: React.ReactNode;
    startAdornmentText?: React.ReactNode;
    inputProps?: ISTextareaProps & {
        variant?: 'normal' | 'filled';
    };
}

export function SInputArea({
    errorMessage = null,
    isInvalid,
    variant,
    endAdornmentText,
    startAdornmentText,
    inputProps,
    ...props
}: ISInputAreaProps) {
    const invalid = !!errorMessage || isInvalid;
    const ref = useRef(null);

    return (
        <SFormControl isInvalid={invalid} mb={4}>
            <STextarea
                bg="background.default"
                px={4}
                autoCompleteType={'off'}
                borderWidth={1}
                ref={ref}
                isInvalid={invalid}
                {...(endAdornmentText && {
                    InputRightElement: (
                        <SText color={'text.light'} mr={3}>
                            {endAdornmentText}
                        </SText>
                    ),
                })}
                {...(startAdornmentText && {
                    InputLeftElement: (
                        <SBox onTouchEnd={() => (ref as any).current?.focus()} h="100%" mr={-2} mt={3}>
                            <SText color={'text.light'} ml={3}>
                                {startAdornmentText}
                            </SText>
                        </SBox>
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
                _focus={{
                    bg: 'background.default',
                    borderWidth: 1,
                    borderColor: 'primary.main',
                    ...(variant == 'filled' && {
                        bg: 'background.paper',
                        borderWidth: 1,
                        borderColor: 'primary.main',
                    }),
                }}
                {...(variant == 'filled' && {
                    bg: 'background.paper',
                    borderWidth: 0,
                })}
                {...props}
                {...inputProps}
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
}
