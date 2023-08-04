import { Text } from '@components/core';

type ITextProps = React.ComponentProps<typeof Text>;
interface LabelProps extends ITextProps {}

export function SLabel({ children, ...props }: LabelProps) {
    return (
        <Text mb={3} color={'text.label'} fontSize="$lg" {...props}>
            {children}
        </Text>
    );
}
