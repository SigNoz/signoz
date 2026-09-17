// Shared mock for `hooks/useSafeNavigate`.
// Wired into the runner's module aliases, so any import of
// `hooks/useSafeNavigate` in test code resolves to this file.
// Tests can import `safeNavigateMock` to assert navigation calls — Jest's
// `clearMocks: true` resets call history between tests.

import type { Mock } from 'vitest';

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

export const safeNavigateMock: Mock<
	(to: SafeNavigateToType, options?: SafeNavigateOptions) => void
> = vi.fn();

export const useSafeNavigate = (): {
	safeNavigate: typeof safeNavigateMock;
} => ({
	safeNavigate: safeNavigateMock,
});
