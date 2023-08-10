import { ISTextProps, SText } from '@components/core';

export function SLabel({ children, ...props }: ISTextProps) {
    return (
        <SText mb={3} color={'text.label'} fontSize="lg" {...props}>
            {children}
        </SText>
    );
}
