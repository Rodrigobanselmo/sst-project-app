import { SButton, SHomeHeader } from '@components/index';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { SVStack, useSToast } from '@components/core';
import { useState } from 'react';
import { RiskTable } from '@screens/Characterization/components/Risk/RiskTable';

export const Test = () => {
    const [isLoading, setIsLoading] = useState(true);

    const { navigate } = useNavigation<AppNavigatorRoutesProps>();
    const toast = useSToast();

    // const handleOpenExerciseDetail = (id: number) => {
    //   navigate('exercise', { id });
    // };

    return (
        <SVStack flex={1}>
            <SHomeHeader />
            <RiskTable
                riskIds={[]}
                isEdit={false}
                renderRightElement={(risk, selected) => {
                    if (selected) return <></>;
                    return (
                        <SButton
                            title={'adicionar'}
                            fontSize={13}
                            variant="outline"
                            autoWidth
                            height={6}
                            p={0}
                            px={3}
                        />
                    );
                }}
            />
        </SVStack>
    );
};
