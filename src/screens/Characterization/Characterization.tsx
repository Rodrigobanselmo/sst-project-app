import RepetitionsSvg from '@assets/repetitions.svg';
import SeriesSvg from '@assets/series.svg';
import { Button } from '@components/Button';
import { Loading } from '@components/Loading';
import { ScreenHeader } from '@components/ScreenHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppNavigatorRoutesProps, AppRoutesProps } from '@routes/app/AppRoutesProps';
import { Box, HStack, Image, ScrollView, Text, VStack, useToast } from 'native-base';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { CharParamsProps } from './tyoes';
// import * as ImagePicker from 'expo-image-picker';
import PhotoEditor from '@baronha/react-native-photo-editor';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraType } from 'expo-camera';
import * as ImagePickerExpo from 'expo-image-picker';
import ImagePicker from 'react-native-image-crop-picker';

type CameraPageProps = NativeStackScreenProps<AppRoutesProps, 'characterization'>;

export function Characterization({ navigation }: CameraPageProps): React.ReactElement {
    const [isLoading, setIsLoading] = useState(false);
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
        let result = await ImagePicker.openPicker({
            cropping: false,
            // mediaType: 'photo',
            // multiple: true,
        });

        console.log(result);

        // const result = [];

        // for await (const image of images) {
        //     const img = await ImagePicker.openCropper({
        //         mediaType: "photo",
        //         path: image.path,
        //         width: 1000,
        //         height: 1000,
        //     });
        //     result.push(img.path);
        // }

        if (result?.sourceURL) {
            const uri = result?.sourceURL;

            let resultCrop = await ImagePicker.openCropper({
                path: uri,
                width: 300,
                height: 400,
                cropping: true,
                mediaType: 'photo',
            });

            const resultEdit = await PhotoEditor.open({ path: uri, stickers: [] });
            console.log(resultEdit);
            setImage(uri);
        }
        // if (!result?.[0]?.path) {
        //     const uri = result?.[0]?.path;
        //     const resultEdit = await PhotoEditor.open({ path: uri, stickers: [] });
        //     console.log(resultEdit);
        //     setImage(uri);
        // }
    };

    const openCamera = async () => {
        const permissionResult = await ImagePickerExpo.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            alert('Você recusou permitir que este aplicativo acesse sua câmera!');
            return;
        }

        const result = await ImagePicker.openCamera({
            mediaType: 'photo',
            cropping: false,
        });

        const result2 = await ImagePickerExpo.launchCameraAsync({
            allowsEditing: false,
            aspect: [4, 3],
        });
        console.log(999988888, result2);

        if (result?.path) {
            console.log(999, result);
            const resultCrop = await ImagePicker.openCropper({
                path: result?.path,
                cropping: true,
                compressImageQuality: 0.5,
                mediaType: 'photo',
                ...(result.height > result.width
                    ? {
                          width: 900,
                          height: 1200,
                          compressImageMaxWidth: 900,
                      }
                    : {
                          width: 1200,
                          height: 900,
                          compressImageMaxWidth: 1200,
                      }),
            });

            console.log(resultCrop);

            if (resultCrop?.path) {
                const uri = resultCrop?.path;
                // const resultEdit = await PhotoEditor.open({ path: uri, stickers: [] });
                setImage(uri);
            }
        }
    };

    const [type, setType] = useState(CameraType.back);
    function toggleCameraType() {
        setType((current) => (current === CameraType.back ? CameraType.front : CameraType.back));
    }

    // return (
    //     <Box width={'100%'} height={'100%'}>
    //         <CameraPage />
    //     </Box>
    // );

    return (
        <VStack flex={1}>
            <ScreenHeader title="Atividade" backButton navidateArgs={['task', {}]} />

            {/* <HStack alignItems="center">
            <BodySvg />
            <Text color="gray.200" ml={1} textTransform="capitalize">
            exercise.group
            </Text>
        </HStack> */}
            <ScrollView>
                {/* <Box style={styles.container}>
                    <Camera style={styles.camera} type={type}>
                        <Box style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.button} onPress={toggleCameraType}>
                                <Text style={styles.text}>Flip Camera</Text>
                            </TouchableOpacity>
                        </Box>
                    </Camera>
                </Box> */}

                {image && (
                    <Image
                        alt="preview"
                        source={{ uri: image }}
                        resizeMode="contain"
                        style={{ width: 600, height: 600 }}
                    />
                )}
                <Box style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Button title="camera" onPress={openCamera} />
                </Box>
                <Box style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Button title="Pick an image from camera roll" onPress={pickImage} />
                </Box>
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
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        height: 600,
    },
    camera: {
        flex: 1,
    },
    buttonContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'transparent',
        margin: 64,
    },
    button: {
        flex: 1,
        alignSelf: 'flex-end',
        alignItems: 'center',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
});
