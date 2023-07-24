import { Button } from '@components/Button';
import { HomeHeader } from '@components/HomeHeader';
import { Loading } from '@components/Loading';
import { ScreenHeader } from '@components/ScreenHeader';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { api } from '@services/api';
import { Feather } from '@expo/vector-icons';
import { AppError } from '@utils/errors';
import { Box, FlatList, Heading, HStack, Icon, ScrollView, Text, useToast, VStack, Image } from 'native-base';
import { useCallback, useEffect, useState } from 'react';
import { CharParamsProps } from './tyoes';
import { TouchableOpacity } from 'react-native';
import BodySvg from '@assets/body.svg';
import SeriesSvg from '@assets/series.svg';
import RepetitionsSvg from '@assets/repetitions.svg';
import * as ImagePicker from 'expo-image-picker';
import PhotoEditor from '@baronha/react-native-photo-editor';

export const Characterization = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { goBack } = useNavigation();
    const { params } = useRoute();
    const toast = useToast();

    const { id } = params as CharParamsProps;

    const { navigate } = useNavigation<AppNavigatorRoutesProps>();

    // const fetchExerciseDetails = async () => {
    //   try {
    //     setIsLoading(true);
    //     const { data } = await api.get(`/exercises/${id}`);
    //     setExercise(data);
    //   } catch (error) {
    //     const isAppError = error instanceof AppError;
    //     const message = isAppError ? error.message : 'Erro ao buscar detalhes do exercício. Tente novamente mais tarde.';
    //     toast.show({
    //       title: 'Erro ao buscar detalhes do exercício',
    //       description: message,
    //       placement: 'top',
    //       bgColor: 'red.500',
    //     });
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };

    // const handleExerciseHistoryRegister = async () => {
    //   try {
    //     setSendingRegister(true);
    //     await api.post('/history', { exercise_id: id });

    //     toast.show({
    //       title: 'Parabéns! 👏',
    //       description: 'Exercício registrado com sucesso!',
    //       placement: 'top',
    //       bgColor: 'green.500',
    //     });

    //     navigate('history');
    //   } catch (error) {
    //     const isAppError = error instanceof AppError;
    //     const message = isAppError ? error.message : 'Erro ao registrar exercício. Tente novamente mais tarde.';
    //     toast.show({
    //       title: 'Erro ao registrar exercício',
    //       description: message,
    //       placement: 'top',
    //       bgColor: 'red.500',
    //     });
    //   } finally {
    //     setSendingRegister(false);
    //   }
    // };

    // useEffect(() => {
    //   fetchExerciseDetails();
    // }, [id]);

    const [image, setImage] = useState<string | null>(null);

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        // let result2 = await ImagePicker.launchCameraAsync({
        //     mediaTypes: ImagePicker.MediaTypeOptions.All,
        //     allowsEditing: true,
        //     aspect: [4, 3],
        //     quality: 1,
        // });

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });
        2438911;

        console.log(result);

        if (!result.canceled) {
            const uri = result?.assets?.[0]?.uri;
            const resultEdit = await PhotoEditor.open({ path: uri, stickers: [] });
            console.log(resultEdit);
            setImage(uri);
        }
    };

    const openCamera = async () => {
        // Ask the user for the permission to access the camera
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            alert('Você recusou permitir que este aplicativo acesse sua câmera!');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
            // allowsMultipleSelection: true,
            // mediaTypes: ImagePicker.MediaTypeOptions.All,
        });

        // Explore the result
        console.log(result);

        if (!result.canceled) {
            const uri = result?.assets?.[0]?.uri;
            setImage(uri);

            const resultEdit = await PhotoEditor.open({ path: uri, stickers: [] });
        }
    };

    return (
        <VStack flex={1}>
            <ScreenHeader title="Atividade" backButton navidateArgs={['task', {}]} />

            {image && <Image source={{ uri: image }} resizeMode="contain" style={{ width: 200, height: 200 }} />}
            <Box style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Button title="camera" onPress={openCamera} />
            </Box>
            <Box style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Button title="Pick an image from camera roll" onPress={pickImage} />
            </Box>

            {/* <HStack alignItems="center">
            <BodySvg />
            <Text color="gray.200" ml={1} textTransform="capitalize">
              exercise.group
            </Text>
          </HStack> */}
            <ScrollView>
                {isLoading ? (
                    <Loading />
                ) : (
                    <VStack p={8}>
                        <Box rounded="lg" mb={3} overflow="hidden">
                            {/* <Image
                source={{
                  uri: `${api.defaults.baseURL}/exercise/demo/${exercise.demo}`,
                }}
                alt="exercise"
                w="full"
                h={80}
                resizeMode="cover"
                rounded="lg"
              /> */}
                        </Box>

                        <Box bg="gray.600" rounded="md" pb={4} px={4}>
                            <HStack justifyContent="space-around" mb={6} mt={5}>
                                <HStack>
                                    <SeriesSvg />
                                    <Text color="gray.200" ml={2}>
                                        séries
                                    </Text>
                                </HStack>
                                <HStack>
                                    <RepetitionsSvg />
                                    <Text color="gray.200" ml={2}>
                                        repetições
                                    </Text>
                                </HStack>
                            </HStack>
                            {/* <Button
                title="Marcar como realizado"
                isLoading={sendingRegister}
                onPress={handleExerciseHistoryRegister}
              /> */}
                        </Box>
                    </VStack>
                )}
            </ScrollView>
        </VStack>
    );
};
