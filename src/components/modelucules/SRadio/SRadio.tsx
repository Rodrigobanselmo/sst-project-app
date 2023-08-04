import { FormControl, Radio, Box, CircleIcon, HStack } from '@components/core';
import { IRadioGroupProps, IRadioProps } from '@gluestack-ui/radio/lib/typescript/types';
import React from 'react';

type IStackProps = React.ComponentProps<typeof HStack>;
// type ISRadioGroupProps = React.ComponentProps<typeof Radio.Group>;
// type ISRadioProps = React.ComponentProps<typeof Radio>;
// type ISBoxProps = React.ComponentProps<typeof Box>;

type ISBoxProps = IStackProps;
type ISRadioGroupProps = IRadioGroupProps & ISBoxProps;
type ISRadioProps = IRadioProps & ISBoxProps;

interface SRadioProps extends ISRadioGroupProps {
    errorMessage?: string | null;
    name?: string;
    isInvalid?: boolean;
    options: { radioProps?: Partial<ISRadioProps>; label: string; value: string }[];
    boxProps?: Partial<ISBoxProps>;
    // sizeRadio?: ISRadioProps['size'];
    sizeRadio?: any;
}

// type x =SRadioProps['']

export const SRadio = React.forwardRef<any, SRadioProps>(
    ({ errorMessage = null, isInvalid, options, boxProps, sizeRadio, ...props }, ref) => {
        const invalid = !!errorMessage || isInvalid;

        return (
            <FormControl isInvalid={invalid} mb={4}>
                <Radio.Group {...(props as any)}>
                    <Box {...(boxProps as any)}>
                        {options.map((option) => (
                            <Radio
                                size={sizeRadio}
                                key={option.value}
                                value={option.value}
                                my={2}
                                isInvalid={false}
                                isDisabled={false}
                                {...(option as any)?.radioProps}
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
