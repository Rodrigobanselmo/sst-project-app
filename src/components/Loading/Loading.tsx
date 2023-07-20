import { Spinner, Center } from "native-base";

export function Loading() {
	return (
		<Center flex={1} bg="background.default">
			<Spinner color="primary.main" size={32} />
		</Center>
	);
}
