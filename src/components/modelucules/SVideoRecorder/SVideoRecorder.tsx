import { SBox, SHStack, SScrollView, SText } from '@components/core';
import { SCREEN_WIDTH, pagePaddingPx } from '@constants/constants';
import { Ionicons } from '@expo/vector-icons';
import { deleteImageOrVideoFromGallery, saveImageOrVideoToGallery } from '@utils/helpers/saveAsset';
import { Audio, ResizeMode, Video } from 'expo-av';
import { Camera } from 'expo-camera';
import { theme } from 'native-base';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import { SLabel } from '../SLabel';
import { SNoContent } from '../SNoContent';
import { SButton } from '../SButton';
import { getAssetInfo } from '@utils/helpers/getAssetInfo';
import { AssetInfo } from 'expo-media-library';
import { calculateActualDimensions } from '@utils/helpers/calculateAspectRatio';

export default function VideoRecorder({ videos, setVideos }: { setVideos: (arg: string[]) => void; videos: string[] }) {
    useEffect(() => {
        (async () => {
            const permissionResult = await Camera.requestCameraPermissionsAsync();

            if (permissionResult.status === 'denied') {
                await Linking.openSettings();
                return;
            }

            const permissionAudio = await Audio.requestPermissionsAsync();

            if (permissionAudio.status === 'denied') {
                await Linking.openSettings();
                return;
            }
        })();
    }, []);

    const startRecording = useCallback(async () => {
        ImagePicker.openCamera({
            mediaType: 'video',
            compressVideoPreset: 'MediumQuality',
            useFrontCamera: true,
        }).then(async (image) => {
            const asset = await saveImageOrVideoToGallery(image.path);
            if (asset) {
                setVideos([...videos, asset.uri]);
            }
        });
    }, [setVideos, videos]);

    const deleteVideo = useCallback(
        async (uri: string) => {
            const action = async () => {
                try {
                    await deleteImageOrVideoFromGallery(uri);
                    setVideos(videos.filter((recordingUri) => recordingUri !== uri));
                } catch (error) {
                    console.error(error);
                }
            };

            Alert.alert('Deletar Video', 'Você tem certeza que deseja deletar o video?', [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Deletar',
                    style: 'destructive',
                    onPress: () => action(),
                },
            ]);
        },
        [setVideos],
    );

    return (
        <View style={styles.container}>
            <SHStack mb={5} mt={8} width={'100%'} justifyContent={'space-between'} alignItems={'center'}>
                <SLabel mb={0}>Gravar Video</SLabel>
                <TouchableOpacity onPress={startRecording} style={styles.recordButton}>
                    <SHStack alignItems={'center'} space={2}>
                        <SText style={styles.buttonText}>Gravar</SText>
                        <Ionicons name={'play-circle'} size={20} color="white" />
                    </SHStack>
                </TouchableOpacity>
                {/* <FontAwesome name={'microphone'} size={22} color="black" /> */}
            </SHStack>

            {!!videos.length && <VideoList savedVideos={videos} deleteVideo={deleteVideo} />}
            {!videos.length && <SNoContent width={'100%'} my={'12px'} text="nenhuma video encontrado" />}
        </View>
    );
}

const VideoList = ({
    savedVideos,
    deleteVideo,
}: {
    savedVideos: string[];
    deleteVideo: (uri: string) => Promise<void>;
}) => {
    return (
        <SBox mt={-3} mb={3} display="flex" flexDirection="row">
            <SScrollView
                horizontal
                contentContainerStyle={{
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {savedVideos.map((recordingUri, index) => (
                    <VideoItem index={index} videoUri={recordingUri} deleteVideo={deleteVideo} key={recordingUri} />
                ))}
            </SScrollView>
        </SBox>
    );
};

const VideoItem = ({
    videoUri,
    deleteVideo,
    index,
}: {
    videoUri: string;
    deleteVideo: (uri: string) => Promise<void>;
    index: number;
}) => {
    const video = React.useRef<Video>(null);
    const [asset, setAsset] = useState<AssetInfo | null>(null);

    useEffect(() => {
        const setVideo = async () => {
            if (video.current) {
                const videoAsset = await getAssetInfo(videoUri);
                setAsset(videoAsset);
                const uri = videoAsset?.localUri || videoUri;
                if (uri) video.current.loadAsync({ uri });
            }
        };

        setVideo();
    }, [videoUri]);

    const { height, width } = calculateActualDimensions({
        aspectRatio: `${asset?.width || 9}:${asset?.height || 16}`,
        maxWidth: SCREEN_WIDTH - 100,
        maxHeight: 400,
    });

    return (
        <View
            style={{ ...styles.item, width: width + 20, height: 490, justifyContent: 'center', alignItems: 'center' }}
        >
            <Video
                ref={video}
                style={{
                    width: width,
                    height: height,
                }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping
            />
            <SHStack
                mt={6}
                alignItems={'center'}
                justifyContent={'space-between'}
                display={'flex'}
                space={4}
                w={'100%'}
            >
                <SButton
                    variant={'outline'}
                    w={'100px'}
                    h={'30px'}
                    p={0}
                    color={'error.500'}
                    title="Deletar"
                    onPress={() => deleteVideo(videoUri)}
                />
            </SHStack>
        </View>
    );
};

const styles = StyleSheet.create({
    buttonText: {
        color: 'white',
        fontSize: 15,
    },
    container: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        marginHorizontal: pagePaddingPx,
    },
    item: {
        alignItems: 'center',
        backgroundColor: theme.colors.gray[200],
        borderRadius: 8,
        marginBottom: 8,
        marginRight: 10,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    recordButton: {
        backgroundColor: theme.colors.gray[400],
        borderRadius: 50,
        fontSize: 15,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
});
