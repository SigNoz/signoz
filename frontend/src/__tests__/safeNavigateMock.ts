// Shared mock for `hooks/useSafeNavigate`.
// Wired into jest.config.ts moduleNameMapper, so any import of
// `hooks/useSafeNavigate` in test code resolves to this file.
// Tests can import `safeNavigateMock` to assert navigation calls — Jest's
// `clearMocks: true` resets call history between tests.

interface SafeNavigateOptions {
	replace?: boolean;
	state?: unknown;
	newTab?: boolean;
}

interface SafeNavigateTo {
	pathname?: string;
	search?: string;
	hash?: string;
}

type SafeNavigateToType = string | SafeNavigateTo;

export const safeNavigateMock: jest.MockedFunction<
	(to: SafeNavigateToType, options?: SafeNavigateOptions) => void
> = jest.fn();

export const useSafeNavigate = (): {
	safeNavigate: typeof safeNavigateMock;
} => ({
	safeNavigate: safeNavigateMock,
});
