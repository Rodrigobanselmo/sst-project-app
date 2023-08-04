import { Box, Center, Heading, Icon } from '@components/core';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps, AppRoutesProps } from '@routes/app/AppRoutesProps';

interface ScreenHeaderProps {
    title: string;
    navidateArgs?: [keyof AppRoutesProps, any];
    backButton?: boolean;
    isAlert?: boolean;
}

export function SScreenHeader({ title, navidateArgs, backButton, isAlert }: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();
    const { goBack, navigate } = useNavigation<AppNavigatorRoutesProps>();

    const paddingTop = insets.top + 12;

    const handleGoBack = () => {
        const action = () => {
            if (navidateArgs) {
                navigate(...navidateArgs), {};
            } else {
                goBack();
            }
        };

        if (isAlert) {
            Alert.alert('Atenção', 'Você perderá todos os dados preenchidos até aqui. Deseja continuar?', [
                {
                    text: 'Não',
                    style: 'cancel',
                },
                {
                    text: 'Sim',
                    onPress: action,
                },
            ]);
        } else {
            action();
        }
    };

    return (
        <Center position={'relative'} bg="$backgroundDefault" pb={3} pt={paddingTop + 'px'} shadow={1}>
            {backButton && (
                <Box position={'absolute'} left={4} top={paddingTop + 'px'}>
                    <TouchableOpacity onPress={handleGoBack}>
                        <Icon as={Feather} name="arrow-left" color="$textMain" size={6} />
                    </TouchableOpacity>
                </Box>
            )}
            <Heading color="$textMain" fontSize={21} fontFamily="$heading">
                {title}
            </Heading>
        </Center>
    );
}
