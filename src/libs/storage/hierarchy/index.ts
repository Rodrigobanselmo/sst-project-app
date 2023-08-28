import { IHierarchy } from '@interfaces/IHierarchy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HIERARCHY_STORAGE } from '../config';

export const storageHierarchySave = async (hierarchies: IHierarchy[]) => {
    try {
        await AsyncStorage.setItem(HIERARCHY_STORAGE, JSON.stringify(hierarchies));
    } catch (error) {
        throw error;
    }
};

export const storageHierarchyGet = async () => {
    try {
        const storage = await AsyncStorage.getItem(HIERARCHY_STORAGE);
        const hierarchies: IHierarchy[] = storage ? JSON.parse(storage) : {};
        return hierarchies;
    } catch (error) {
        throw error;
    }
};

export const storageHierarchyRemove = async () => {
    try {
        await AsyncStorage.removeItem(HIERARCHY_STORAGE);
    } catch (error) {
        throw error;
    }
};
