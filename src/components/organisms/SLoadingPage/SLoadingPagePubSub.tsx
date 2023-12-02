import { SCenter, SSpinner } from '@components/core';
import { PubSubEventsEnum, pubSub } from '@utils/helpers/pubSub';
import { useEffect, useState } from 'react';
import { SLoadingPage } from './SLoadingPage';

interface IProps {
    initialLoading?: boolean;
}

export function SLoadingPagePubSub({ initialLoading = false }: IProps) {
    const [isLoading, setIsLoading] = useState(initialLoading);

    useEffect(() => {
        const unsubscribe = pubSub.subscribe(PubSubEventsEnum.LOADING_PAGE, (data) => {
            setIsLoading(data);
        });

        return () => unsubscribe();
    }, []);

    if (!isLoading) return null;

    return <SLoadingPage isLoading={isLoading} />;
}
