import { useModalStore } from '@libs/storage/state/modal/modal.store';
import { SProptModal } from './components/SProptModal';
import { SProgressModal } from './components/SProgressModal';

export function SModalProvider() {
    const modal = useModalStore((state) => state.modal);
    const onToggle = useModalStore((state) => state.onToggle);

    if (modal.type == 'progress') {
        // Calculate progress with safety checks to avoid precision errors
        const actual = modal.actual || 0;
        const total = modal.total || 1;
        const rawProgress = (actual / total) * 100;

        // Clamp and round to avoid precision issues
        const progress = Math.min(100, Math.max(0, Math.round(rawProgress * 100) / 100));

        return (
            <SProgressModal
                showModal={modal.open}
                onShowModal={onToggle}
                title={modal.title}
                bottomText={modal.bottomText}
                onCancel={modal.onCancel}
                progress={isFinite(progress) ? progress : 0}
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
