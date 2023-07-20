import { IImageProps, Image } from 'native-base'

interface UserPhotoProps extends IImageProps {
	size: number
}

export function UserPhoto({ size, ...props }: UserPhotoProps) {
	return (
		<Image
			w={size}
			h={size}
			rounded="full"
			borderWidth={2}
			borderColor="gray.400"
			alt="Imagem do usuário"
			{...props}
		/>
	)
}
