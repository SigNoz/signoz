/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import type { CloudintegrationtypesUpdatableServiceDTO } from 'api/generated/services/sigNoz.schemas';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { MockResolver } from '@/storybook/msw/types';

import {
	ACCOUNT_CAP,
	accountResponse,
	accountsResponse,
	CLOUD_PROVIDERS,
	CLOUD_SERVICE_CAP,
	type CloudProvider,
	MUTATION_STATES,
	type MutationState,
	createdAccountResponse,
	BUILT_IN_INTEGRATION_NOT_FOUND,
	credentialsResponse,
	seedServiceSignals,
	serviceResponse,
	servicesMetadataResponse,
	setServiceSignals,
} from './__story_mockdata__/cloudIntegration';

/**
 * Answered whatever the Data control says, because it is not the page's data:
 * the request goes out and its failure is discarded either way.
 */
const builtInIntegrationNotFound: MockResolver = (_req, res, ctx) =>
	res(ctx.status(404), ctx.json(BUILT_IN_INTEGRATION_NOT_FOUND));

/**
 * Answers a mutation by the control's state: never, with a failure, or with the
 * success body the caller builds.
 */
const mutationResolver =
	(state: MutationState, ok: MockResolver): MockResolver =>
	(req, res, ctx, ...rest) => {
		if (state === 'loading') {
			return res(ctx.delay('infinite'));
		}

		return state === 'error'
			? res(
					ctx.status(500),
					ctx.json({
						status: 'error',
						error: { code: 'internal', message: 'Request failed' },
					}),
				)
			: ok(req, res, ctx, ...rest);
	};

const PROVIDER = 'Cloud integration · provider';
const MUTATIONS = 'Cloud integration · mutations';
const SERVICES = 'Cloud integration · services';

export const cloudIntegrationMocks = defineStoryMocks({
	controls: {
		provider: choiceControl<CloudProvider>('Provider', {
			group: PROVIDER,
			description:
				'The last segment of the pathname, so it decides which provider the page is for: its logo and copy, which setup flow Add New Account opens, and the account configuration the settings drawer edits.',
			options: CLOUD_PROVIDERS,
			value: 'aws',
		}),
		accounts: countControl('Connected accounts', {
			group: PROVIDER,
			description:
				'At 0 the hero offers Integrate Now and the service list is read-only: the page falls back to the provider catalogue and the collection switches are disabled.',
			value: 1,
			max: ACCOUNT_CAP,
		}),
		services: countControl('Services', {
			group: SERVICES,
			description:
				'Services the provider answers with. GCP ships six, so anything past that shows the same list.',
			value: 8,
			max: CLOUD_SERVICE_CAP,
		}),
		enabledServices: countControl('Enabled', {
			group: SERVICES,
			description:
				'How many of them have a signal switched on, taken from the top of the list. At 0 the sidebar says so and every service sits under Not Enabled.',
			value: 3,
			max: CLOUD_SERVICE_CAP,
		}),
		accountCreate: choiceControl<MutationState>('Account connection', {
			group: MUTATIONS,
			description:
				'How the POST behind the connect flow answers. AWS and Azure raise "Failed to create account connection" on `error` and the "account connected" toast on `success`, GCP raises its toast after the agent check-in and shows `error` inline. `loading` never answers.',
			options: MUTATION_STATES,
			value: 'success',
		}),
		accountUpdate: choiceControl<MutationState>('Account settings update', {
			group: MUTATIONS,
			description:
				'How the PUT behind Update Changes in the account settings drawer answers. `success` raises "Account settings updated successfully", `error` raises "Failed to update account settings".',
			options: MUTATION_STATES,
			value: 'success',
		}),
		serviceUpdate: choiceControl<MutationState>('Service config update', {
			group: MUTATIONS,
			description:
				'How the PUT behind Save on a service answers. `error` raises "Failed to update service config", `loading` leaves Save spinning.',
			options: MUTATION_STATES,
			value: 'success',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/integrations/:integrationId',
			builtInIntegrationNotFound,
		),

		rest.put(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts/:id/services/:serviceId',
			mutationResolver(values.serviceUpdate, async (req, res, ctx) => {
				const body = (await req.json()) as CloudintegrationtypesUpdatableServiceDTO;

				setServiceSignals(String(req.params.serviceId), body.config ?? {});

				return res(ctx.status(200), ctx.json({ status: 'success', data: null }));
			}),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts/:id/services/:serviceId',
			response.json((req) =>
				serviceResponse(values.provider, String(req.params.serviceId), true),
			),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts/:id/services',
			response.json(() =>
				servicesMetadataResponse(values.provider, values.services, true),
			),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/services/:serviceId',
			response.json((req) =>
				serviceResponse(values.provider, String(req.params.serviceId), false),
			),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/services',
			response.json(() =>
				servicesMetadataResponse(values.provider, values.services, false),
			),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/credentials',
			response.json(() => credentialsResponse()),
		),

		rest.post(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts/check_in',
			(_req, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),

		rest.post(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts',
			mutationResolver(values.accountCreate, (_req, res, ctx) =>
				res(ctx.status(201), ctx.json(createdAccountResponse(values.provider))),
			),
		),

		rest.put(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts/:id',
			mutationResolver(values.accountUpdate, (req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json(accountResponse(values.provider, String(req.params.id))),
				),
			),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts/:id',
			response.json((req) =>
				accountResponse(values.provider, String(req.params.id)),
			),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts',
			response.json(() => accountsResponse(values.provider, values.accounts)),
		),
	],
	config: (values) => ({
		route: `/integrations/${values.provider}`,
	}),
	effect: (values) => {
		seedServiceSignals(values.provider, values.services, values.enabledServices);
	},
});

/** The page picks its first service before it can render it. */
export const untilLoaded = { timeout: 20_000 };

export const expectToast = async (text: RegExp): Promise<void> => {
	await waitFor(() => expect(screen.getByText(text)).toBeVisible(), {
		timeout: 10_000,
	});
};

export const openConnectFlow = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByText(
			/integrate now/i,
			undefined,
			untilLoaded,
		),
	);
};

export const connectAwsAccount = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	await openConnectFlow(canvasElement);
	await userEvent.click(
		await screen.findByRole('combobox', undefined, untilLoaded),
	);
	await userEvent.click(await screen.findByText('US East (N. Virginia)'));
	await userEvent.click(
		await screen.findByRole('checkbox', { name: /us-east-1/i }),
	);
	await userEvent.click(
		await screen.findByRole('button', { name: /launch cloud formation/i }),
	);
};

export const connectAzureAccount = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	await openConnectFlow(canvasElement);
	const [region, resourceGroups] = await screen.findAllByRole(
		'combobox',
		undefined,
		untilLoaded,
	);

	await userEvent.click(region);
	await userEvent.click(
		await screen.findByText('Australia East (australiaeast)'),
	);
	await userEvent.type(resourceGroups, 'prod-platform-rg{Enter}');
	await userEvent.click(
		await screen.findByRole('button', { name: /generate azure setup commands/i }),
	);
};

export const connectGcpAccount = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	await openConnectFlow(canvasElement);
	await userEvent.type(
		await screen.findByTestId('gcp-account-name-input', undefined, untilLoaded),
		'acme-org',
	);
	await userEvent.type(
		screen.getByTestId('gcp-deployment-project-id-input'),
		'acme-deploy-123',
	);
	await userEvent.click(screen.getByTestId('gcp-deployment-region-select'));
	await userEvent.click(await screen.findByText('Mumbai (asia-south1)'));
	await userEvent.type(
		document.querySelector<HTMLElement>('#gcp-project-ids-select') as HTMLElement,
		'project-a,',
	);
	await userEvent.click(screen.getByTestId('gcp-connect-account-btn'));
};

const openEditAccount = async (canvasElement: HTMLElement): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByText(
			/edit account/i,
			undefined,
			untilLoaded,
		),
	);
	await screen.findByRole('dialog', undefined, untilLoaded);
};

export const updateAwsAccount = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	await openEditAccount(canvasElement);
	await userEvent.click(
		await screen.findByRole('checkbox', { name: /us-east-2/i }),
	);
	await userEvent.click(
		await screen.findByRole('button', { name: /update changes/i }),
	);
};

export const updateTaggedAccount = async (
	canvasElement: HTMLElement,
	tag: string,
): Promise<void> => {
	await openEditAccount(canvasElement);
	const dialog = await screen.findByRole('dialog');

	await userEvent.type(await within(dialog).findByRole('combobox'), tag);
	const option = await screen.findByText(tag, {
		selector: '.ant-select-item-option-content',
	});

	// The drawer disables pointer events outside itself, which the portalled popup is.
	await userEvent.click(option, { pointerEventsCheck: 0 });
	await userEvent.click(
		await screen.findByRole('button', { name: /update changes/i }),
	);
};
