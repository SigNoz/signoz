import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { routingPoliciesMocks } from './RoutingPolicies.stories.mocks';
import { FIRST_POLICY_NAME } from './__story_mockdata__/routingPolicies';

import AlertList from '../../index';

type RoutingPoliciesArgs = PageStoryArgs<typeof routingPoliciesMocks>;

const pageStory = storyMocks(routingPoliciesMocks, { layout: 'app' });

/**
 * Policies that route a firing alert to channels by expression, in the order they
 * are evaluated.
 *
 * Route: `/alerts?tab=Configuration&subTab=RoutingPolicies`.
 */
const meta = {
	title: 'Pages/Alerts/Routing Policies',
	tags: ['role-gated', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<RoutingPoliciesArgs>;

export default meta;

type Story = StoryObj<RoutingPoliciesArgs>;

/** The page fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * The rules that decide which channel an alert reaches, matched on the labels
 * the alert carries.
 */
export const Default: Story = {};

/** A workspace routing everything through the rule's own channels. */
export const NoPolicies: Story = {
	args: { policies: 0 },
};

/** A viewer: the row actions and the New routing policy button are gone. */
export const Viewer: Story = {
	args: { access: 'viewer' },
};

/** A policy opened up: the expression it matches on and where it sends. */
export const Expanded: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await userEvent.click(
			await canvas.findByText(FIRST_POLICY_NAME, undefined, untilLoaded),
		);
		await canvas.findByText(/expression/i);
	},
};

/** The form a policy is written in: the expression and the channels it routes to. */
export const NewPolicy: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/new routing policy/i,
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText(/create routing policy/i);
	},
};

/** The policy deletion confirmation, opened from the first row's real action. */
export const DeletePolicyConfirm: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await userEvent.click(
			(
				await canvas.findAllByTestId(
					'delete-routing-policy',
					undefined,
					untilLoaded,
				)
			)[0],
		);
		// The modal titles itself and its confirm button the same.
		await screen.findByRole('button', { name: 'Delete Routing Policy' });
	},
};

/** A client-side search that has no matching routing policies. */
export const SearchNoResults: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);
		const search = await canvas.findByPlaceholderText(
			'Search for a routing policy...',
			undefined,
			untilLoaded,
		);

		await userEvent.type(search, 'no matching policy');
		await canvas.findByText('No matching routing policies found.');
	},
};

/** The list request failed while the rest of the alerts shell remains available. */
export const LoadError: Story = {
	args: { policiesState: 'error' },
	// The mocked policies request intentionally fails; the resulting console error
	// is the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
};

/** The create form with its notification-channel request failed. */
export const ChannelsLoadError: Story = {
	args: { channelsState: 'error' },
	// The mocked channels request intentionally fails; the resulting console error
	// is the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: NewPolicy.play,
};

/** Native form validation after submitting an empty routing-policy form. */
export const FormValidationError: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await NewPolicy.play?.({ canvasElement } as never);
		await userEvent.click(
			await screen.findByRole('button', { name: 'Save Routing Policy' }),
		);
		await screen.findByText('Please provide a name for the routing policy');
	},
};

const fillNewPolicy = async (): Promise<void> => {
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

const openEditPolicy = async (canvasElement: HTMLElement): Promise<void> => {
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

const confirmDelete = async (canvasElement: HTMLElement): Promise<void> => {
	await DeletePolicyConfirm.play?.({ canvasElement } as never);
	await userEvent.click(
		await screen.findByRole('button', { name: 'Delete Routing Policy' }),
	);
};

/** A new policy saved: the toast raised once the POST answers. */
export const CreatePolicyToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await NewPolicy.play?.({ canvasElement } as never);
		await fillNewPolicy();
		if (args.createState === 'success') {
			await waitFor(() =>
				expect(
					screen.getByText(/routing policy created successfully/i),
				).toBeVisible(),
			);
		}
	},
};

/** The POST failed: the error toast carries the server message. */
export const CreatePolicyErrorToast: Story = {
	args: { createState: 'error' },
	parameters: { allowConsoleErrors: true },
	play: CreatePolicyToast.play,
};

/** An existing policy saved unchanged from its edit form. */
export const UpdatePolicyToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await openEditPolicy(canvasElement);
		if (args.updateState === 'success') {
			await waitFor(() =>
				expect(
					screen.getByText(/routing policy updated successfully/i),
				).toBeVisible(),
			);
		}
	},
};

/** The PUT failed. */
export const UpdatePolicyErrorToast: Story = {
	args: { updateState: 'error' },
	parameters: { allowConsoleErrors: true },
	play: UpdatePolicyToast.play,
};

/** The first policy deleted from its confirmation. */
export const DeletePolicyToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await confirmDelete(canvasElement);
		if (args.deleteState === 'success') {
			await waitFor(() =>
				expect(
					screen.getByText(/routing policy deleted successfully/i),
				).toBeVisible(),
			);
		}
	},
};

/** The DELETE failed. */
export const DeletePolicyErrorToast: Story = {
	args: { deleteState: 'error' },
	parameters: { allowConsoleErrors: true },
	play: DeletePolicyToast.play,
};
