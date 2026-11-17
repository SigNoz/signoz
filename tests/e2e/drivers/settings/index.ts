import { withAuthFlows } from '../auth-flows';
import { guestDriver, kit, type Layer } from '../kit';

import { settingsDriver, withSettings, type Settings } from './driver';
import {
	withActiveEditor,
	withCustomRoleSeed,
	withPendingMember,
	withServiceAccountSeed,
} from './seeds';

/** The settings pages bound to the logged-out `guestPage`, for a signed-in member. */
const withGuestSettings: Layer<{ guestSettings: Settings }> = guestDriver(
	'guestSettings',
	({ page }) => settingsDriver(page),
);

/**
 * The settings `test`. Seeds are test-scoped and lazy: a spec pays only for the
 * ones it destructures. `authFlows` drives a guest context, for the flows that
 * end in signing in as someone else.
 */
export const test = withAuthFlows(
	withSettings(
		withGuestSettings(
			withActiveEditor(
				withPendingMember(withServiceAccountSeed(withCustomRoleSeed(kit))),
			),
		),
	),
);

export { ADMIN, expect } from '../kit';
export { E2E_PASSWORD } from '../users';
export * from './driver';
export * from './seeds';
