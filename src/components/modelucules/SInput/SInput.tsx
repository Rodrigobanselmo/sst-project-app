import { ISInputProps, SFormControl, Input as SI, SText } from '@components/core';

interface SInputProps extends ISInputProps {
    errorMessage?: string | null;
    endAdornmentText?: React.ReactNode;
    inputProps?: ISInputProps & {
        variant?: 'normal' | 'filled';
    };
}

export function SInput({ errorMessage = null, isInvalid, endAdornmentText, inputProps, ...props }: SInputProps) {
    const invalid = !!errorMessage || isInvalid;

    return (
        <SFormControl isInvalid={invalid} mb={4}>
            <SI
                bg="background.default"
                h={12}
                px={4}
                borderWidth={1}
                isInvalid={invalid}
                {...(endAdornmentText && {
                    InputRightElement: (
                        <SText color={'text.light'} mr={3}>
                            {endAdornmentText}
                        </SText>
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
