import { ISBoxProps, SFormControl, SText, Radio as SR, SBox, ISRadioGroupProps } from '@components/core';
import { ISRadioProps } from '@components/core';

interface SRadioProps extends ISRadioGroupProps {
    errorMessage?: string | null;
    isInvalid?: boolean;
    options: { radioProps?: Partial<ISRadioProps>; label: string; value: string }[];
    boxProps?: Partial<ISBoxProps>;
    sizeRadio?: ISRadioProps['size'];
}

export function SRadio({ errorMessage = null, isInvalid, options, boxProps, sizeRadio, ...props }: SRadioProps) {
    const invalid = !!errorMessage || isInvalid;

    return (
        <SFormControl isInvalid={invalid} mb={4}>
            <SR.Group {...props}>
                <SBox {...boxProps}>
                    {options.map((option) => (
                        <SRadio
                            size={sizeRadio}
                            key={option.value}
                            value={option.value}
                            my={2}
                            isInvalid={false}
                            isDisabled={false}
                            {...(option as any)?.radioProps}
                        >
                            <SText mx={2}>{option.label}</SText>
                        </SRadio>
                    ))}
                </SBox>
            </SR.Group>

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
