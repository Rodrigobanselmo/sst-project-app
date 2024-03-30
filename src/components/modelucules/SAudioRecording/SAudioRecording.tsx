import { SHStack, SText } from '@components/core';
import { pagePaddingPx } from '@constants/constants';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Box, Progress, theme } from 'native-base';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SLabel } from '../SLabel';
import { SNoContent } from '../SNoContent';
import uuidGenerator from 'react-native-uuid';

const SAudioRecorder = ({
    audios: savedRecordings = [],
    setAudios: setSavedRecordings,
}: {
    setAudios: (arg: string[]) => void;
    audios: string[];
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [duration, setDuration] = useState<Audio.RecordingStatus['durationMillis'] | null>(null);

    useEffect(() => {
        if (recording) {
            recording.setOnRecordingStatusUpdate((status) => setDuration(status.durationMillis));
        }
    }, [recording]);

    const startRecording = async () => {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });
            const recording = new Audio.Recording();
            await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HighQuality);
            recording.setOnRecordingStatusUpdate((status) => setDuration(status.durationMillis));
            await recording.startAsync();
            setRecording(recording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        if (uri) setSavedRecordings([...savedRecordings, uri]);
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

    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync();
            }
        };
    }, [recording]);

    return (
        <View style={styles.container}>
            <SHStack mb={5} mt={8} width={'100%'} justifyContent={'space-between'} alignItems={'center'}>
                <SLabel mb={0}>Gravar Áudio</SLabel>
                <TouchableOpacity style={styles.recordButton} onPress={isRecording ? stopRecording : startRecording}>
                    <SHStack space={2}>
                        {isRecording && (
                            <SText color="white" textAlign={'left'}>
                                Gravando... {Math.floor((duration || 0) / 1000)} segundos
                            </SText>
                        )}
                        {isRecording ? (
                            <Ionicons name="ios-stop-circle-outline" size={20} color="white" />
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
    const [soundObject, setSoundObject] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentPosition, setCurrentPosition] = useState('00:00');
    const [duration, setDuration] = useState('00:00');

    const formatTime = (milliseconds: number) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const playRecording = async (uri: string) => {
        if (soundObject) {
            const status = await soundObject.getStatusAsync();
            if (status.isLoaded) {
                if (status.isPlaying) {
                    soundObject.pauseAsync();
                    setIsPlaying(false);
                } else {
                    soundObject.playAsync();
                    setIsPlaying(true);
                }
            }
        } else {
            const newSoundObject = new Audio.Sound();
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                });

                await newSoundObject.loadAsync({ uri });
                await newSoundObject.playAsync();
                setSoundObject(newSoundObject);
                setIsPlaying(true);

                newSoundObject.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded) {
                        const progress = status.durationMillis ? status.positionMillis / status.durationMillis : 0;
                        setProgress(progress * 100);
                        setCurrentPosition(formatTime(status.positionMillis));
                        setDuration(formatTime(status.durationMillis || 0));

                        if (progress === 1) {
                            setCurrentPosition('00:00');
                            setIsPlaying(false);
                            setSoundObject(null);
                            setProgress(0);
                        }
                    }
                });
            } catch (error) {
                console.error(error);
            }
        }
    };

    useEffect(() => {
        const first = async () => {
            const newSoundObject = new Audio.Sound();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            await newSoundObject.loadAsync({ uri: recordingUri });
            const status = await newSoundObject.getStatusAsync();

            if (status.isLoaded) {
                if (status.durationMillis) setDuration(formatTime(status.durationMillis));
            }
        };
        first();
    }, [recordingUri]);

    return (
        <View style={styles.recordingItem}>
            <TouchableOpacity onPress={() => playRecording(recordingUri)}>
                <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={32} color="black" />
            </TouchableOpacity>
            <Progress value={progress} style={styles.progressBar} />
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
