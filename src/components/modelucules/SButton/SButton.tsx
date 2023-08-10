import { Button as SB, ISButtonProps, SText } from '@components/core';
import { ColorType } from 'native-base/lib/typescript/components/types';

interface ButtonProps extends ISButtonProps {
    title: string;
    variant?: 'solid' | 'outline';
    bg?: ColorType;
    bgPressed?: ColorType;
    addColor?: boolean;
}

export function SButton({
    title,
    variant = 'solid',
    bg = 'primary.main',
    bgPressed = 'primary.light',
    addColor,
    ...props
}: ButtonProps) {
    if (addColor) {
        bg = 'green.700';
        bgPressed = 'green.500';
    }
    return (
        <SB
            w="full"
            h={12}
            bg={variant === 'outline' ? 'transparent' : bg}
            borderWidth={variant === 'outline' ? 1 : 0}
            borderColor={bg}
            rounded="sm"
            _pressed={{
                bg: variant === 'outline' ? 'gray.50' : bgPressed,
            }}
            {...props}
        >
            <SText color={variant === 'outline' ? bg : 'white'} fontFamily="heading" fontSize="sm">
                {title}
            </SText>
        </SB>
    );
}
