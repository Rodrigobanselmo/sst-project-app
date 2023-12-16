import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps, AppRoutesProps } from '@routes/app/AppRoutesProps';
import { SHeader } from './SHeader';

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    subtitleComponent?: any;
    navidateArgs?: [keyof AppRoutesProps, any];
    backButton?: boolean;
    isAlert?: boolean;
    mb?: any;
    onDelete?: () => void;
    navidateFn?: () => void;
}

export function SScreenHeader({
    title,
    navidateFn,
    navidateArgs,
    backButton,
    isAlert,
    onDelete,
    mb,
    subtitle,
    subtitleComponent,
}: ScreenHeaderProps) {
    const { goBack, navigate } = useNavigation<AppNavigatorRoutesProps>();

    const handleGoBack = () => {
        if (navidateArgs) {
            navigate(...navidateArgs), {};
        } else if (navidateFn) {
            navidateFn();
        } else {
            goBack();
        }
    };

    return (
        <SHeader
            title={title}
            subtitle={subtitle}
            subtitleComponent={subtitleComponent}
            backButton={backButton}
            isAlert={isAlert}
            onDelete={onDelete}
            mb={mb}
            navidateFn={handleGoBack}
        />
    );
}
