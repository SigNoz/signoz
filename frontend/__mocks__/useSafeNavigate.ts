// Mock for useSafeNavigate hook to avoid React Router version conflicts in tests
interface SafeNavigateOptions {
	replace?: boolean;
	state?: unknown;
}

interface SafeNavigateTo {
	pathname?: string;
	search?: string;
	hash?: string;
}

type SafeNavigateToType = string | SafeNavigateTo;

interface UseSafeNavigateReturn {
	safeNavigate: jest.MockedFunction<
		(to: SafeNavigateToType, options?: SafeNavigateOptions) => void
	>;
}

export const isEventObject = (
	arg: unknown,
): arg is
	| MouseEvent
	| KeyboardEvent
	| React.MouseEvent
	| React.KeyboardEvent => {
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

export const useSafeNavigate = (): UseSafeNavigateReturn => ({
	safeNavigate: jest.fn(
		(to: SafeNavigateToType, options?: SafeNavigateOptions) => {
			console.log(`Mock safeNavigate called with:`, to, options);
		},
	) as jest.MockedFunction<
		(to: SafeNavigateToType, options?: SafeNavigateOptions) => void
	>,
});
