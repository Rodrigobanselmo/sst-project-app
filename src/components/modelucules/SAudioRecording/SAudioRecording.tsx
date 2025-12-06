import { SHStack, SText } from '@components/core';
import { pagePaddingPx } from '@constants/constants';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
    useAudioRecorder,
    AudioModule,
    RecordingPresets,
    useAudioRecorderState,
    useAudioPlayer,
    useAudioPlayerStatus,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { Box, theme } from 'native-base';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, GestureResponderEvent } from 'react-native';
import { SLabel } from '../SLabel';
import { SNoContent } from '../SNoContent';

const SAudioRecorder = ({
    audios: savedRecordings = [],
    setAudios: setSavedRecordings,
}: {
    setAudios: (arg: string[]) => void;
    audios: string[];
}) => {
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(audioRecorder, 100);

    useEffect(() => {
        console.log('Recorder state changed:', {
            isRecording: recorderState.isRecording,
            durationMillis: recorderState.durationMillis,
        });
    }, [recorderState.isRecording, recorderState.durationMillis]);

    const startRecording = async () => {
        try {
            console.log('startRecording called');
            const { granted } = await AudioModule.requestRecordingPermissionsAsync();
            console.log('Permission granted:', granted);
            if (!granted) {
                Alert.alert('Permissão negada', 'Você precisa permitir o acesso ao microfone para gravar áudio.');
                return;
            }

            console.log('Setting audio mode...');
            await AudioModule.setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            console.log('Preparing to record...');
            await audioRecorder.prepareToRecordAsync();
            console.log('Starting recording...');
            audioRecorder.record();
            console.log('Recording started, isRecording:', audioRecorder.isRecording);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Erro', 'Falha ao iniciar gravação: ' + (err instanceof Error ? err.message : String(err)));
        }
    };

    const stopRecording = async () => {
        try {
            await audioRecorder.stop();
            const uri = audioRecorder.uri;
            if (uri) {
                setSavedRecordings([...savedRecordings, uri]);
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
        }
    };

    const deleteRecording = useCallback(
        async (uri: string) => {
            const action = async () => {
                try {
                    await FileSystem.deleteAsync(uri);
                    setSavedRecordings(savedRecordings.filter((recordingUri) => recordingUri !== uri));
                } catch (error) {
                    console.error(error);
                }
            };

            Alert.alert('Deletar Gravação', 'Você tem certeza que deseja deletar o aúdio?', [
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
        [savedRecordings, setSavedRecordings],
    );

    return (
        <View style={styles.container}>
            <SHStack mb={5} mt={8} width={'100%'} justifyContent={'space-between'} alignItems={'center'}>
                <SLabel mb={0}>Gravar Áudio</SLabel>
                <TouchableOpacity
                    style={styles.recordButton}
                    onPress={recorderState.isRecording ? stopRecording : startRecording}
                >
                    <SHStack space={2}>
                        {recorderState.isRecording && (
                            <SText color="white" textAlign={'left'}>
                                Gravando... {Math.floor(recorderState.durationMillis / 1000)} segundos
                            </SText>
                        )}
                        {recorderState.isRecording ? (
                            <Ionicons name={'stop-circle-outline'} size={20} color="white" />
                        ) : (
                            <FontAwesome name={'microphone'} size={18} color="white" />
                        )}
                    </SHStack>
                </TouchableOpacity>
            </SHStack>

            {!!savedRecordings.length && (
                <SavedRecordings recordings={savedRecordings} deleteRecording={deleteRecording} />
            )}
            {!savedRecordings.length && <SNoContent width={'100%'} my={'12px'} text="nenhuma gravação encontrada" />}
        </View>
    );
};

const SavedRecordings = ({
    recordings,
    deleteRecording,
}: {
    recordings: string[];
    deleteRecording: (uri: string) => Promise<void>;
}) => {
    return (
        <Box mt={-3} mb={3}>
            {recordings.map((recordingUri) => (
                <Recording recordingUri={recordingUri} deleteRecording={deleteRecording} key={recordingUri} />
            ))}
        </Box>
    );
};

const Recording = ({
    recordingUri,
    deleteRecording,
}: {
    recordingUri: string;
    deleteRecording: (uri: string) => Promise<void>;
}) => {
    const player = useAudioPlayer({ uri: recordingUri });
    const status = useAudioPlayerStatus(player);
    const [progress, setProgress] = useState<number>(0);
    const [currentPosition, setCurrentPosition] = useState('00:00');
    const [duration, setDuration] = useState('00:00');
    const progressBarRef = useRef<View>(null);

    const formatTime = (seconds: number) => {
        if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
            return '00:00';
        }
        const totalSeconds = Math.floor(Math.max(0, seconds));
        const minutes = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    useEffect(() => {
        try {
            if (status.duration && isFinite(status.duration) && status.duration > 0) {
                setDuration(formatTime(status.duration));
            }
        } catch (e) {
            // Ignore errors
        }
    }, [status.duration]);

    useEffect(() => {
        try {
            if (
                status.duration &&
                isFinite(status.duration) &&
                status.duration > 0 &&
                status.currentTime !== undefined &&
                isFinite(status.currentTime) &&
                status.currentTime >= 0
            ) {
                // Calculate progress as a value between 0 and 100 (native-base Progress expects 0-100)
                const progressValue = Math.min(100, Math.max(0, (status.currentTime / status.duration) * 100));

                // Round to avoid precision issues
                const roundedProgress = Math.round(progressValue * 100) / 100;

                if (isFinite(roundedProgress)) {
                    setProgress(roundedProgress);
                    setCurrentPosition(formatTime(status.currentTime));

                    if (roundedProgress >= 99.9 && status.playing) {
                        setCurrentPosition('00:00');
                        setProgress(0);
                    }
                }
            }
        } catch (e) {
            console.error('Error updating progress:', e);
        }
    }, [status.currentTime, status.duration, status.playing]);

    const playRecording = async () => {
        try {
            if (status.playing) {
                player.pause();
            } else {
                player.play();
            }
        } catch (error) {
            console.error('Error playing recording:', error);
        }
    };

    const handleProgressBarTouch = (event: GestureResponderEvent) => {
        try {
            if (!status.duration || !isFinite(status.duration) || status.duration <= 0) {
                return;
            }

            // Get the touch position relative to the progress bar
            progressBarRef.current?.measure((_x, _y, width, _height, pageX, _pageY) => {
                const touchX = event.nativeEvent.pageX - pageX;
                const percentage = Math.max(0, Math.min(1, touchX / width));
                const seekPosition = percentage * status.duration;

                if (isFinite(seekPosition) && seekPosition >= 0 && seekPosition <= status.duration) {
                    player.seekTo(seekPosition);

                    // Update UI immediately for better feedback
                    const newProgress = percentage * 100;
                    setProgress(newProgress);
                    setCurrentPosition(formatTime(seekPosition));
                }
            });
        } catch (error) {
            console.error('Error seeking audio:', error);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            try {
                if (player && status.playing) {
                    player.pause();
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        };
    }, [player, status.playing]);

    // Ensure progress is a safe value (0-100)
    const safeProgress = isFinite(progress) && progress >= 0 && progress <= 100 ? progress : 0;

    return (
        <View style={styles.recordingItem}>
            <TouchableOpacity onPress={playRecording}>
                <Ionicons name={status.playing ? 'pause-circle' : 'play-circle'} size={32} color="black" />
            </TouchableOpacity>
            {/* Custom progress bar with touch controls */}
            <TouchableOpacity style={styles.progressBarContainer} activeOpacity={0.8} onPress={handleProgressBarTouch}>
                <View ref={progressBarRef} style={styles.progressBarWrapper}>
                    <View style={[styles.progressBarFill, { width: `${safeProgress}%` }]} />
                </View>
            </TouchableOpacity>
            <Text style={styles.time}>
                {currentPosition} / {duration}
            </Text>
            <TouchableOpacity style={{ padding: 5, paddingLeft: 10 }} onPress={() => deleteRecording(recordingUri)}>
                <Ionicons name="trash" size={20} color="red" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        marginHorizontal: pagePaddingPx,
    },
    progressBar: {
        flex: 1,
        height: 4,
        marginHorizontal: 8,
    },
    progressBarContainer: {
        flex: 1,
        marginHorizontal: 8,
        paddingVertical: 8, // Increase touch area
    },
    progressBarWrapper: {
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
        overflow: 'hidden',
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary[500],
        borderRadius: 2,
    },
    recordButton: {
        backgroundColor: theme.colors.gray[400],
        borderRadius: 50,
        fontSize: 15,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    recordingItem: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
        width: '100%',
    },
    time: {
        fontSize: 12,
    },
});

export default SAudioRecorder;
