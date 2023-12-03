import { SScreenHeader } from '@components/organisms';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';
import * as React from 'react';

type PageProps = {
    navidateFn: () => void;
    onDelete?: () => Promise<void>;
};

export function HeaderTab({ onDelete, navidateFn }: PageProps) {
    const isEdit = useCharacterizationFormStore((state) => !!state.form?.id);
    const profileName = useCharacterizationFormStore((state) => !!state.form?.profileName);

    return (
        <SScreenHeader
            isAlert={true}
            title={(!isEdit ? 'Adicionar' : 'Editar') + (profileName ? ` (${profileName})` : '')}
            onDelete={isEdit ? onDelete : undefined}
            backButton
            navidateFn={navidateFn}
            mb={-2}
        />
    );
}
