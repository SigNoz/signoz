import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { expectEditableForm } from './__story_mockdata__/channelsEdit.play';
import { channelsEditMocks } from './ChannelsEdit.stories.mocks';

import AlertList from '../../index';

type ChannelsEditArgs = PageStoryArgs<typeof channelsEditMocks>;

const pageStory = storyMocks(channelsEditMocks, { layout: 'app' });

/**
 * One channel's settings, with the fields its type asks for and the test call the
 * form makes before saving.
 *
 * Route: `/alerts/channels/edit/:id`.
 */
const meta = {
	title: 'Pages/Alerts/Channels/Edit',
	tags: ['authz', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ChannelsEditArgs>;

export default meta;

/** The page loads the saved channel before it renders the form. */
const untilLoaded = { timeout: 15_000 };

type Story = StoryObj<ChannelsEditArgs>;

/**
 * A saved notification channel opened for editing: the name and the type are
 * fixed, and the integration's own settings are filled from what was stored.
 * The Channel type control swaps the integration, and typing into any field
 * unlocks Save.
 */
export const Default: Story = { play: expectEditableForm };

/** Mutation: clearing the required webhook URL surfaces the form's validation feedback. */
export const InvalidRequiredFields: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);
		const webhookUrl = await canvas.findByTestId(
			'webhook-url-textbox',
			undefined,
			untilLoaded,
		);

		await userEvent.clear(webhookUrl);
		await userEvent.click(
			await canvas.findByTestId('save-channel-button', undefined, untilLoaded),
		);
		await screen.findByText('Webhook URL is mandatory');
	},
};

/** Mutation: a failed test request keeps the edit form open and renders its error feedback. */
export const TestChannelFailure: Story = {
	args: { testOutcome: 'fails' },
	// The mocked test request intentionally fails; the resulting console error is
	// the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }): Promise<void> => {
		const test = await within(canvasElement).findByTestId(
			'test-channel-button',
			undefined,
			untilLoaded,
		);

		// the button is disabled while its permission check is in flight, so a
		// click any earlier lands on nothing. It signals that through
		// aria-disabled, which toBeEnabled does not read.
		await waitFor(
			() => expect(test).toHaveAttribute('aria-disabled', 'false'),
			untilLoaded,
		);
		await userEvent.click(test);

		await screen.findByText('Storybook forced channel failure');
	},
};

/** Mutation: a failed save leaves the saved channel editable and surfaces the request error. */
export const SaveFailure: Story = {
	args: { saveOutcome: 'fails' },
	// The mocked save request intentionally fails; the resulting console error is
	// the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		// Save is off until the form is edited, so the failure is reached through
		// a real change rather than an empty submit.
		await userEvent.type(
			await canvas.findByTestId('slack-channel-textbox', undefined, untilLoaded),
			'-edited',
		);
		await userEvent.click(canvas.getByTestId('save-channel-button'));

		await screen.findByText('Storybook forced channel failure');
	},
};

/**
 * The PagerDuty channel, whose form carries the routing key and the extra
 * details sent with the incident.
 */
export const PagerDuty: Story = {
	args: { channelType: 'pagerduty' },
	play: expectEditableForm,
};

/** The webhook channel, saved with basic auth on the outgoing request. */
export const Webhook: Story = {
	args: { channelType: 'webhook' },
	play: expectEditableForm,
};

/** The webhook channel saved with a bearer token: only the token field shows. */
export const WebhookBearerToken: Story = {
	args: { channelType: 'webhook', webhookAuth: 'bearer' },
	play: expectEditableForm,
};

/** The webhook channel saved without credentials: the auth option is None. */
export const WebhookWithoutAuth: Story = {
	args: { channelType: 'webhook', webhookAuth: 'none' },
	play: expectEditableForm,
};

/**
 * The Opsgenie channel, whose form carries the integration API key and the
 * priority the alert is raised at.
 */
export const Opsgenie: Story = {
	args: { channelType: 'opsgenie' },
	play: expectEditableForm,
};

/**
 * The email channel, whose only editable field is the comma-separated recipient
 * list: the form keeps the HTML body and the headers it was saved with.
 */
export const Email: Story = {
	args: { channelType: 'email' },
	play: expectEditableForm,
};

/**
 * The Microsoft Teams channel, stored under `msteamsv2_configs` and filled from
 * the channel's incoming webhook.
 */
export const MicrosoftTeams: Story = {
	args: { channelType: 'msteams' },
	play: expectEditableForm,
};

/** The Google Chat channel, filled from the space's incoming webhook. */
export const GoogleChat: Story = {
	args: { channelType: 'googlechat' },
	play: expectEditableForm,
};

/**
 * The Jira channel, which files an issue: the site and project it files into,
 * the transitions that resolve and reopen it, and the API token behind the
 * Atlassian account, which the form reads off the basic auth block.
 */
export const Jira: Story = {
	args: { channelType: 'jira' },
	play: async ({ canvasElement, args }): Promise<void> => {
		await expectEditableForm({ canvasElement, args });
		// the advanced fields have their own card now, so nothing has to be
		// expanded before they can be read
		await expect(
			await within(canvasElement).findByTestId(
				'jira-reopen-duration-textbox',
				undefined,
				{ timeout: 15_000 },
			),
		).toBeVisible();
	},
};

/**
 * A Jira channel saved against a self-hosted Jira: the form opens on the
 * Self-hosted option and shows the personal access token instead of the
 * Atlassian email and API token.
 */
export const JiraSelfHosted: Story = {
	args: { channelType: 'jira', jiraDeployment: 'selfhosted' },
	play: async ({ canvasElement, args }): Promise<void> => {
		await expectEditableForm({ canvasElement, args });
		const canvas = within(canvasElement);
		await expect(
			await canvas.findByTestId('jira-pat-textbox', undefined, {
				timeout: 15_000,
			}),
		).toHaveValue('story-jira-pat');
		await expect(
			canvas.queryByTestId('jira-email-textbox'),
		).not.toBeInTheDocument();
	},
};

/**
 * The Jira Service Management Ops channel, whose tags are stored as one
 * comma-separated string and come back as chips.
 */
export const JiraServiceManagementOps: Story = {
	args: { channelType: 'jsmops' },
	play: expectEditableForm,
};

/**
 * The incident.io channel, pointed at one alert source's events URL with the
 * token for it and the metadata merged over the alert's labels.
 */
export const IncidentIO: Story = {
	args: { channelType: 'incidentio' },
	play: expectEditableForm,
};

/** A Telegram channel, with its bot token masked behind the password field. */
export const Telegram: Story = {
	args: { channelType: 'telegram' },
	play: expectEditableForm,
};
