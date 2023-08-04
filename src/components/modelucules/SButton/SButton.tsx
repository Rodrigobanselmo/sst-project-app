import { Button, Spinner, Text } from '@components/core';

type IButtonProps = React.ComponentProps<typeof Button>;
interface ButtonProps extends IButtonProps {
    title: string;
    variant?: 'solid' | 'outline';
    bgPressed?: IButtonProps['bg'];
    addColor?: boolean;
    isLoading?: boolean;
}

export function SButton({
    title,
    variant = 'solid',
    bg = '$primaryMain',
    bgPressed = '$primaryLight',
    addColor,
    isLoading,
    ...props
}: ButtonProps) {
    if (addColor) {
        bg = 'green700';
        bgPressed = 'green500';
    }

    return (
        <Button
            w="full"
            bg={variant === 'outline' ? 'transparent' : bg}
            borderWidth={variant === 'outline' ? 1 : 0}
            borderColor={bg}
            rounded="$sm"
            sx={{
                ':pressed': {
                    bg: variant === 'outline' ? '$gray50' : bgPressed,
                },
            }}
            isDisabled={isLoading}
            {...props}
        >
            {isLoading && <Spinner color={'$white' as any} mr="$1" />}
            <Text color={variant === 'outline' ? bg : '$white'} fontFamily="$heading" fontSize={'$md'}>
                {title}
            </Text>
        </Button>
    );
}
