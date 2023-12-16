import { SBox, SCenter, SHeading, SIcon, SText } from '@components/core';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps, AppRoutesProps } from '@routes/app/AppRoutesProps';

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    subtitleComponent?: any;
    backButton?: boolean;
    isAlert?: boolean;
    mb?: any;
    pt?: any;
    onDelete?: () => void;
    navidateFn: () => void;
}

export function SHeader({
    title,
    navidateFn,
    backButton,
    isAlert,
    onDelete,
    mb,
    pt,
    subtitle,
    subtitleComponent,
}: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();

    const paddingTop = insets.top + 12;
    const paddingRightTop = insets.top + 14;

    const handleGoBack = () => {
        const action = () => {
            navidateFn();
        };

        if (isAlert) {
            Alert.alert('Atenção', 'Você perderá todos os dados preenchidos até aqui. Deseja continuar?', [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Sair',
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

        Alert.alert('Atenção', 'Você tem certeza que deseja apagar permanentemente. Deseja continuar?', [
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

    const pdTopPx = pt !== undefined ? pt : paddingTop + 'px';
    const pdTop = pt !== undefined ? pt : paddingTop;

    return (
        <SCenter position={'relative'} bg="background.default" pb={2} pt={pdTopPx} mb={mb}>
            {backButton && (
                <SBox position={'absolute'} left={0} top={0}>
                    <TouchableOpacity
                        style={{
                            paddingHorizontal: 16,
                            paddingTop: pdTop,
                            paddingBottom: 30,
                        }}
                        onPress={handleGoBack}
                    >
                        <SIcon as={Feather} name="arrow-left" color="text.main" size={5} />
                    </TouchableOpacity>
                </SBox>
            )}
            <SHeading
                color="text.main"
                fontSize={18}
                width={'70%'}
                noOfLines={2}
                textAlign={'center'}
                fontFamily="heading"
            >
                {title}
            </SHeading>
            {subtitle && <SText fontSize={13}>{subtitle}</SText>}
            {!!subtitleComponent && subtitleComponent}
            {onDelete && (
                <SBox position={'absolute'} right={4} top={pdTopPx}>
                    <TouchableOpacity onPress={handleDelete}>
                        <SIcon as={Feather} name="trash" color="red.500" size={4} />
                    </TouchableOpacity>
                </SBox>
            )}
        </SCenter>
    );
}
