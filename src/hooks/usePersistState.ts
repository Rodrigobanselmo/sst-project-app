import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const usePersistedState = <T>(key: string, defaultValue: T) => {
    const [state, setState] = useState<T>(defaultValue);

    useEffect(() => {
        const fetchPersistedState = async () => {
            try {
                const storedState = await AsyncStorage.getItem(key);
                if (storedState !== null) {
                    setState(JSON.parse(storedState));
                }
            } catch (error) {
                console.error('Error fetching persisted state:', error);
            }
        };

        fetchPersistedState();
    }, [key]);

    const updateState = (newValue: T) => {
        setState(newValue);
        AsyncStorage.setItem(key, JSON.stringify(newValue)).catch((error) => {
            console.error('Error saving persisted state:', error);
        });
    };

    return [state, updateState] as const;
};
