// Event types that have metaKey/ctrlKey properties
type EventWithModifiers =
	| MouseEvent
	| KeyboardEvent
	| React.MouseEvent<any, MouseEvent>
	| React.KeyboardEvent<any>;

// Helper function to determine if an argument is an event - Also used in utils/history.ts
export const isEventObject = (arg: unknown): arg is EventWithModifiers => {
	if (!arg || typeof arg !== 'object') return false;

	return (
		arg instanceof MouseEvent ||
		arg instanceof KeyboardEvent ||
		('nativeEvent' in arg &&
			(arg.nativeEvent instanceof MouseEvent ||
				arg.nativeEvent instanceof KeyboardEvent)) ||
		'metaKey' in arg ||
		'ctrlKey' in arg
	);
};
