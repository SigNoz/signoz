// Shared mock for `api/common/logEvent`.
// Wired into the runner's module aliases, so any import of
// `api/common/logEvent` in test code resolves to this file.
// Tests can import `logEventMock` to assert analytics calls — Jest's
// `clearMocks: true` resets call history between tests.

import type { Mock } from 'vitest';

export const logEventMock: Mock<
	(eventName: string, attributes?: Record<string, unknown>) => void
> = vi.fn();

export default logEventMock;
