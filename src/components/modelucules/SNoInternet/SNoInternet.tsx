import { SCenter, SText } from '@components/core';
import { useNetInfo } from '@react-native-community/netinfo';

type Props = {
    children?: any;
    showChildren?: boolean;
    skipNetInfo?: boolean;
};

export function SNoInternet({ children, skipNetInfo, showChildren }: Props): React.ReactElement {
    const netInfo = useNetInfo();

    if (skipNetInfo) return <>{children}</>;
    if (netInfo.isConnected && !showChildren) return <>{children}</>;

    return (
        <SCenter
            bg={'red.50'}
            flex={1}
            px={2}
            py={2}
            maxHeight={20}
            borderRadius={5}
            borderWidth={1}
            borderColor={'red.600'}
        >
            <SText color={'red.700'}>Você está sem conexão com a internet. </SText>
        </SCenter>
    );
}

export function SShowInternet({ children }: Props): React.ReactElement {
    const netInfo = useNetInfo();

    if (netInfo.isConnected) return <>{children}</>;

    return <></>;
}
