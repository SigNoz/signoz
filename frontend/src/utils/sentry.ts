import type { Event } from '@sentry/react';

const VITE_ASSETS_PATH = '/assets/';

export function hasNoAppFrames(event: Event): boolean {
	const frames = (event.exception?.values ?? [])
		.flatMap((value) => value.stacktrace?.frames ?? [])
		.filter(
			(frame) => frame.filename && (frame.lineno != null || frame.colno != null),
		);

	return (
		frames.length > 0 &&
		!frames.some((frame) => frame.filename?.includes(VITE_ASSETS_PATH))
	);
}
