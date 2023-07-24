import { Button as ButtonNativeBase, IButtonProps, Text } from "native-base";

interface ButtonProps extends IButtonProps {
	title: string;
	variant?: "solid" | "outline";
}

export function Button({ title, variant = "solid", ...props }: ButtonProps) {
	return (
		<ButtonNativeBase
			w="full"
			h={12}
			bg={variant === "outline" ? "transparent" : "primary.main"}
			borderWidth={variant === "outline" ? 1 : 0}
			borderColor={"primary.main"}
			rounded="sm"
			_pressed={{
				bg: variant === "outline" ? "gray.50" : "primary.light"
			}}
			{...props}
		>
			<Text
				color={variant === "outline" ? "primary.main" : "white"}
				fontFamily="heading"
				fontSize="sm"
			>
				{title}
			</Text>
		</ButtonNativeBase>
	);
}
