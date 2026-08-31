/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

export const TIMEZONES = ['browser', 'overridden'] as const;

export type TimezoneChoice = (typeof TIMEZONES)[number];

/** Far enough from any CI machine's zone that the override banner always shows. */
const OVERRIDE_TIMEZONE = 'Asia/Tokyo';

/**
 * `TimezoneProvider` seeds itself from localStorage on mount and never asks the
 * backend, so the override is module state rather than a response.
 */
export const seedTimezone = (choice: TimezoneChoice): void => {
	setLocalStorageKey(
		LOCALSTORAGE.PREFERRED_TIMEZONE,
		choice === 'overridden' ? OVERRIDE_TIMEZONE : '',
	);
};

export const updatedUserResponse = (): Record<string, unknown> => ({
	status: 'success',
	data: { id: 'some-user-id' },
});
