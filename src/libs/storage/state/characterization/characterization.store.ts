import { CharacterizationFormProps, RiskDataFormProps } from '@screens/Characterization/types';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type formDataProps =
    | Partial<CharacterizationFormProps>
    | ((data: CharacterizationFormProps) => CharacterizationFormProps);

interface CharacterizationFormState {
    form: CharacterizationFormProps;
    selectedRiskId: string;
    getSelectedRiskData: () => RiskDataFormProps;
    getCharacterizationId: () => string | undefined;
    getPrincipalProfileId: () => string | undefined;
    getIsPrincipalProfile: () => boolean;
    setSelectedRiskDataId: (id: string) => void;
    setWorkspaceId: (id: string) => void;
    setForm: (prop: formDataProps) => void;
    setDeleteRiskData: (riskId: string) => void;
    addFormRiskData: (data: RiskDataFormProps) => void;
    setRiskDataForm: (data: Partial<RiskDataFormProps>) => void;
    getIsRiskSelected: (riskId: string) => boolean;
}

export const useCharacterizationFormStore = create<CharacterizationFormState>()(
    immer((set, get) => ({
        form: { workspaceId: '' },
        selectedRiskId: '',
        getSelectedRiskData: () => {
            return (
                get()?.form?.riskData?.find((riskData) => {
                    return riskData.riskId == get()?.selectedRiskId;
                }) || ({} as RiskDataFormProps)
            );
        },
        getCharacterizationId: () => get()?.form?.id,
        getPrincipalProfileId: () => get()?.form.profileParentId || get()?.form.id,
        getIsPrincipalProfile: () => get()?.getPrincipalProfileId() == get()?.form.id,
        getIsRiskSelected: (riskId: string) => {
            return !!get()?.form?.riskData?.some((rd) => rd.riskId === riskId);
        },
        setSelectedRiskDataId: (id) =>
            set((state) => {
                state.selectedRiskId = id;
            }),
        setWorkspaceId: (id) =>
            set((state) => {
                state.form = { workspaceId: id };
            }),
        setRiskDataForm: (data) => {
            set((state) => {
                const riskId = get()?.selectedRiskId;
                if (riskId) {
                    const index = state?.form?.riskData?.findIndex((riskData) => {
                        riskData.riskId == riskId;
                    });

                    if (index && index >= 0 && state?.form?.riskData?.[index]) {
                        state.form.riskData[index] = { ...state.form.riskData[index], ...data };
                    } else {
                        if (!state?.form?.riskData) state.form.riskData = [];
                        state.form.riskData.push({ ...data, riskId });
                    }
                }
            });
        },
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
                const riskIndex = state.form.riskData.findIndex((rd) => rd.riskId === data.riskId);

                if (riskIndex >= 0) {
                    state.form.riskData[riskIndex] = data;
                } else {
                    state.form.riskData = [...state.form.riskData, data];
                }
            }),
        setDeleteRiskData: (riskId: string) =>
            set((state) => {
                const riskIndex = state.form?.riskData?.findIndex((rd) => rd.riskId === riskId);
                if (riskIndex && riskIndex >= 0) state.form.riskData?.splice(riskIndex, 1);
            }),
    })),
);
