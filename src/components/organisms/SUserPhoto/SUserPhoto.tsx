import { Image } from '@components/core';

type IImageProps = React.ComponentProps<typeof Image>;

interface UserPhotoProps extends IImageProps {
    sizeBox: number;
}

export function SUserPhoto({ sizeBox, ...props }: UserPhotoProps) {
    return (
        <Image
            w={sizeBox}
            h={sizeBox}
            rounded="$full"
            borderWidth={2}
            borderColor="$gray400"
            alt="Imagem do usuário"
            {...props}
        />
    );
}
