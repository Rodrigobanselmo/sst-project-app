import { CharacterizationFormProps } from '@screens/Characterization/types';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type formDataProps =
    | Partial<CharacterizationFormProps>
    | ((data: CharacterizationFormProps) => CharacterizationFormProps);

interface CharacterizationFormState {
    form: CharacterizationFormProps;
    characterizationId: string | undefined;
    principalProfileId: string | undefined;
    isPrincipalProfile: boolean;
    setWorkspaceId: (id: string) => void;
    setForm: (prop: formDataProps) => void;
    setDeleteRiskData: (riskId: string) => void;
    getIsRiskSelected: (riskId: string) => boolean;
}

export const useCharacterizationFormStore = create<CharacterizationFormState>()(
    immer((set, get) => ({
        form: { workspaceId: '' },
        characterizationId: get()?.form.id,
        principalProfileId: get()?.form.profileParentId || get()?.form.id,
        isPrincipalProfile: get()?.principalProfileId == get()?.form.id,
        getIsRiskSelected: (riskId: string) => {
            return !!get()?.form?.riskData?.some((rd) => rd.riskId === riskId);
        },
        setWorkspaceId: (id) =>
            set((state) => {
                state.form = { workspaceId: id };
            }),
        setForm: (data) => {
            if (typeof data === 'object')
                set((state) => {
                    state.form = { ...state.form, ...data };
                });
            if (typeof data === 'function')
                set((state) => {
                    state.form = data(state.form);
                });
        },
        setDeleteRiskData: (riskId: string) =>
            set((state) => {
                const riskIndex = state.form?.riskData?.findIndex((rd) => rd.riskId === riskId);
                if (riskIndex && riskIndex >= 0) state.form.riskData?.splice(riskIndex, 1);
            }),
    })),
);
