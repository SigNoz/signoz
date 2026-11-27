import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { routingPoliciesMocks } from './RoutingPolicies.stories.mocks';
import {
	createPolicy,
	deletePolicy,
	openDeleteConfirm,
	openFirstPolicy,
	openNewPolicy,
	searchWithNoResults,
	submitEmptyForm,
	updatePolicy,
} from './__story_mockdata__/routingPolicies.play';

import AlertList from '../../index';

type RoutingPoliciesArgs = PageStoryArgs<typeof routingPoliciesMocks>;

const pageStory = storyMocks(routingPoliciesMocks, { layout: 'app' });

/**
 * Policies that route a firing alert to channels by expression, in the order they
 * are evaluated. Gated on authz permissions for routing policies and the channels
 * they link.
 *
 * Route: `/alerts?tab=Configuration&subTab=routing-policies`.
 */
const meta = {
	title: 'Pages/Alerts/Routing Policies/Overview',
	tags: ['authz', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<RoutingPoliciesArgs>;

export default meta;

type Story = StoryObj<RoutingPoliciesArgs>;

/**
 * The rules that decide which channel an alert reaches, matched on the labels
 * the alert carries.
 */
export const Default: Story = {};

/** A workspace routing everything through the rule's own channels. */
export const NoPolicies: Story = {
	args: { policies: 0 },
};

/**
 * A viewer, who may list and read policies but not change them: New routing
 * policy is locked, and a row's Edit and Delete are locked in its menu.
 */
export const Viewer: Story = {
	args: {
		access: 'viewer',
		permissions: [
			'list:route-policy',
			'read:route-policy',
			'list:notification-channel',
			'read:notification-channel',
		],
	},
};

/** A policy opened from its row: the form prefilled with its expression and channels. */
export const EditPolicy: Story = {
	play: openFirstPolicy,
};

/** The form a policy is written in: the expression and the channels it routes to. */
export const NewPolicy: Story = {
	play: openNewPolicy,
};

/** The policy deletion confirmation, opened from the first row's real action. */
export const DeletePolicyConfirm: Story = {
	play: openDeleteConfirm,
};

/** A client-side search that has no matching routing policies. */
export const SearchNoResults: Story = {
	play: searchWithNoResults,
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
	play: openNewPolicy,
};

/** Native form validation after submitting an empty routing-policy form. */
export const FormValidationError: Story = {
	play: submitEmptyForm,
};

/** A new policy saved: the toast raised once the POST answers. */
export const CreatePolicyToast: Story = {
	play: createPolicy,
};

/** The POST failed: the error toast carries the server message. */
export const CreatePolicyErrorToast: Story = {
	args: { createState: 'error' },
	parameters: { allowConsoleErrors: true },
	play: createPolicy,
};

/** An existing policy saved unchanged from its edit form. */
export const UpdatePolicyToast: Story = {
	play: updatePolicy,
};

/** The PUT failed. */
export const UpdatePolicyErrorToast: Story = {
	args: { updateState: 'error' },
	parameters: { allowConsoleErrors: true },
	play: updatePolicy,
};

/** The first policy deleted from its confirmation. */
export const DeletePolicyToast: Story = {
	play: deletePolicy,
};

/** The DELETE failed. */
export const DeletePolicyErrorToast: Story = {
	args: { deleteState: 'error' },
	parameters: { allowConsoleErrors: true },
	play: deletePolicy,
};
