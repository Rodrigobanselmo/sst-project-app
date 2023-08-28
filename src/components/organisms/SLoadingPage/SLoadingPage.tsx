import { SCenter, SSpinner } from '@components/core';

interface IProps {
    isLoading: boolean;
}

export function SLoadingPage({ isLoading }: IProps) {
    if (!isLoading) return null;

    return (
        <SCenter
            position={'absolute'}
            top={0}
            left={0}
            flex={1}
            width={'100%'}
            height={'100%'}
            bg={'#00000088'}
            zIndex={10}
        >
            <SSpinner color={'primary.main'} size={80} />
        </SCenter>
    );
}
