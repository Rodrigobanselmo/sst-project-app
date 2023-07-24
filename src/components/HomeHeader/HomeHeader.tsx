import { TouchableOpacity } from "react-native";
import { Heading, HStack, Text, VStack, Icon } from "native-base";
import { MaterialIcons, Feather } from "@expo/vector-icons";

import { useAuth } from "@hooks/useAuth";

import { api } from "@services/api";

import { UserPhoto } from "@components/UserPhoto";

import defaultUserPhotoImage from "@assets/userPhotoDefault.png";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppNavigatorRoutesProps } from "@routes/app/AppRoutesProps";
import { useNavigation } from "@react-navigation/native";

export function HomeHeader() {
	const { user } = useAuth();
	const insets = useSafeAreaInsets()
	const { navigate } = useNavigation<AppNavigatorRoutesProps>();

	const onNavigate = () => {
		navigate("profile");
	};

	const paddingTop = insets.top + 20

	return (
		<HStack bg="background.default" pt={paddingTop + 'px'} pb={'16px'} px={6} alignItems="center" shadow={'1'}>
			<UserPhoto
				source={defaultUserPhotoImage}
				mr={4}
				size={10}
			/>

			<VStack flex={1}>
				<Text color="text.main" fontSize="md">
					Olá,
				</Text>

				<Heading color="text.main" fontSize="md" fontFamily="heading">
					{user.name}
				</Heading>
			</VStack>

			<TouchableOpacity onPress={onNavigate}>
				<Icon as={Feather} name="settings" color="text.main" size={5} />
			</TouchableOpacity>
		</HStack>
	);
}
