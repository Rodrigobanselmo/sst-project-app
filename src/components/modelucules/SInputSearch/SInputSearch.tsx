import { SInput, SInputProps } from '../SInput/SInput';

interface SInputSearchProps extends SInputProps {
    search?: string;
    onSearchChange: (search: string) => void;
}

export function SInputSearch({ search, onSearchChange, ...props }: SInputSearchProps) {
    return (
        <SInput
            inputProps={{
                placeholder: 'Pesquisar',
                onChangeText: onSearchChange,
                variant: 'normal',
                h: 10,

                ...(search && { value: search }),
            }}
            {...props}
        />
    );
}
