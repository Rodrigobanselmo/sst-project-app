import { Box, Center, Heading, Icon } from 'native-base';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps, AppRoutesProps } from '@routes/app/AppRoutesProps';

interface ScreenHeaderProps {
    title: string;
    navidateArgs?: [keyof AppRoutesProps, any];
    backButton?: boolean;
}

export function ScreenHeader({ title, navidateArgs, backButton }: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();
    const { goBack, navigate } = useNavigation<AppNavigatorRoutesProps>();

    const paddingTop = insets.top + 12;

    const handleGoBack = () => {
        if (navidateArgs) {
            navigate(...navidateArgs), {};
        } else {
            goBack();
        }
    };

    return (
        <Center position={'relative'} bg="background.default" pb={3} pt={paddingTop + 'px'} shadow={1}>
            {backButton && (
                <Box position={'absolute'} left={4} top={paddingTop + 'px'}>
                    <TouchableOpacity onPress={handleGoBack}>
                        <Icon as={Feather} name="arrow-left" color="text.main" size={6} />
                    </TouchableOpacity>
                </Box>
            )}
            <Heading color="text.main" fontSize="xl" fontFamily="heading">
                {title}
            </Heading>
        </Center>
    );
}
