import { addIntegration, replayIntegration } from '@sentry/react';

export function addSentryReplay(): void {
	addIntegration(
		replayIntegration({
			maskAllText: false,
			blockAllMedia: false,
		}),
	);
}
