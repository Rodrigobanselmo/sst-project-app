import { TouchableOpacity } from 'react-native';
import { SHeading, SHStack, SText, SVStack, SIcon } from '@components/core';
import { MaterialIcons, Feather } from '@expo/vector-icons';

import { useAuth } from '@hooks/useAuth';

import { api } from '@services/api';

import { UserPhoto } from '@components/organisms/SUserPhoto';

import defaultUserPhotoImage from '@assets/userPhotoDefault.png';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { useNavigation } from '@react-navigation/native';

export function SHomeHeader({ bottomSpace }: { bottomSpace?: boolean }) {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const { navigate } = useNavigation<AppNavigatorRoutesProps>();

    const onNavigate = () => {
        navigate('profile');
    };

    const paddingTop = insets.top + 20;

    return (
        <SHStack
            mb={bottomSpace ? 6 : 0}
            bg="background.default"
            pt={paddingTop + 'px'}
            pb={'16px'}
            px={6}
            alignItems="center"
            shadow={'1'}
        >
            <UserPhoto source={defaultUserPhotoImage} mr={4} sizeBox={10} />

            <SVStack flex={1}>
                <SText color="text.main" fontSize="md">
                    Olá,
                </SText>

                <SHeading color="text.main" fontSize="md" fontFamily="heading">
                    {user.name}
                </SHeading>
            </SVStack>

            <TouchableOpacity onPress={onNavigate}>
                <SIcon as={Feather} name="settings" color="text.main" size={5} />
            </TouchableOpacity>
        </SHStack>
    );
}
