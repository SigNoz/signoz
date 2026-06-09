// Shared mock for `api/common/logEvent`.
// Wired into jest.config.ts moduleNameMapper, so any import of
// `api/common/logEvent` in test code resolves to this file.
// Tests can import `logEventMock` to assert analytics calls — Jest's
// `clearMocks: true` resets call history between tests.

export const logEventMock: jest.MockedFunction<
	(eventName: string, attributes?: Record<string, unknown>) => void
> = jest.fn();

export default logEventMock;
