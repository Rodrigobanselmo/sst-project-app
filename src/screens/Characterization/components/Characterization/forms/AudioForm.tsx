import React from 'react';
import { CharacterizationFormProps } from '../../../types';
import SAudioRecorder from '@components/modelucules/SAudioRecording/SAudioRecording';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';

type FormProps = {
    onEdit: (form: Partial<CharacterizationFormProps>) => void;
    onRecordingStateChange?: (isRecording: boolean) => void;
    onDelete?: () => void;
};

export function AudioForm({ onEdit, onRecordingStateChange, onDelete }: FormProps): React.ReactElement {
    const audios = useCharacterizationFormStore((state) => state.form?.audios);

    return (
        <SAudioRecorder
            audios={audios?.map((audio) => audio.uri) || []}
            setAudios={(audios) => onEdit({ audios: audios.map((audio) => ({ uri: audio })) })}
            onRecordingStateChange={onRecordingStateChange}
            onDelete={onDelete}
        />
    );
}
