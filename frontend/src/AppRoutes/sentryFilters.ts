import type { ErrorEvent } from '@sentry/react';
import { AxiosError, isAxiosError } from 'axios';

export const SENTRY_IGNORE_ERRORS = [
	// A tab that outlived a deploy requests hashed assets the new build no longer
	// has. `lazyRetry` recovers by reloading once, so this class is not worth
	// reporting. The stylesheet message is Vite's own; the module ones are the
	// same failure worded differently by Chromium, Firefox and Safari.
	/Unable to preload CSS for/,
	/Failed to fetch dynamically imported module/,
	/error loading dynamically imported module/,
	/Importing a module script failed/,
	// Thrown by the bundled posthog-js when its recorder script fails to load, so
	// its frames point at our own bundle and the URL check below misses it.
	/Called on script loaded before session recording is available/,
];

// Not UI bugs: 401/403 come from the session or role, ERR_NETWORK from a
// dropped connection or a closing tab.
export function isExpectedRequestFailure(error: unknown): boolean {
	if (!isAxiosError(error)) {
		return false;
	}
	const status = error.response?.status;
	return (
		error.code === AxiosError.ERR_NETWORK || status === 401 || status === 403
	);
}

const APP_ASSETS_PATH = '/assets/';

// Frames without a position are `[native code]`, which says nothing about the
// script that threw.
export function hasNoAppFrames(event: ErrorEvent): boolean {
	const frames = (event.exception?.values ?? [])
		.flatMap((exception) => exception.stacktrace?.frames ?? [])
		.filter(
			(frame) => frame.filename && (frame.lineno != null || frame.colno != null),
		);

	return (
		frames.length > 0 &&
		!frames.some((frame) => frame.filename?.includes(APP_ASSETS_PATH))
	);
}

// PostHog's lazy recorder, the Pylon widget and Appcues.
const EXTERNAL_SCRIPT_URLS = [
	/^https?:\/\/[^/]+\.posthog\.com\//,
	/^https?:\/\/(?:[^/]+\.)?usepylon\.com\//,
	/^https?:\/\/(?:[^/]+\.)?appcues\.(?:com|net)\//,
];

// Checks every frame, not only the top one: a failed fetch from the recorder
// tops out in Sentry's own fetch wrapper, which is bundled with the app.
export function isExternalIntegrationError(event: ErrorEvent): boolean {
	return (event.exception?.values ?? []).some((exception) =>
		(exception.stacktrace?.frames ?? []).some((frame) =>
			EXTERNAL_SCRIPT_URLS.some((url) => url.test(frame.filename ?? '')),
		),
	);
}
