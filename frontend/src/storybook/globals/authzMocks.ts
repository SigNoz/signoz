import { rest } from 'msw';
import type { AuthtypesTransactionDTO } from 'api/generated/services/sigNoz.schemas';
import { clearAllAuthZDevOverrides } from 'lib/authz/devtools/useAuthZDevStore';
import {
	AUTHZ_CHECK_URL,
	authzMockResponse,
} from 'lib/authz/utils/authz-test-utils';

import {
	accessFor,
	ACCESS_PRESETS,
	type AccessPreset,
	PERMISSION_OPTIONS,
} from '../access/access';
import { choiceControl, multiChoiceControl } from '../controls/controls';
import { defineStoryMocks } from '../controls/defineStoryMocks';
import type { StoryMockArgs } from '../controls/types';
import {
	respondWith,
	RESPONSE_STATES,
	type ResponseState,
} from '../runtime/responseState';

const ACCESS = 'Access';

/**
 * Every permission check a story makes, answered from the controls panel rather
 * than from a role. `POST /api/v1/authz/check` is the single gate the app reads:
 * route guards, `AuthZGuard`, `AuthZButton` and `user.role` all resolve through
 * it, and `access/access.ts` decides what the grant allows.
 */
export const authzMocks = defineStoryMocks({
	controls: {
		access: choiceControl<AccessPreset>('Access', {
			group: ACCESS,
			description:
				'Base permission set the check endpoint answers with. `custom` starts from nothing, so only the list below counts; `dev-tools` grants an admin set and leaves the AuthZ dev modal (⌘K) in charge. Granting no legacy role lands on `ANONYMOUS`, which the role-based checks still treat as "not a viewer".',
			options: ACCESS_PRESETS,
			value: 'admin',
		}),
		permissions: multiChoiceControl('Permissions', {
			group: ACCESS,
			description:
				'Granted on top of the preset, as `relation:kind`. A selector-scoped check matches its kind. With Access on `custom` this is the whole list.',
			options: PERMISSION_OPTIONS,
			value: [],
		}),
		authzState: choiceControl<ResponseState>('Check state', {
			group: ACCESS,
			description:
				'How `authz/check` answers, the way the dev modal can force it.',
			options: RESPONSE_STATES,
			value: 'loaded',
		}),
	},
	handlers: ({ access, permissions, authzState }) => {
		const granted = accessFor(access, permissions);

		return [
			rest.post(
				AUTHZ_CHECK_URL,
				respondWith(authzState, async (req) => {
					const payload = (await req.json()) as AuthtypesTransactionDTO[];

					return authzMockResponse(
						payload,
						payload.map((transaction) => granted.allows(transaction)),
					);
				}),
			),
		];
	},
	role: ({ access, permissions }) => accessFor(access, permissions).legacyRole,
	// Overrides persist in localStorage, so a leftover one from a real dev session
	// would silently answer for the controls panel.
	effect: ({ access }) => {
		if (access !== 'dev-tools') {
			clearAllAuthZDevOverrides();
		}
	},
});

export type AuthzArgs = StoryMockArgs<typeof authzMocks>;
