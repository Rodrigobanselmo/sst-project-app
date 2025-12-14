import React from 'react';
import { CharacterizationFormProps } from '../../../types';
import SVideoRecorder from '@components/modelucules/SVideoRecorder/SVideoRecorder';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';

type FormProps = {
    onEdit: (form: Partial<CharacterizationFormProps>) => void;
    onDelete?: () => void;
};

export function VideoForm({ onEdit, onDelete }: FormProps): React.ReactElement {
    const videos = useCharacterizationFormStore((state) => state.form?.videos);

    return (
        <SVideoRecorder
            videos={videos?.map((video) => video.uri) || []}
            setVideos={(videos) => onEdit({ videos: videos.map((video) => ({ uri: video })) })}
            onDelete={onDelete}
        />
    );
}
