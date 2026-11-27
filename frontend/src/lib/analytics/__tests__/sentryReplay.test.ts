import { addIntegration, replayIntegration } from '@sentry/react';

import { addSentryReplay } from '../sentryReplay';

jest.mock('@sentry/react', () => ({
	addIntegration: jest.fn(),
	replayIntegration: jest.fn(),
}));

describe('addSentryReplay', () => {
	it('adds the replay integration with text and media unmasked', () => {
		const integration = { name: 'Replay' };
		jest
			.mocked(replayIntegration)
			.mockReturnValue(integration as ReturnType<typeof replayIntegration>);

		addSentryReplay();

		expect(replayIntegration).toHaveBeenCalledWith({
			maskAllText: false,
			blockAllMedia: false,
		});
		expect(addIntegration).toHaveBeenCalledWith(integration);
	});
});
