import { SBox, SCenter, SHeading, SIcon } from '@components/core';
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
    onDelete?: () => void;
}

export function SScreenHeader({ title, navidateArgs, backButton, isAlert, onDelete }: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();
    const { goBack, navigate } = useNavigation<AppNavigatorRoutesProps>();

    const paddingTop = insets.top + 12;
    const paddingRightTop = insets.top + 14;

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
    const handleDelete = () => {
        const action = () => {
            onDelete?.();
        };

        Alert.alert('Atenção', 'Você tem certeza que deseja apagar permnentemente. Deseja continuar?', [
            {
                text: 'Não',
                style: 'cancel',
            },
            {
                text: 'Sim, apagar',
                onPress: action,
            },
        ]);
    };

    return (
        <SCenter position={'relative'} bg="background.default" pb={3} pt={paddingTop + 'px'} shadow={1}>
            {backButton && (
                <SBox position={'absolute'} left={4} top={paddingTop + 'px'}>
                    <TouchableOpacity onPress={handleGoBack}>
                        <SIcon as={Feather} name="arrow-left" color="text.main" size={6} />
                    </TouchableOpacity>
                </SBox>
            )}
            <SHeading color="text.main" fontSize={21} fontFamily="heading">
                {title}
            </SHeading>
            {onDelete && (
                <SBox position={'absolute'} right={4} top={paddingRightTop + 'px'}>
                    <TouchableOpacity onPress={handleDelete}>
                        <SIcon as={Feather} name="trash" color="red.500" size={5} />
                    </TouchableOpacity>
                </SBox>
            )}
        </SCenter>
    );
}
