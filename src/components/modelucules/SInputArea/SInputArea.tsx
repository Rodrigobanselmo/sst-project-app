import { ISTextareaProps, SFormControl, SText, STextarea } from '@components/core';

interface ISInputAreaProps extends ISTextareaProps {
    errorMessage?: string | null;
    endAdornmentText?: React.ReactNode;
    inputProps?: ISTextareaProps & {
        variant?: 'normal' | 'filled';
    };
}

export function SInputArea({
    errorMessage = null,
    isInvalid,
    variant,
    endAdornmentText,
    inputProps,
    ...props
}: ISInputAreaProps) {
    const invalid = !!errorMessage || isInvalid;

    return (
        <SFormControl isInvalid={invalid} mb={4}>
            <STextarea
                bg="background.default"
                h={12}
                px={4}
                autoCompleteType={'off'}
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
