import { ISBoxProps, SFormControl, SText, Radio, SBox, ISRadioGroupProps } from '@components/core';
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
            <Radio.Group {...props}>
                <SBox {...boxProps}>
                    {options.map((option) => (
                        <Radio
                            size={sizeRadio}
                            key={option.value}
                            value={option.value}
                            my={2}
                            isInvalid={invalid}
                            isDisabled={false}
                            {...(option as any)?.radioProps}
                        >
                            <SText mx={2} {...(isInvalid && { color: 'red.500' })}>
                                {option.label}
                            </SText>
                        </Radio>
                    ))}
                </SBox>
            </Radio.Group>

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
