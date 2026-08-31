import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { routingPoliciesMocks } from './RoutingPolicies.stories.mocks';
import { FIRST_POLICY_NAME } from './__story_mockdata__/routingPolicies';

import AlertList from '../index';

type RoutingPoliciesArgs = PageStoryArgs<typeof routingPoliciesMocks>;

const pageStory = storyMocks(routingPoliciesMocks);

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
	decorators: [withAppLayout],
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
