import { useState } from "react";
import {
	VStack,
	Image,
	Text,
	Center,
	Heading,
	ScrollView,
	useToast,
	HStack
} from "native-base";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

import { useAuth } from "@hooks/useAuth";

import { AppError } from "@utils/errors";

import { Input } from "@components/Input";
import { Button } from "@components/Button";

import LogoTextSvg from "@assets/brand/logoTextFull.svg";
import LogoSvg from "@assets/brand/logoSimple.svg";
import { AuthNavigatorRoutesProps } from "@routes/auth/AuthRoutesProps";
// import LogoWithTextImage from "@assets/brand/logoWithText2.png";

type FormDataProps = {
	email: string;
	password: string;
};

const signInSchema = yup.object({
	email: yup.string().required("Informe o e-mail.").email("E-mail inválido."),
	password: yup
		.string()
		.required("Informe a senha.")
		.min(6, "A senha deve ter pelo menos 6 dígitos.")
});

export function SignIn() {
	const [isLoading, setIsLoading] = useState(false);

	const { signIn } = useAuth();

	const navigation = useNavigation<AuthNavigatorRoutesProps>();

	const toast = useToast();

	const {
		control,
		handleSubmit,
		formState: { errors }
	} = useForm<FormDataProps>({
		resolver: yupResolver(signInSchema),
		defaultValues: {
			email: "",
			password: ""
		}
	});

	async function handleSignIn({ email, password }: FormDataProps) {
		try {
			setIsLoading(true);

			await signIn(email, password);
		} catch (error) {
			const isAppError = error instanceof AppError;

			const title = isAppError
				? error.message
				: "Não foi possível entrar. Tente novamente mais tarde.";

			setIsLoading(false);

			toast.show({
				title,
				placement: "top",
				bgColor: "status.error"
			});
		}
	}

	function handleNewAccount() {
		navigation.navigate("signUp");
	}

	return (
		<ScrollView
			contentContainerStyle={{
				flexGrow: 1
			}}
			bg="background.default"
			showsVerticalScrollIndicator={false}
		>
			<VStack flex={1} px={10} pb={16}>
				{/* <Image
					source={BackgroundImg}
					defaultSource={BackgroundImg}
					alt="Pessoas treinando"
					resizeMode="contain"
					position="absolute"
				/> */}

				<HStack my={24} alignItems={'center'}>
					<Center flex={4}>
						<LogoTextSvg width={'100%'} />
					</Center>
					<Center flex={1}>
						<LogoSvg width={'100%'} />
					</Center>
				</HStack>

				<Center>
					<Heading color="text.main" fontSize="xl" mb={6} fontFamily="heading">
						Acesse sua conta
					</Heading>

					<Controller
						control={control}
						name="email"
						render={({ field: { value, onChange } }) => (
							<Input
								placeholder="E-mail"
								keyboardType="email-address"
								autoCapitalize="none"
								onChangeText={onChange}
								value={value}
								errorMessage={errors.email?.message}
							/>
						)}
					/>

					<Controller
						control={control}
						name="password"
						render={({ field: { value, onChange } }) => (
							<Input
								placeholder="Senha"
								secureTextEntry
								onChangeText={onChange}
								value={value}
								onSubmitEditing={handleSubmit(handleSignIn)}
								returnKeyType="send"
								errorMessage={errors.password?.message}
							/>
						)}
					/>

					<Button
						title="Acessar"
						onPress={handleSubmit(handleSignIn)}
						isLoading={isLoading}
					/>
				</Center>

				{/* <Center mt={24}>
					<Text color="gray.100" fontSize="sm" mb={3} fontFamily="body">
						Ainda não tem acesso?
					</Text>
					<Button
						title="Criar conta"
						variant="outline"
						onPress={handleNewAccount}
					/>
				</Center> */}
			</VStack>
		</ScrollView>
	);
}
