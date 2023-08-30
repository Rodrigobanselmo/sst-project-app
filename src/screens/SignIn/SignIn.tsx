import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { useAuth } from '@hooks/useAuth';

import { AppError } from '@utils/errors';

import LogoTextSvg from '@assets/brand/logoTextFull.svg';
import LogoSvg from '@assets/brand/logoSimple.svg';
import { AuthNavigatorRoutesProps } from '@routes/auth/AuthRoutesProps';
import { SButton, SInput } from '@components/index';
import { SHStack, SHeading, SToast, SVStack, SCenter, useSToast, SBox } from '@components/core';
import { ScrollView } from 'react-native';

type FormDataProps = {
    email: string;
    password: string;
};

const signInSchema = yup.object({
    email: yup.string().required('Informe o e-mail.').email('E-mail inválido.'),
    password: yup.string().required('Informe a senha.').min(6, 'A senha deve ter pelo menos 6 dígitos.'),
});

export function SignIn() {
    const [isLoading, setIsLoading] = useState(false);

    const { signIn } = useAuth();

    const navigation = useNavigation<AuthNavigatorRoutesProps>();

    const toast = useSToast();

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<FormDataProps>({
        resolver: yupResolver(signInSchema),
        defaultValues: {
            email: 'apresentacao@simple.com',
            password: 'qweqweqwe',
        },
    });

    async function handleSignIn({ email, password }: FormDataProps) {
        try {
            setIsLoading(true);

            await signIn(email, password);
        } catch (error) {
            const isAppError = error instanceof AppError;

            const title = isAppError ? error.message : 'Não foi possível entrar. Tente novamente mais tarde.';

            setIsLoading(false);
            toast.show({
                title: 'Erro ao fazer login',
                description: title,
                placement: 'top',
                bgColor: 'status.error',
            });
        }
    }

    function handleNewAccount() {
        navigation.navigate('signUp');
    }

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            <SVStack flex={1} px={10} pb={16}>
                {/* <Image
					source={BackgroundImg}
					defaultSource={BackgroundImg}
					alt="Pessoas treinando"
					resizeMode="contain"
					position="absolute"
				/> */}

                <SHStack my={24} alignItems={'center'}>
                    <SCenter flex={4}>
                        <LogoTextSvg width={'100%'} />
                    </SCenter>
                    <SCenter flex={1}>
                        <LogoSvg width={'100%'} />
                    </SCenter>
                </SHStack>

                <SCenter>
                    <SHeading color="text.main" fontSize={21} mb={6} fontFamily="heading">
                        Acesse sua conta
                    </SHeading>

                    <Controller
                        control={control}
                        name="email"
                        render={({ field: { value, onChange } }) => (
                            <SInput
                                inputProps={{
                                    placeholder: 'E-mail',
                                    keyboardType: 'email-address',
                                    variant: 'filled',
                                    autoCapitalize: 'none',
                                    value,
                                    onChangeText: onChange,
                                }}
                                errorMessage={errors.email?.message}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="password"
                        render={({ field: { value, onChange } }) => (
                            <SInput
                                inputProps={{
                                    placeholder: 'Senha',
                                    keyboardType: 'email-address',
                                    variant: 'filled',
                                    autoCapitalize: 'none',
                                    value,
                                    secureTextEntry: true,
                                    onChangeText: onChange,
                                    onSubmitEditing: handleSubmit(handleSignIn),
                                    returnKeyType: 'send',
                                }}
                                errorMessage={errors.password?.message}
                            />
                        )}
                    />

                    <SButton title="Acessar" onPress={handleSubmit(handleSignIn)} isLoading={isLoading} />
                </SCenter>

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
            </SVStack>
        </ScrollView>
    );
}
