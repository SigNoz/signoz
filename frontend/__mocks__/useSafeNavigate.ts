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

export const useSafeNavigate = (): UseSafeNavigateReturn => ({
	safeNavigate: jest.fn(
		(to: SafeNavigateToType, options?: SafeNavigateOptions) => {
			console.log(`Mock safeNavigate called with:`, to, options);
		},
	) as jest.MockedFunction<
		(to: SafeNavigateToType, options?: SafeNavigateOptions) => void
	>,
});
