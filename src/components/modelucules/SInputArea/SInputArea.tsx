import { FormControl, HStack, Textarea } from '@components/core';
import { config } from '../../../theme/gluestack-ui.config';

// type IInputContainerProps = React.ComponentProps<typeof Textarea>;
// type IInputProps = React.ComponentProps<typeof Textarea.Input>;
type IStackProps = React.ComponentProps<typeof HStack>;

type IInputContainerProps = any;
type IInputProps = any;

interface InputAreaProps extends IInputContainerProps {
    errorMessage?: string | null;
    endAdornmentText?: React.ReactNode;
    inputProps?: Partial<IInputProps>;
}

export function SInputArea({
    errorMessage = null,
    isInvalid,
    variant,
    endAdornmentText,
    inputProps,
    ...props
}: InputAreaProps) {
    const invalid = !!errorMessage || isInvalid;

    return (
        <FormControl isInvalid={invalid} mb={4}>
            <Textarea bg="$backgroundDefault" h={12} px={4} borderWidth={1} isInvalid={invalid} {...props}>
                <Textarea.Input
                    fontSize="$md"
                    color="$textMain"
                    autoCompleteType="off"
                    fontFamily="$body"
                    // placeholderTextColor={config.theme.tokens.colors.textPlaceholder}
                    {...(inputProps as any)}
                    sx={{
                        ':invalid': {
                            borderWidth: 1,
                            borderColor: '$statusError',
                        },
                        ':focus': {
                            bg: '$backgroundDefault',
                            borderWidth: 1,
                            borderColor: '$primaryMain',
                        },
                        ...(inputProps?.sx as any),
                    }}
                />
            </Textarea>

            <FormControl.Error>
                <FormControl.Error.Text>{errorMessage}</FormControl.Error.Text>
            </FormControl.Error>
        </FormControl>
    );
}
