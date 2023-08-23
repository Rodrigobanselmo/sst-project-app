import { SCenter, SText } from '@components/core';
import { useNetInfo } from '@react-native-community/netinfo';

type Props = {
    showError?: boolean;
    children?: any;
    showChildren?: boolean;
};

export function SErrorBox({ showError, children, showChildren }: Props): React.ReactElement {
    if (!showError || showChildren) return <>{children}</>;

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
            <SText color={'red.700'}>Erro, tente novamente mais tarde.</SText>
        </SCenter>
    );
}

export function SShowInternet({ children, showError }: Props): React.ReactElement {
    if (showError) return <>{children}</>;

    return <></>;
}
