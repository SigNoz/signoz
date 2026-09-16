import { fn } from 'storybook/test';

/**
 * Replaces `api/common/logEvent` in Storybook (aliased in `.storybook/main.ts`)
 * so analytics never leave the iframe. Stories can assert on the calls:
 * `import logEvent from 'api/common/logEvent'` then `expect(logEvent)...`.
 *
 * The annotation checks the module's shape against the real one, so a change to
 * `logEvent`'s signature fails to compile here rather than at render.
 */
const libLogEvent: typeof import('api/common/logEvent') = {
	default: fn(async () => ({
		statusCode: 200 as const,
		error: null,
		message: 'success',
		payload: { status: 'success', data: '' },
	})).mockName('logEvent'),
};

export default libLogEvent.default;
