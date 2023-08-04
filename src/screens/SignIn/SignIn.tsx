import { VStack, Image, Text, Center, Heading, ScrollView, useToast, HStack } from 'native-base';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigatorRoutesProps } from '@routes/auth/AuthRoutesProps';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm, Controller } from 'react-hook-form';
import { SignInFormProps } from './types';
import { AppError } from '@utils/errors';
import { useAuth } from '@hooks/useAuth';
import { useState } from 'react';
import { signInSchema, signInDefaultValues } from './schemas';

import LogoTextSvg from '@assets/brand/logoTextFull.svg';
import LogoSvg from '@assets/brand/logoSimple.svg';
import { SButton, SInput } from '@components/index';

export const SignIn = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { signIn } = useAuth();
    const { navigate } = useNavigation<AuthNavigatorRoutesProps>();
    const toast = useToast();
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<SignInFormProps>({
        defaultValues: signInDefaultValues,
        resolver: yupResolver(signInSchema),
    });

    // const handleNavigateToSignUp = () => {
    //   navigate('signUp');
    // };

    const handleSignIn = async ({ email, password }: SignInFormProps) => {
        try {
            setIsLoading(true);
            await signIn(email, password);
        } catch (error) {
            const isAppError = error instanceof AppError;
            const message = isAppError ? error.message : 'Erro ao fazer login. Tente novamente mais tarde.';
            setIsLoading(false);
            toast.show({
                title: 'Erro ao fazer login',
                description: message,
                placement: 'top',
                bgColor: 'status.error',
            });
        }
    };

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            <VStack flex={1} px={10}>
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
                    <Heading color="gray.100" fontSize={21} mb={6} fontFamily="heading">
                        Acesse sua conta
                    </Heading>

                    <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, value } }) => (
                            <SInput
                                inputProps={{
                                    placeholder: 'E-mail',
                                    variant: 'filled',
                                    keyboardType: 'email-address',
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
                        render={({ field: { onChange, value } }) => (
                            <SInput
                                inputProps={{
                                    placeholder: 'Senha',
                                    variant: 'filled',
                                    secureTextEntry: true,
                                    value,
                                    onChangeText: onChange,
                                }}
                                errorMessage={errors.password?.message}
                            />
                        )}
                    />

                    <SButton title="Acessar" onPress={handleSubmit(handleSignIn)} isLoading={isLoading} />
                </Center>

                {/* <Center mt={24}>
          <Text color="gray.100" fontStyle="sm" mb={3} fontFamily="body">
            Ainda não tem acesso?
          </Text>

          <Button title="Criar conta" variant="outline" onPress={handleNavigateToSignUp} />
        </Center> */}
            </VStack>
        </ScrollView>
    );
};
