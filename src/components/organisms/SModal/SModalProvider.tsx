import { useModalStore } from '@libs/storage/state/modal/modal.store';
import { SProptModal } from './components/SProptModal';
import { SProgressModal } from './components/SProgressModal';

export function SModalProvider() {
    const modal = useModalStore((state) => state.modal);
    const onToggle = useModalStore((state) => state.onToggle);

    if (modal.type == 'progress') {
        const progress = ((modal.actual || 0) / (modal.total || 1)) * 100;

        return (
            <SProgressModal
                showModal={modal.open}
                onShowModal={onToggle}
                title={modal.title}
                bottomText={modal.bottomText}
                onCancel={modal.onCancel}
                progress={progress}
            />
        );
    }

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
