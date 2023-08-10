import { ISImageProps, SImage } from '@components/core';
import { ImageProps } from 'react-native';

interface UserPhotoProps extends ISImageProps {
    sizeBox: number;
}

export function SUserPhoto({ sizeBox, ...props }: UserPhotoProps) {
    return (
        <SImage
            w={sizeBox}
            h={sizeBox}
            rounded="full"
            borderWidth={2}
            borderColor="gray.400"
            alt="Imagem do usuário"
            {...props}
        />
    );
}
