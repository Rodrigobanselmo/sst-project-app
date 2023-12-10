import { CharacterizationFormProps, RiskDataFormProps } from '@screens/Characterization/types';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type formDataProps =
    | Partial<CharacterizationFormProps>
    | ((data: CharacterizationFormProps) => CharacterizationFormProps);

interface CharacterizationFormState {
    form: CharacterizationFormProps;
    getCharacterizationId: () => string | undefined;
    getPrincipalProfileId: () => string | undefined;
    getIsPrincipalProfile: () => boolean;
    setWorkspaceId: (id: string) => void;
    setForm: (prop: formDataProps) => void;
    setDeleteRiskData: (riskId: string) => void;
    addFormRiskData: (data: RiskDataFormProps) => void;
    getIsRiskSelected: (riskId: string) => boolean;
}

export const useCharacterizationFormStore = create<CharacterizationFormState>()(
    immer((set, get) => ({
        form: { workspaceId: '' },
        getCharacterizationId: () => get()?.form?.id,
        getPrincipalProfileId: () => get()?.form.profileParentId || get()?.form.id,
        getIsPrincipalProfile: () => get()?.getPrincipalProfileId() == get()?.form.id,
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
        addFormRiskData: (data: RiskDataFormProps) =>
            set((state) => {
                state.form.riskData = state.form?.riskData || [];

                const riskData = state.form.riskData;
                const riskIndex = riskData.findIndex((rd) => rd.riskId === data.riskId);
                console.log('riskIndex', riskIndex, riskData);
                if (riskIndex >= 0) {
                    riskData[riskIndex] = data;
                } else {
                    riskData.push(data);
                }
            }),
        setDeleteRiskData: (riskId: string) =>
            set((state) => {
                const riskIndex = state.form?.riskData?.findIndex((rd) => rd.riskId === riskId);
                if (riskIndex && riskIndex >= 0) state.form.riskData?.splice(riskIndex, 1);
            }),
    })),
);
