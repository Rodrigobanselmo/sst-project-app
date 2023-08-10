import { SVStack, SImage, SText, SCenter, SHeading, SScrollView, useSToast } from '@components/core';
import LogoSvg from '@assets/logo.svg';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigatorRoutesProps } from '@routes/auth/AuthRoutesProps';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ISignUpFormProps } from './types';
import { signUpSchema, defaultValues } from './schemas';
import { api } from '@services/api';
import { AppError } from '@utils/errors';
import { useState } from 'react';
import { useAuth } from '@hooks/useAuth';
import { SInput, SButton } from '@components/index';

export const SignUp = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { signIn } = useAuth();
    const toast = useSToast();
    const { navigate } = useNavigation<AuthNavigatorRoutesProps>();
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ISignUpFormProps>({
        defaultValues: defaultValues,
        resolver: yupResolver(signUpSchema),
    });

    const handleNavigateToSignIn = () => {
        navigate('signIn');
    };

    const handleSignUp = async ({ name, email, password }: ISignUpFormProps) => {
        try {
            setIsLoading(true);
            await api.post('/users', {
                name,
                email,
                password,
            });
            await signIn(email, password);
        } catch (error) {
            const isAppError = error instanceof AppError;
            const message = isAppError ? error.message : 'Erro ao cadastrar usuário. Tente novamente mais tarde.';
            setIsLoading(false);

            toast.show({
                title: 'Erro ao cadastrar usuário',
                description: message,
                placement: 'top',
                bgColor: 'status.error',
            });
        }
    };

    return (
        <SScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            <SVStack flex={1} px={10}>
                <SCenter my={24}>
                    <LogoSvg />
                    <SText color="gray.100" fontSize="sm">
                        Treine sua mente e o seu corpo
                    </SText>
                </SCenter>

                <SCenter>
                    <SHeading color="gray.100" fontSize={21} mb={6} fontFamily="heading">
                        Crie sua conta
                    </SHeading>

                    {/* <Controller
                        control={control}
                        name="name"
                        render={({ field: { onChange, value } }) => (
                            <SInput
                                variant="filled"
                                placeholder="Nome"
                                errorMessage={errors.name?.message}
                                value={value}
                                onChangeText={onChange}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, value } }) => (
                            <SInput
                                variant="filled"
                                placeholder="E-mail"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={value}
                                onChangeText={onChange}
                                errorMessage={errors.email?.message}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, value } }) => (
                            <SInput
                                variant="filled"
                                placeholder="Senha"
                                secureTextEntry
                                value={value}
                                onChangeText={onChange}
                                errorMessage={errors.password?.message}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="password_confirm"
                        render={({ field: { onChange, value } }) => (
                            <SInput
                                variant="filled"
                                placeholder="Confirmar senha"
                                secureTextEntry
                                value={value}
                                onChangeText={onChange}
                                onSubmitEditing={handleSubmit(handleSignUp)}
                                returnKeyType="send"
                                errorMessage={errors.password_confirm?.message}
                            />
                        )}
                    /> */}

                    <SButton title="Criar e acessar" onPress={handleSubmit(handleSignUp)} />
                </SCenter>

                <SButton
                    title="Voltar para o login"
                    variant="outline"
                    mt={12}
                    mb={4}
                    onPress={handleNavigateToSignIn}
                    isLoading={isLoading}
                />
            </SVStack>
        </SScrollView>
    );
};
