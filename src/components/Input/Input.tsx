import {
	Input as NativeBaseInput,
	IInputProps,
	FormControl
} from "native-base";

interface InputProps extends IInputProps {
	errorMessage?: string | null;
}

export function Input({
	errorMessage = null,
	isInvalid,
	...props
}: InputProps) {
	const invalid = !!errorMessage || isInvalid;

	return (
		<FormControl isInvalid={invalid} mb={4}>
			<NativeBaseInput
				bg="background.paper"
				h={12}
				px={4}
				borderWidth={0}
				fontSize="md"
				color="text.main"
				fontFamily="body"
				placeholderTextColor="text.placeholder"
				isInvalid={invalid}
				_invalid={{
					borderWidth: 1,
					borderColor: "status.error"
				}}
				_focus={{
					bg: "background.paper",
					borderWidth: 1,
					borderColor: "primary.main"
				}}
				{...props}
			/>

			<FormControl.ErrorMessage
				_text={{
					color: "status.error"
				}}
			>
				{errorMessage}
			</FormControl.ErrorMessage>
		</FormControl>
	);
}
