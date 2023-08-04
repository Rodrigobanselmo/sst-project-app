import { FormControl, Radio, Box, CircleIcon } from '@components/core';
import React from 'react';

type IBoxProps = React.ComponentProps<typeof Box>;
type IRadioGroupProps = React.ComponentProps<typeof Radio.Group>;
type IRadioProps = React.ComponentProps<typeof Radio>;

interface SRadioProps extends IRadioGroupProps {
    errorMessage?: string | null;
    boxProps?: IBoxProps;
    isInvalid?: boolean;
    options: { radioProps?: Partial<IRadioProps>; label: string; value: string }[];
    sizeRadio?: IRadioProps['size'];
}
export const SRadio = React.forwardRef<any, SRadioProps>(
    ({ errorMessage = null, isInvalid, options, boxProps, sizeRadio, ...props }, ref) => {
        const invalid = !!errorMessage || isInvalid;

        return (
            <FormControl isInvalid={invalid} mb={4}>
                <Radio.Group {...props}>
                    <Box {...boxProps}>
                        {options.map((option) => (
                            <Radio
                                size={sizeRadio}
                                key={option.value}
                                value={option.value}
                                my={2}
                                isInvalid={false}
                                isDisabled={false}
                                {...option.radioProps}
                            >
                                <Radio.Indicator mr="$2">
                                    <Radio.Icon as={CircleIcon} strokeWidth={1} />
                                </Radio.Indicator>
                                <Radio.Label>{option.label}</Radio.Label>
                            </Radio>
                        ))}
                    </Box>
                </Radio.Group>

                <FormControl.Error>
                    <FormControl.Error.Text>{errorMessage}</FormControl.Error.Text>
                </FormControl.Error>
            </FormControl>
        );
    },
);
