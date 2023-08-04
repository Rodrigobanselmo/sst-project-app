import { Input, Text, FormControl } from '@components/core';

type IInputContainerProps = React.ComponentProps<typeof Input>;
type IInputProps = React.ComponentProps<typeof Input.Input>;

interface SInputProps extends IInputContainerProps {
    errorMessage?: string | null;
    inputProps?: Partial<IInputProps> & {
        variant?: 'normal' | 'filled';
    };
    endAdornmentText?: React.ReactNode;
}

export function SInput({
    errorMessage = null,
    isInvalid,
    variant,
    endAdornmentText,
    inputProps,
    ...props
}: SInputProps) {
    const invalid = !!errorMessage || isInvalid;

    return (
        <FormControl isInvalid={invalid} mb={4}>
            <Input
                bg="$backgroundDefault"
                h={12}
                px={4}
                borderWidth={1}
                isInvalid={invalid}
                // {...(endAdornmentText && {
                //     InputRightElement: (
                //         <Text color={'text.light'} mr={3}>
                //             {endAdornmentText}
                //         </Text>
                //     ),
                // })}
                {...props}
            >
                <Input.Input
                    fontSize="$md"
                    color="$textMain"
                    fontFamily="body"
                    placeholderTextColor="textPlaceholder"
                    {...(inputProps as any)}
                    sx={{
                        ':invalid': {
                            borderWidth: 1,
                            borderColor: 'status.error',
                        },
                        ':focus': {
                            bg: 'backgroundDefault',
                            borderWidth: 1,
                            borderColor: 'primaryMain',
                        },
                        ...(inputProps?.sx as any),
                        // _focus={{
                        //     bg: 'background.default',
                        //     borderWidth: 1,
                        //     borderColor: 'primary.main',
                        // ...(variant == 'filled' && {
                        //     bg: 'background.paper',
                        //     borderWidth: 0,
                        // }),
                        // }}
                        // // {...(variant == 'filled' && {
                        // //     bg: 'background.paper',
                        // //     borderWidth: 0,
                        // // })}
                    }}
                />
                {/* <Input.Icon */}
            </Input>

            <FormControl.Error>
                <FormControl.Error.Text>{errorMessage}</FormControl.Error.Text>
            </FormControl.Error>
        </FormControl>
    );
}
