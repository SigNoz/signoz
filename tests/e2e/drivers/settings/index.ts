import { withAuthFlows } from '../auth-flows';
import { kit } from '../kit';

import { withSettings } from './driver';
import {
	withActiveEditor,
	withCustomRoleSeed,
	withPendingMember,
	withServiceAccountSeed,
} from './seeds';

/**
 * The settings `test`. Seeds are test-scoped and lazy: a spec pays only for the
 * ones it destructures. `authFlows` drives a guest context, for the flows that
 * end in signing in as someone else.
 */
export const test = withAuthFlows(
	withSettings(
		withActiveEditor(
			withPendingMember(withServiceAccountSeed(withCustomRoleSeed(kit))),
		),
	),
);

export { ADMIN, expect } from '../kit';
export { E2E_PASSWORD } from '../users';
export * from './driver';
export * from './seeds';
