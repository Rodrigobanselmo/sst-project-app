import { SBox, SCenter, SHStack, SIcon, SSpinner } from '@components/core';
import { TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
    onPress: () => void;
    disabled?: boolean;
    children?: any;
    loading?: boolean;
    selected?: boolean;
};

export function SRowCard({ onPress, children, disabled, selected, loading }: Props): React.ReactElement {
    return (
        <TouchableOpacity disabled={disabled || loading} style={{ opacity: loading ? 0.7 : 1 }} onPress={onPress}>
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
                {!loading && selected && (
                    <SBox>
                        <SIcon as={MaterialIcons} name="check" size={'md'} color="text.light" />
                    </SBox>
                )}
                {loading && (
                    <SCenter>
                        <SSpinner size="sm" color="primary.main" />
                    </SCenter>
                )}
            </SHStack>
        </TouchableOpacity>
    );
}
