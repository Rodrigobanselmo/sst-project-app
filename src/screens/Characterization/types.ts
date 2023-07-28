import { Orientation } from 'expo-screen-orientation';

export interface ICharImageGallery {
    uri: string;
    orientation: Orientation;
    name?: string;
}
export interface CharParamsProps {
    id?: number;
    images?: ICharImageGallery[];
}
