import { Button as SB, ISButtonProps, SText } from '@components/core';
import { ColorType } from 'native-base/lib/typescript/components/types';

interface ButtonProps extends ISButtonProps {}

export function SButton({
    title,
    variant = 'solid',
    bg = 'primary.main',
    bgPressed = 'primary.light',
    addColor,
    color = 'white',
    fontSize = 'sm',
    autoWidth,
    ...props
}: ButtonProps) {
    if (addColor) {
        bg = 'green.700';
        bgPressed = 'green.500';
    }

    return (
        <SB
            w={autoWidth ? undefined : 'full'}
            h={12}
            bg={bg}
            borderWidth={0}
            borderColor={bg}
            rounded="sm"
            _pressed={{
                bg: bgPressed,
            }}
            {...(variant === 'outline' && {
                bg: 'transparent',
                borderWidth: 1,
                _pressed: {
                    bg: 'gray.50',
                },
            })}
            {...(variant === 'ghost' && {
                bg: 'transparent',
                borderWidth: 0,
                borderColor: 'transparent',
                _pressed: {
                    bg: 'gray.50',
                },
            })}
            {...props}
        >
            <SText
                color={color}
                {...(variant === 'outline' && {
                    color: bg,
                })}
                {...(variant === 'ghost' && {
                    color: 'text.light',
                })}
                p={0}
                fontFamily="heading"
                fontSize={fontSize}
            >
                {title}
            </SText>
        </SB>
    );
}
