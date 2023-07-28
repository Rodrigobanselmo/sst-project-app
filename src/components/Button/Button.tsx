import { Button as ButtonNativeBase, IButtonProps, Text } from 'native-base';
import { ColorType } from 'native-base/lib/typescript/components/types';

interface ButtonProps extends IButtonProps {
    title: string;
    variant?: 'solid' | 'outline';
    bg?: ColorType;
    bgPressed?: ColorType;
    addColor?: boolean;
}

export function Button({
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
        <ButtonNativeBase
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
            <Text color={variant === 'outline' ? bg : 'white'} fontFamily="heading" fontSize="sm">
                {title}
            </Text>
        </ButtonNativeBase>
    );
}
