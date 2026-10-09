/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import { screen, userEvent, within } from 'storybook/test';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	ROUTING_POLICY_MAX,
	routingPoliciesResponse,
} from './__story_mockdata__/routingPolicies';

import {
	CHANNEL_MAX,
	channelNames,
	channelsResponse,
} from '../../stories/__story_mockdata__/alerts';
import { AlertListSubTabs, AlertListTabs } from '../../types';

const LIST = 'Routing policies · list';
const REQUEST = 'Routing policies · requests';

const REQUEST_STATES = ['loaded', 'error'] as const;
type RequestState = (typeof REQUEST_STATES)[number];

const MUTATION_STATES = ['success', 'error'] as const;
type MutationState = (typeof MUTATION_STATES)[number];

const MUTATION = 'Routing policies · mutations';

const mutationError = (
	message: string,
): { status: string; error: { code: string; message: string } } => ({
	status: 'error',
	error: { code: 'invalid_input', message },
});

export const routingPoliciesMocks = defineStoryMocks({
	controls: {
		policies: countControl('Routing policies', {
			group: LIST,
			description: 'The table paginates at five, so the cap is past that.',
			value: 4,
			max: ROUTING_POLICY_MAX,
		}),
		channels: countControl('Notification channels', {
			group: LIST,
			description:
				'The channels a policy can route to, and the ones its Channels row names.',
			value: 6,
			max: CHANNEL_MAX,
		}),
		policiesState: choiceControl<RequestState>('Policies request', {
			group: REQUEST,
			options: REQUEST_STATES,
			value: 'loaded',
		}),
		channelsState: choiceControl<RequestState>('Channels request', {
			group: REQUEST,
			options: REQUEST_STATES,
			value: 'loaded',
		}),
		createState: choiceControl<MutationState>('Create policy', {
			group: MUTATION,
			description:
				'How the POST behind "Save Routing Policy" answers. `error` raises the error toast.',
			options: MUTATION_STATES,
			value: 'success',
		}),
		updateState: choiceControl<MutationState>('Update policy', {
			group: MUTATION,
			description:
				'How the PUT behind "Save Routing Policy" answers when editing. `error` raises the error toast.',
			options: MUTATION_STATES,
			value: 'success',
		}),
		deleteState: choiceControl<MutationState>('Delete policy', {
			group: MUTATION,
			description:
				'How the DELETE behind the confirmation answers. `error` raises the error toast.',
			options: MUTATION_STATES,
			value: 'success',
		}),
	},
	handlers: (values, _response) => [
		rest.get('http://localhost/api/v1/route_policies', (_req, res, ctx) =>
			values.policiesState === 'error'
				? res(ctx.status(500), ctx.json({ status: 'error' }))
				: res(
						ctx.json(
							routingPoliciesResponse(values.policies, channelNames(values.channels)),
						),
					),
		),

		rest.post('http://localhost/api/v1/route_policies', (_req, res, ctx) =>
			values.createState === 'error'
				? res(
						ctx.status(400),
						ctx.json(mutationError('Policy name already exists')),
					)
				: res(ctx.status(201), ctx.json({ status: 'success', data: null })),
		),

		rest.put('http://localhost/api/v1/route_policies/:id', (_req, res, ctx) =>
			values.updateState === 'error'
				? res(ctx.status(500), ctx.json(mutationError('Could not update')))
				: res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),

		rest.delete('http://localhost/api/v1/route_policies/:id', (_req, res, ctx) =>
			values.deleteState === 'error'
				? res(ctx.status(500), ctx.json(mutationError('Could not delete')))
				: res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),

		rest.get('http://localhost/api/v1/channels', (_req, res, ctx) =>
			values.channelsState === 'error'
				? res(ctx.status(500), ctx.json({ status: 'error' }))
				: res(ctx.json(channelsResponse(values.channels))),
		),
	],
	config: () => ({
		route: `/alerts?tab=${AlertListTabs.CONFIGURATION}&subTab=${AlertListSubTabs.ROUTING_POLICIES}`,
	}),
});

/** The page fetches before it renders a row, which outlasts the 1s default. */
export const untilLoaded = { timeout: 15_000 };

export const fillNewPolicy = async (): Promise<void> => {
	await userEvent.type(
		await screen.findByPlaceholderText('e.g. Base routing policy...'),
		'Toast policy',
	);
	await userEvent.type(
		await screen.findByPlaceholderText(/e\.g\. service\.name/),
		'severity = "critical"',
	);
	await userEvent.click(await screen.findByRole('combobox'));
	await userEvent.click(await screen.findByTitle('ops-slack'));
	await userEvent.keyboard('{Escape}');
	await userEvent.click(
		await screen.findByRole('button', { name: 'Save Routing Policy' }),
	);
};

export const openEditPolicy = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	await userEvent.click(
		(
			await within(canvasElement).findAllByTestId(
				'edit-routing-policy',
				undefined,
				untilLoaded,
			)
		)[0],
	);
	await userEvent.click(
		await screen.findByRole('button', { name: 'Save Routing Policy' }),
	);
};
