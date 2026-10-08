/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { handleInternalServerError } from 'mocks-server/utils';
import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { MockResolver } from '@/storybook/msw/types';

import {
	ACTIVE_ACCOUNT_MAX,
	createdServiceAccountKeyResponse,
	createdServiceAccountResponse,
	DELETED_ACCOUNT_MAX,
	KEY_MAX,
	SAVE_OUTCOMES,
	type SaveOutcome,
	serviceAccountDetailResponse,
	serviceAccountKeysResponse,
	serviceAccountSaveError,
	serviceAccountsResponse,
} from './__story_mockdata__/serviceAccounts';

import {
	MUTATION_OUTCOMES,
	type MutationOutcome,
	mutationResolver,
} from '../../stories/__story_mockdata__/mutationOutcome';
import {
	CUSTOM_ROLE_MAX,
	rolesListResponse,
} from '../../stories/__story_mockdata__/roles';

const LIST = 'Service accounts · list';
const KEYS = 'Service accounts · keys';
const DRAWER = 'Service accounts · drawer';

const rejectSave: MockResolver = (_req, res, ctx) =>
	res(ctx.status(500), ctx.json(serviceAccountSaveError()));

export const accountsLoadError = rest.get(
	'http://localhost/api/v1/service_accounts',
	handleInternalServerError,
);

export const keysLoadingForever = rest.get(
	'http://localhost/api/v1/service_accounts/:id/keys',
	(_req, res, ctx) => res(ctx.delay('infinite')),
);

export const serviceAccountsMocks = defineStoryMocks({
	controls: {
		accounts: countControl('Active accounts', {
			group: LIST,
			description: 'The table paginates past 20.',
			value: 5,
			max: ACTIVE_ACCOUNT_MAX,
		}),
		deleted: countControl('Deleted accounts', {
			group: LIST,
			value: 1,
			max: DELETED_ACCOUNT_MAX,
		}),
		roles: countControl('Assignable custom roles', {
			group: LIST,
			description:
				'Custom roles the drawer offers on top of the three managed ones.',
			value: 3,
			max: CUSTOM_ROLE_MAX,
		}),
		keys: countControl('API keys per account', {
			group: KEYS,
			description:
				'Keys listed on the drawer’s Keys tab, which paginates past 15. The first three are the never-expiring, the expired and the never-used one.',
			value: 4,
			max: KEY_MAX,
		}),
		saveOutcome: choiceControl<SaveOutcome>('Saving the account', {
			group: DRAWER,
			description:
				'Whether the rename behind Save Changes succeeds or comes back a failure the drawer offers to retry.',
			options: SAVE_OUTCOMES,
			value: 'succeeds',
		}),
		accountCreate: choiceControl<MutationOutcome>('Creating an account', {
			group: LIST,
			description:
				'How the POST behind "Create Service Account" answers. `success` raises the created toast, `loading` leaves the button spinning, `error` opens the error modal.',
			options: MUTATION_OUTCOMES,
			value: 'success',
		}),
		accountDelete: choiceControl<MutationOutcome>('Deleting an account', {
			group: DRAWER,
			description:
				'How the DELETE behind the confirmation answers. `success` raises the deleted toast, `loading` leaves the button spinning, `error` opens the error modal.',
			options: MUTATION_OUTCOMES,
			value: 'success',
		}),
		keyUpdate: choiceControl<MutationOutcome>('Updating a key', {
			group: KEYS,
			description:
				'How the PUT behind the key dialog’s Save Changes answers. `success` raises the updated toast, `loading` leaves the button spinning, `error` opens the error modal.',
			options: MUTATION_OUTCOMES,
			value: 'success',
		}),
		keyRevoke: choiceControl<MutationOutcome>('Revoking a key', {
			group: KEYS,
			description:
				'How the DELETE behind a key’s revoke confirmation answers. `success` raises the revoked toast, `loading` leaves the button spinning, `error` opens the error modal.',
			options: MUTATION_OUTCOMES,
			value: 'success',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/service_accounts',
			response.json(() =>
				serviceAccountsResponse(values.accounts, values.deleted),
			),
		),

		rest.post(
			'http://localhost/api/v1/service_accounts',
			mutationResolver(values.accountCreate, createdServiceAccountResponse()),
		),

		rest.get(
			'http://localhost/api/v1/service_accounts/:id/keys',
			response.json((req) =>
				serviceAccountKeysResponse(String(req.params.id), values.keys),
			),
		),

		rest.post(
			'http://localhost/api/v1/service_accounts/:id/keys',
			response.json(() => createdServiceAccountKeyResponse()),
		),

		rest.put(
			'http://localhost/api/v1/service_accounts/:id/keys/:fid',
			mutationResolver(values.keyUpdate),
		),

		rest.delete(
			'http://localhost/api/v1/service_accounts/:id/keys/:fid',
			mutationResolver(values.keyRevoke),
		),

		rest.get(
			'http://localhost/api/v1/service_accounts/:id',
			response.json((req) => {
				const id = String(req.params.id);
				const index = Number.parseInt(id.split('-').pop() ?? '0', 10);

				return serviceAccountDetailResponse(id, index >= values.accounts);
			}),
		),

		rest.put(
			'http://localhost/api/v1/service_accounts/:id',
			values.saveOutcome === 'fails'
				? rejectSave
				: response.json(() => ({ status: 'success', data: null })),
		),

		rest.delete(
			'http://localhost/api/v1/service_accounts/:id',
			mutationResolver(values.accountDelete),
		),

		rest.post(
			'http://localhost/api/v1/service_account_roles',
			response.json(() => ({
				status: 'success',
				data: { id: 'service-account-role-new' },
			})),
		),

		rest.delete(
			'http://localhost/api/v1/service_account_roles/:id',
			response.json(() => ({ status: 'success', data: null })),
		),

		rest.get(
			'http://localhost/api/v1/roles',
			response.json(() => rolesListResponse(values.roles)),
		),
	],
	config: () => ({ route: ROUTES.SERVICE_ACCOUNTS_SETTINGS }),
});
