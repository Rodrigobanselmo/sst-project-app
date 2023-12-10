import { useModalStore } from '@libs/storage/state/modal/modal.store';
import { SProptModal } from './components/SProptModal';

export function SModalProvider() {
    const modal = useModalStore((state) => state.modal);
    const onToggle = useModalStore((state) => state.onToggle);

    return (
        <SProptModal
            showModal={modal.open}
            debounceTime={300}
            subtitle={modal.subtitle}
            onShowModal={onToggle}
            placeholder={modal.placeholder}
            title={modal.title}
            onConfirm={modal.onConfirm}
            searchLabel={modal.searchLabel}
        />
    );
}
