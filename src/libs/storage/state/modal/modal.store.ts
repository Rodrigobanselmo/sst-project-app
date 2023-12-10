import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type IModalProps = {
    title: string;
    subtitle?: string;
    open: boolean;
    searchLabel?: string;
    isLoading?: boolean;
    onConfirm?: (value: string) => void;
    placeholder?: string;
    confirmButtonLabel?: string;
    cancelButtonLabel?: string;
};

type ISetModalProps = IModalProps | ((data: IModalProps) => IModalProps);
type ISetPatialModalProps = Partial<IModalProps> | ((data: IModalProps) => IModalProps);

interface modalState {
    modal: IModalProps;
    getIsOpen: () => boolean;
    onToggle: (open: boolean) => void;
    onClose: () => void;
    onOpen: () => void;
    setModal: (prop: ISetModalProps) => void;
    setPartialModal: (prop: ISetPatialModalProps) => void;
}

export const useModalStore = create<modalState>()(
    immer((set, get) => ({
        modal: { open: false, title: '' },
        getIsOpen: () => get()?.modal?.open,
        onToggle: (value) =>
            set((state) => {
                state.modal.open = value;
            }),
        onClose: () =>
            set((state) => {
                state.modal.open = false;
            }),
        onOpen: () =>
            set((state) => {
                state.modal.open = true;
            }),
        setModal: (data) => {
            if (typeof data === 'object')
                set((state) => {
                    state.modal = { ...state.modal, ...data };
                });
            if (typeof data === 'function')
                set((state) => {
                    state.modal = data(state.modal);
                });
        },
        setPartialModal: (data) => {
            if (typeof data === 'object')
                set((state) => {
                    state.modal = { ...state.modal, ...data };
                });
            if (typeof data === 'function')
                set((state) => {
                    state.modal = data(state.modal);
                });
        },
    })),
);
