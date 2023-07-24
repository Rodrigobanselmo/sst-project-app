import { useState } from 'react';
import { ScreenHeader } from '@components/ScreenHeader';
import { UserPhoto } from '@components/UserPhoto';
import { Center, ScrollView, VStack, Skeleton, Text, Heading, useToast, Box } from 'native-base';
import { Controller, useForm } from 'react-hook-form';
import { PHOTO_SIZE } from './constants';
import { TouchableOpacity } from 'react-native';
import { Input } from '@components/Input';
import { Button } from '@components/Button';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@hooks/useAuth';
import { IProfileFormProps } from './types';
import { yupResolver } from '@hookform/resolvers/yup';
import { profileFormSchema } from './schemas';
import UserPhotoDefaultImg from '@assets/userPhotoDefault.png';
import { AppError } from '@utils/errors';
import { api } from '@services/api';
import { updateUser } from '@services/api/user/updateUser';

export const Profile = () => {
  const { user, updateUserProfile, signOut } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [photoIsLoading, setPhotoIsLoading] = useState(false);
  const toast = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<IProfileFormProps>({
    defaultValues: {
      name: user.name,
      email: user.email,
    },
    resolver: yupResolver(profileFormSchema),
  });

  const handleProfileUpdate = async (data: IProfileFormProps) => {
    try {
      setIsUpdating(true);

      const userUpdated = user;
      userUpdated.name = data.name;

      const changePass = data.password && data.password === data.confirm_password && data.old_password;

      await updateUser({
        name: data.name,
        ...(changePass && {
          password: data.password,
          oldPassword: data.old_password,
        })
      });

      await updateUserProfile(userUpdated);

      toast.show({
        title: 'Perfil atualizado com sucesso!',
        description: 'Seus dados foram atualizados com sucesso.',
        placement: 'top',
        bgColor: 'green.500',
      });

      if (data.password && data.confirm_password && data.old_password) {
        await signOut();
      }
    } catch (error) {
      const isAppError = error instanceof AppError;
      const message = isAppError ? error.message : 'Erro ao atualizar dados do usuário. Tente novamente mais tarde.';
      toast.show({
        title: 'Erro ao atualizar dados do usuário',
        description: message,
        placement: 'top',
        bgColor: 'status.error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUserPhotoSelect = async () => {
    setPhotoIsLoading(true);
    try {
      const photoSelected = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        aspect: [4, 4],
        allowsEditing: true,
        allowsMultipleSelection: false,
      });

      if (photoSelected.canceled) {
        return;
      }

      const [image] = photoSelected.assets;
      if (image.uri) {
        const photoInfo = await FileSystem.getInfoAsync(image.uri, { size: true });

        if ('size' in photoInfo && photoInfo.size / 1024 / 1024 > 5) {
          toast.show({
            title: 'Erro ao selecionar foto de perfil',
            description: 'A foto selecionada deve ter no máximo 5MB',
            placement: 'top',
            bgColor: 'status.error',
          });
          return;
        }

        const fileExtension = image.uri.split('.').pop();
        const photoFile = {
          name: `${user.name}.${fileExtension}`.toLowerCase().replace(' ', '-'),
          uri: image.uri,
          type: `${image.type}/${fileExtension}`,
        } as any;

        const userPhotoUploadFormData = new FormData();
        userPhotoUploadFormData.append('avatar', photoFile);

        const { data } = await api.patch('/users/avatar', userPhotoUploadFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const userUpdated = { ...user, avatar: data.avatar };
        await updateUserProfile(userUpdated);

        toast.show({
          title: 'Foto de perfil atualizada com sucesso!',
          description: 'Sua foto de perfil foi atualizada com sucesso.',
          placement: 'top',
          bgColor: 'green.500',
        });
      }
    } catch (error) {
      const isAppError = error instanceof AppError;
      const message = isAppError ? error.message : 'Erro ao atualizar foto do perfil. Tente novamente mais tarde.';
      toast.show({
        title: 'Erro ao atualizar foto do perfil',
        description: message,
        placement: 'top',
        bgColor: 'status.error',
      });
    } finally {
      setPhotoIsLoading(false);
    }
  };

  return (
    <VStack flex={1}>
      <ScreenHeader title="Perfil" />
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
        <Center mt={6} px={10}>
          <Box mb={6}>
            {photoIsLoading ? (
              <Skeleton w={PHOTO_SIZE} h={PHOTO_SIZE} rounded="full" startColor="gray.500" endColor="gray.400" />
            ) : (
              <UserPhoto
                source={user.photoUrl || UserPhotoDefaultImg}
                alt="avatar"
                size={PHOTO_SIZE}
              />
            )}
          </Box>

          {/* <TouchableOpacity onPress={handleUserPhotoSelect}>
            <Text color="green.500" fontWeight="bold" fontSize="md" mt={2} mb={8}>
              Alterar foto
            </Text>
          </TouchableOpacity> */}

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="Nome"
                value={value}
                onChangeText={onChange}
                errorMessage={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="Email"
                isDisabled
                value={value}
                onChangeText={onChange}
                errorMessage={errors.email?.message}
              />
            )}
          />

          <Heading color="text.label" fontSize="md" fontFamily="heading" mb={2} alignSelf="flex-start" mt={12}>
            Alterar senha
          </Heading>

          <Controller
            control={control}
            name="old_password"
            render={({ field: { onChange } }) => (
              <Input placeholder="Senha antiga" secureTextEntry onChangeText={onChange} />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange } }) => (
              <Input
                placeholder="Nova senha"
                secureTextEntry
                onChangeText={onChange}
                errorMessage={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirm_password"
            render={({ field: { onChange } }) => (
              <Input
                placeholder="Confirmar senha"
                secureTextEntry
                onChangeText={onChange}
                errorMessage={errors.confirm_password?.message}
              />
            )}
          />

          <Button title="Atualizar" mt={4} onPress={handleSubmit(handleProfileUpdate)} isLoading={isUpdating} />
          <Button variant='outline' title="Sair" mt={12} onPress={signOut} isLoading={isUpdating} />
        </Center>
      </ScrollView>
    </VStack>
  );
};
