import { SSpinner } from '@components/core';
import { useImperativeHandle, useState } from 'react';

export type ILoadingRef = {
    setIsLoading: (value: boolean) => void;
    isLoading: boolean;
};

type Props = {
    children?: any;
    loadingRef?: React.RefObject<ILoadingRef>;
    initialLoading?: boolean;
    controledIsLoading?: boolean;
};

export function SLoadContainer({
    children,
    initialLoading,
    controledIsLoading,
    loadingRef,
}: Props): React.ReactElement {
    const [isLoading, setIsLoading] = useState(initialLoading || false);

    const loading = controledIsLoading != undefined ? controledIsLoading : isLoading;

    useImperativeHandle(loadingRef, () => ({
        setIsLoading,
        isLoading,
    }));

    if (!loading) return <>{children}</>;

    return <SSpinner color={'primary.main'} size={32} />;
}
