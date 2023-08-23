import { ISCenterProps, SCenter, SText } from '@components/core';
import { useNetInfo } from '@react-native-community/netinfo';

type Props = {
    children?: any;
    text?: string;
} & ISCenterProps;

export function SNoContent({ text = 'Nenhum dado encontrado', ...props }: Props): React.ReactElement {
    return (
        <SCenter
            bg={'background.paper'}
            flex={1}
            px={2}
            py={2}
            maxHeight={20}
            borderRadius={5}
            borderWidth={1}
            borderColor={'gray.600'}
            {...props}
        >
            <SText color={'gray.700'}>{text}</SText>
        </SCenter>
    );
}
