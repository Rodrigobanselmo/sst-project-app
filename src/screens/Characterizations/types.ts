import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppRoutesProps } from '@routes/app/AppRoutesProps';

export type CharacterizationsPageProps = NativeStackScreenProps<AppRoutesProps, 'characterizations'>;

export interface CharacterizationsProps {
    workspaceId: string;
}
