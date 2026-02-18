// Mock for useSafeNavigate hook to avoid React Router version conflicts in tests
interface SafeNavigateOptions {
	replace?: boolean;
	state?: unknown;
	newTab?: boolean;
	event?: MouseEvent | React.MouseEvent;
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

export const useSafeNavigate = (): UseSafeNavigateReturn => ({
	safeNavigate: jest.fn(
		(_to: SafeNavigateToType, _options?: SafeNavigateOptions) => {},
	) as jest.MockedFunction<
		(to: SafeNavigateToType, options?: SafeNavigateOptions) => void
	>,
});
