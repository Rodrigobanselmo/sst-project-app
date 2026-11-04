import { SHStack, SText } from '@components/core';
import { pagePaddingPx } from '@constants/constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { saveImageOrVideoToGallery } from '@utils/helpers/saveAsset';
import { VideoView, useVideoPlayer } from 'expo-video';
import { AudioModule } from 'expo-audio';
import { Camera } from 'expo-camera';
import { persistVisitMedia } from '@utils/helpers/durableMedia';
import { theme } from 'native-base';
import React, { useCallback, useEffect } from 'react';
import { Alert, FlatList, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SLabel } from '../SLabel';
import { SNoContent } from '../SNoContent';

export default function VideoRecorder({
    videos,
    setVideos,
    onDelete,
}: {
    setVideos: (arg: string[]) => void;
    videos: string[];
    onDelete?: () => void;
}) {
    useEffect(() => {
        (async () => {
            const permissionResult = await Camera.requestCameraPermissionsAsync();

            if (permissionResult.status === 'denied') {
                await Linking.openSettings();
                return;
            }

            const permissionAudio = await AudioModule.requestRecordingPermissionsAsync();

            if (!permissionAudio.granted) {
                await Linking.openSettings();
                return;
            }
        })();
    }, []);

    const startRecording = useCallback(async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['videos'],
                videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
                cameraType: ImagePicker.CameraType.front,
            });
            if (result.canceled || !result.assets[0]) return;
            const originalUri = result.assets[0].uri;
            setVideos([...videos, originalUri]);
            try {
                const localUri = await persistVisitMedia(originalUri, 'video');
                setVideos([...videos, localUri]);
                // An optional gallery backup must never block collection storage.
                void saveImageOrVideoToGallery(localUri).catch(() => undefined);
            } catch {
                Alert.alert('Vídeo aguardando armazenamento', 'O vídeo foi mantido. Libere espaço e salve novamente antes de fechar o app.');
            }
        } catch {
            Alert.alert('Não foi possível gravar', 'Tente abrir a câmera novamente. Os vídeos anteriores foram mantidos.');
        }
    }, [setVideos, videos]);

    const deleteVideo = useCallback(
        async (uri: string) => {
            const action = async () => {
                // Retain the binary while a queued operation may reference it.
                setVideos(videos.filter((recordingUri) => recordingUri !== uri));
                onDelete?.();
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
        [setVideos, videos, onDelete],
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
            </SHStack>

            {!!videos.length && <VideoList savedVideos={videos} deleteVideo={deleteVideo} />}
            {!videos.length && <SNoContent width={'100%'} my={'12px'} text="nenhum video encontrado" />}
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
        <FlatList
            data={savedVideos}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => <VideoItem videoUri={item} deleteVideo={deleteVideo} />}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        />
    );
};

// Fixed card size for consistent layout
const CARD_WIDTH = 140;
const CARD_HEIGHT = 200;

const VideoItem = ({ videoUri, deleteVideo }: { videoUri: string; deleteVideo: (uri: string) => Promise<void> }) => {
    const player = useVideoPlayer({ uri: videoUri }, (player) => {
        player.loop = true;
    });

    return (
        <View style={styles.item}>
            <View style={styles.videoContainer}>
                <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => deleteVideo(videoUri)}>
                <Ionicons name="trash-outline" size={16} color={theme.colors.red[500]} />
                <SText style={styles.deleteText}>Deletar</SText>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    buttonText: {
        color: 'white',
        fontSize: 15,
    },
    container: {
        flex: 1,
        marginHorizontal: pagePaddingPx,
    },
    deleteButton: {
        alignItems: 'center',
        borderColor: theme.colors.red[500],
        borderRadius: 6,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 4,
        justifyContent: 'center',
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    deleteText: {
        color: theme.colors.red[500],
        fontSize: 12,
        fontWeight: '500',
    },
    item: {
        alignItems: 'center',
        backgroundColor: theme.colors.gray[100],
        borderColor: theme.colors.gray[300],
        borderRadius: 12,
        borderWidth: 1,
        padding: 8,
        width: CARD_WIDTH,
    },
    listContent: {
        paddingVertical: 8,
    },
    recordButton: {
        backgroundColor: theme.colors.gray[400],
        borderRadius: 50,
        fontSize: 15,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    video: {
        borderRadius: 8,
        height: CARD_HEIGHT,
        width: '100%',
    },
    videoContainer: {
        backgroundColor: theme.colors.gray[800],
        borderRadius: 8,
        height: CARD_HEIGHT,
        overflow: 'hidden',
        width: '100%',
    },
});
