import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export type ISProgressBarProps = {
    progress: number;
};

export const SProgressBar = ({ progress }: ISProgressBarProps) => {
    const animation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animation, {
            toValue: progress,
            duration: 500,
            useNativeDriver: false,
        }).start();
    }, [animation, progress]);

    const width = animation.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.progressBar, { width }]}></Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#e0e0e0',
        borderRadius: 5,
        overflow: 'hidden',
        width: '100%',
    },
    progressBar: {
        alignItems: 'center',
        backgroundColor: '#44c293',
        borderRadius: 5,
        height: 15,
        justifyContent: 'center',
    },
});
