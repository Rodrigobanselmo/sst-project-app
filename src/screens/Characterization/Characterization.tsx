import RepetitionsSvg from '@assets/repetitions.svg';
import SeriesSvg from '@assets/series.svg';
import { Button } from '@components/Button';
import { Loading } from '@components/Loading';
import { ScreenHeader } from '@components/ScreenHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppNavigatorRoutesProps, AppRoutesProps } from '@routes/app/AppRoutesProps';
import { Box, Center, FlatList, HStack, Icon, Image, ScrollView, Text, VStack, useToast } from 'native-base';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { CharParamsProps } from './types';
// import * as ImagePicker from 'expo-image-picker';
import PhotoEditor from '@baronha/react-native-photo-editor';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraType } from 'expo-camera';
import * as ImagePickerExpo from 'expo-image-picker';
import ImagePicker from 'react-native-image-crop-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Orientation } from 'expo-screen-orientation';
import PlaceholderImage from '@assets/placeholder-image.png';
import { SCREEN_WIDTH } from '@constants/constants';
import { PhotoComponent } from './components/PhotoComponent';

type CameraPageProps = NativeStackScreenProps<AppRoutesProps, 'characterization'>;
export const GALLERY_IMAGE_Width = 300;
export const GALLERY_IMAGE_PORTRAIT_WIDTH = (((GALLERY_IMAGE_Width * 9) / 16) * 9) / 16;
export const GALLERY_IMAGE_HEIGHT = (GALLERY_IMAGE_Width * 9) / 16;

export function Characterization({ navigation, route }: CameraPageProps): React.ReactElement {
    const [isLoading, setIsLoading] = useState(false);
    const { params } = useRoute();
    const toast = useToast();

    const { id, images } = route.params;

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

    const openCamera = async () => {
        const permissionResult = await ImagePickerExpo.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            alert('Você recusou permitir que este aplicativo acesse sua câmera!');
            return;
        }

        navigation.navigate('camera');
    };

    const handleDeleteImage = (index: number) => {
        const updatedImages = [...(images || [])];
        updatedImages.splice(index, 1);
        navigation.setParams({ ...route.params, images: updatedImages });
    };

    return (
        <VStack flex={1}>
            <ScreenHeader title="Atividade" backButton navidateArgs={['task', {}]} />

            <ScrollView paddingTop={3} paddingBottom={3}>
                <Center style={styles.galleryContainer}>
                    {!images?.length && (
                        <TouchableOpacity onPress={openCamera}>
                            <PhotoComponent orientation={Orientation.LANDSCAPE_LEFT} uri={''} />
                        </TouchableOpacity>
                    )}

                    {!!images?.length && (
                        <FlatList
                            data={images || []}
                            ItemSeparatorComponent={() => <Box style={{ height: 10 }} />}
                            contentContainerStyle={{
                                paddingHorizontal: 10,
                                gap: 10,
                                ...((!images || images.length <= 1) && {
                                    paddingLeft:
                                        (SCREEN_WIDTH -
                                            (images?.[0]?.orientation === Orientation.PORTRAIT_UP
                                                ? GALLERY_IMAGE_PORTRAIT_WIDTH
                                                : GALLERY_IMAGE_Width)) /
                                        2,
                                }),
                            }}
                            renderItem={({ item, index }) => (
                                <PhotoComponent
                                    maxHeight={null}
                                    key={item.uri}
                                    handleDeleteImage={() => handleDeleteImage(index)}
                                    orientation={item.orientation}
                                    uri={item.uri}
                                />
                            )}
                            horizontal
                            keyExtractor={(item, index) => index.toString()}
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                        />
                    )}

                    {images && images.length > 2 && (
                        <Center px={2} borderRadius={10} position={'absolute'} bottom={-30} mt={2} bg="#00000044">
                            <Text fontSize={12} color="white">
                                Total: {images.length}
                            </Text>
                        </Center>
                    )}
                </Center>

                <HStack justifyContent="center" mt={3}>
                    <Button mr={2} variant="outline" w="30%" title="Galeria" onPress={openCamera} addColor />
                    <Button w="30%" title="Tirar Foto" onPress={openCamera} addColor />
                </HStack>

                <HStack alignItems="center" justifyContent="center">
                    <Text color="text.label" fontSize={16} ml={4} mb={3} mt={10}>
                        Fotos
                    </Text>
                </HStack>
                {isLoading ? <Loading /> : <VStack p={8}></VStack>}
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
    galleryContainer: {
        width: '100%',
    },
});
