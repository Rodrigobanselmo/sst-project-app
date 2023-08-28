import AsyncStorage from '@react-native-async-storage/async-storage';
import { USER_STORAGE } from '../config';
import { IUser } from '@interfaces/IUser';

export const storageUserSave = async (user: IUser) => {
    try {
        await AsyncStorage.setItem(USER_STORAGE, JSON.stringify(user));
    } catch (error) {
        throw error;
    }
};

export const storageUserGet = async () => {
    try {
        const storage = await AsyncStorage.getItem(USER_STORAGE);
        const user: IUser = storage ? JSON.parse(storage) : {};
        return user;
    } catch (error) {
        throw error;
    }
};

export const storageUserRemove = async () => {
    try {
        await AsyncStorage.removeItem(USER_STORAGE);
    } catch (error) {
        throw error;
    }
};
