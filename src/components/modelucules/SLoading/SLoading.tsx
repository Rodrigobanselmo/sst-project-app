import { Center, Spinner } from '@components/core';

export function SLoading() {
    return (
        <Center flex={1} bg="$backgroundDefault">
            <Spinner color={'$primaryMain' as any} size={32} />
        </Center>
    );
}
