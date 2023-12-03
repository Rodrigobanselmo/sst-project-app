import React from 'react';
import { CharacterizationFormProps } from '../../../types';
import SAudioRecorder from '@components/modelucules/SAudioRecording/SAudioRecording';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';

type FormProps = {
    onEdit: (form: Partial<CharacterizationFormProps>) => void;
};

export function AudioForm({ onEdit }: FormProps): React.ReactElement {
    const audios = useCharacterizationFormStore((state) => state.form?.audios);

    return (
        <SAudioRecorder
            audios={audios?.map((audio) => audio.uri) || []}
            setAudios={(audios) => onEdit({ audios: audios.map((audio) => ({ uri: audio })) })}
        />
    );
}
