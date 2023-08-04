import { Text } from '@components/core';

type ITextProps = React.ComponentProps<typeof Text>;
// type ITextProps = IThemeNew<ConfigType, any>;
// type ITextPropws = ITextProps['s']

interface LabelProps extends ITextProps {}

export function SLabel({ children, ...props }: LabelProps) {
    return (
        <Text mb={3} color={'$textLabel'} fontSize="$lg" {...props}>
            {children}
        </Text>
    );
}
