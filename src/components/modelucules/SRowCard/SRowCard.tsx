import { SHStack } from '@components/core';
import { TouchableOpacity } from 'react-native';

type Props = {
    onPress: () => void;
    disabled?: boolean;
    children?: any;
};

export function SRowCard({ onPress, children, disabled }: Props): React.ReactElement {
    return (
        <TouchableOpacity disabled={disabled} onPress={onPress}>
            <SHStack
                mb={2}
                borderWidth={1}
                borderColor={'gray.200'}
                borderRadius={10}
                bg={'background.paper'}
                opacity={disabled ? 0.5 : 1}
                flex={1}
                px={2}
                py={2}
            >
                {children}
            </SHStack>
        </TouchableOpacity>
    );
}
