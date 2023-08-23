import { SCenter, SSpinner } from '@components/core';

export function SLoading() {
    return (
        <SCenter flex={1} bg="transparent">
            <SSpinner color={'primary.main'} size={32} />
        </SCenter>
    );
}
