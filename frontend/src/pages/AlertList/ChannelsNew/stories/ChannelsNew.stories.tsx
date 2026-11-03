import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { channelsNewMocks } from './ChannelsNew.stories.mocks';

import AlertList from '../../index';

type ChannelsNewArgs = PageStoryArgs<typeof channelsNewMocks>;

const pageStory = storyMocks(channelsNewMocks, { layout: 'app' });

/**
 * The new channel form: pick a type, fill its fields, test it, save.
 *
 * Route: `/alerts/channels/new`.
 */
const meta = {
	title: 'Pages/Alerts/Channels/New',
	tags: ['authz', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ChannelsNewArgs>;

export default meta;

type Story = StoryObj<ChannelsNewArgs>;

const selectChannelType = async (
	canvasElement: HTMLElement,
	label: RegExp,
): Promise<void> => {
	const trigger = await within(canvasElement).findByTestId(
		'channel-type-select',
	);

	await userEvent.click(trigger);
	await userEvent.click(await screen.findByRole('option', { name: label }));
	await within(trigger).findByText(label);
};

const fillName = async (
	canvasElement: HTMLElement,
	name: string,
): Promise<void> => {
	await userEvent.type(
		await within(canvasElement).findByTestId('channel-name-textbox'),
		name,
	);
};

const sendTest = async (canvasElement: HTMLElement): Promise<void> => {
	const test = within(canvasElement).getByTestId('test-channel-button');

	await waitFor(() => expect(test).toHaveAttribute('aria-disabled', 'false'));
	await userEvent.click(test);
	await screen.findByText('An alert has been sent to this channel');
};

/** A new notification channel, on the Slack form the page opens with. */
export const Default: Story = {};

/** Interaction: the channel-type Select opens its real portal-backed option list. */
export const ChannelTypeSelectOpen: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId('channel-type-select'),
		);
		await screen.findByRole('listbox');
	},
};

/** Mutation: saving without a channel name shows the form's required-field feedback. */
export const InvalidRequiredFields: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		// Save stays off until the form is touched, so filling the webhook first is
		// how a missing name is reached.
		await userEvent.type(
			await canvas.findByTestId('webhook-url-textbox'),
			'https://hooks.slack.com/services/T/B/X',
		);
		await userEvent.click(canvas.getByTestId('save-channel-button'));

		await screen.findByText('Channel name is mandatory');
	},
};

/** Mutation: a failed test request opens the application's error feedback. */
export const TestChannelFailure: Story = {
	args: { testOutcome: 'fails' },
	// The mocked test request intentionally fails; the resulting console error is
	// the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await userEvent.type(
			await canvas.findByTestId('channel-name-textbox'),
			'Storybook channel',
		);
		await userEvent.type(
			await canvas.findByTestId('webhook-url-textbox'),
			'https://hooks.slack.com/services/storybook',
		);
		await userEvent.click(await canvas.findByTestId('test-channel-button'));
		await screen.findByText('Storybook forced channel failure');
	},
};

/** Mutation: a failed create request leaves the form visible with error feedback. */
export const SaveFailure: Story = {
	args: { saveOutcome: 'fails' },
	// The mocked save request intentionally fails; the resulting console error is
	// the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await userEvent.type(
			await canvas.findByTestId('channel-name-textbox'),
			'Storybook channel',
		);
		await userEvent.type(
			await canvas.findByTestId('webhook-url-textbox'),
			'https://hooks.slack.com/services/storybook',
		);
		await userEvent.click(await canvas.findByTestId('save-channel-button'));
		await screen.findByText('Storybook forced channel failure');
	},
};

/** The webhook form: the URL to post to and the auth to send with it. */
export const Webhook: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Webhook$/);
	},
};

/**
 * Basic auth picked on the webhook form: the username and password show, and
 * saving with both empty asks for one of them.
 */
export const WebhookBasicAuth: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await selectChannelType(canvasElement, /^Webhook$/);
		await fillName(canvasElement, 'alerts-webhook');
		await userEvent.type(
			canvas.getByTestId('webhook-url-textbox'),
			'https://example.com/hook',
		);
		await userEvent.click(canvas.getByTestId('webhook-auth-radio-item-basic'));
		await userEvent.click(canvas.getByTestId('save-channel-button'));

		await canvas.findByText('Enter a username or password');
		await expect(
			canvas.queryByTestId('webhook-bearer-token-textbox'),
		).not.toBeInTheDocument();
	},
};

/**
 * Bearer auth picked on the webhook form: only the token shows, and saving
 * without one asks for it.
 */
export const WebhookBearerAuth: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await selectChannelType(canvasElement, /^Webhook$/);
		await fillName(canvasElement, 'alerts-webhook');
		await userEvent.type(
			canvas.getByTestId('webhook-url-textbox'),
			'https://example.com/hook',
		);
		await userEvent.click(canvas.getByTestId('webhook-auth-radio-item-bearer'));
		await userEvent.click(canvas.getByTestId('save-channel-button'));

		await canvas.findByText('Enter a bearer token');
		await expect(
			canvas.queryByTestId('webhook-username-textbox'),
		).not.toBeInTheDocument();
	},
};

/**
 * A Slack field with a title but no value, and a button with text but neither
 * a URL nor a name. Each is flagged under its row rather than sent for the API
 * to reject.
 */
export const SlackRowErrors: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await fillName(canvasElement, 'alerts-slack');
		await userEvent.type(
			canvas.getByTestId('webhook-url-textbox'),
			'https://hooks.slack.com/services/T/B/X',
		);
		await userEvent.click(canvas.getByTestId('slack-field-add'));
		await userEvent.type(canvas.getByTestId('slack-field-title-0'), 'Region');
		await userEvent.click(canvas.getByTestId('slack-action-add'));
		await userEvent.type(canvas.getByTestId('slack-action-text-0'), 'Dashboard');
		await userEvent.click(canvas.getByTestId('save-channel-button'));

		await canvas.findByText('Enter a value for this field');
		await canvas.findByText('Enter a URL or a name for this button');
	},
};

/** The PagerDuty form: routing key, severity and the incident details. */
export const PagerDuty: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Pagerduty$/);
	},
};

/** The Opsgenie form: the integration API key, the alert body and its priority. */
export const Opsgenie: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Opsgenie$/);
	},
};

/** The email form: the recipients and the HTML body the alert is sent as. */
export const Email: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Email$/);
	},
};

/** The Microsoft Teams form: the channel's incoming webhook and the card text. */
export const MicrosoftTeams: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Microsoft Teams$/);
	},
};

/** The Google Chat form: the space's incoming webhook and the message text. */
export const GoogleChat: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Google Chat$/);
	},
};

/**
 * The Google Chat form pointed at a relay rather than `chat.googleapis.com`.
 * The API accepts any webhook URL, so the test send goes through.
 */
export const GoogleChatRelayURL: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Google Chat$/);
		await fillName(canvasElement, 'alerts-google-chat');
		await userEvent.type(
			within(canvasElement).getByTestId('webhook-url-textbox'),
			'http://chat-relay.internal/v1/spaces/OPS/messages',
		);

		await sendTest(canvasElement);
	},
};

/**
 * The Jira form: where the issue is filed, the transitions that close and
 * reopen it, and the Atlassian account the API token belongs to.
 */
export const Jira: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Jira$/);
	},
};

/**
 * The Jira form pointed at a proxy rather than an `atlassian.net` site. The API
 * accepts any site URL, so the test send goes through.
 */
export const JiraProxySite: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await selectChannelType(canvasElement, /^Jira$/);
		await fillName(canvasElement, 'alerts-jira');
		await userEvent.type(
			canvas.getByTestId('jira-site-textbox'),
			'https://jira-proxy.acme.internal',
		);
		await userEvent.type(canvas.getByTestId('jira-email-textbox'), 'ops@acme.io');
		await userEvent.type(canvas.getByTestId('jira-api-token-textbox'), 'token');
		await userEvent.type(canvas.getByTestId('jira-project-textbox'), 'OPS');
		await userEvent.type(canvas.getByTestId('jira-issue-type-textbox'), 'Bug');

		await sendTest(canvasElement);
	},
};

/** The Jira Service Management Ops form: the API key, priority and tags. */
export const JiraServiceManagementOps: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Jira Service Management Ops$/);
	},
};

/** The incident.io form: the alert source's events URL and its token. */
export const IncidentIO: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^incident\.io$/);
	},
};

/**
 * The incident.io form pointed at a relay, which the API accepts, with the token
 * pasted as the setup page shows it. The `Bearer ` prefix is flagged, since it
 * would be sent twice.
 */
export const IncidentIOBearerToken: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await selectChannelType(canvasElement, /^incident\.io$/);
		await fillName(canvasElement, 'alerts-incidentio');
		await userEvent.type(
			canvas.getByTestId('incidentio-url-textbox'),
			'https://incidentio-relay.internal/alerts',
		);
		await userEvent.type(
			canvas.getByTestId('incidentio-token-textbox'),
			'Bearer story-token',
		);
		await userEvent.click(canvas.getByTestId('save-channel-button'));

		await canvas.findByText('Paste the token only, without the Bearer prefix');
	},
};

/** The Telegram form: the bot token, the chat it posts to and the message. */
export const Telegram: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Telegram$/);
	},
};

/**
 * Telegram's own required fields. The chat id is the form's first numeric field,
 * and the API treats 0 as missing, so an empty box has to report the same error
 * as a blank one rather than sending a zero.
 */
export const TelegramRequiredFields: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await selectChannelType(canvasElement, /^Telegram$/);
		await userEvent.type(
			await canvas.findByTestId('channel-name-textbox'),
			'alerts-telegram',
		);
		await userEvent.click(await canvas.findByTestId('save-channel-button'));

		await screen.findByText(
			'Bot token is mandatory for creating a telegram channel',
		);
		await screen.findByText(
			'Chat ID is mandatory for creating a telegram channel',
		);
	},
};

/**
 * The fields the API rejects a save without are marked before anything is
 * submitted, so a long form does not have to be guessed at.
 */
export const RequiredFields: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await expect(
			await canvas.findByTestId('channel-name-textbox', undefined, {
				timeout: 15_000,
			}),
		).toHaveAttribute('aria-required', 'true');
		// slack is the kind the form opens on, and its webhook URL is its one
		// required spec field
		await expect(canvas.getByTestId('webhook-url-textbox')).toHaveAttribute(
			'aria-required',
			'true',
		);
	},
};

/**
 * The type carried in the URL. Filtering the list by a type and pressing its
 * create button lands here with `?kind=`, so the form opens on that type with
 * nothing to pick.
 */
export const KindFromUrl: Story = {
	args: { kindInUrl: 'jira' },
	play: async ({ canvasElement }): Promise<void> => {
		const trigger = await within(canvasElement).findByTestId(
			'channel-type-select',
			undefined,
			{ timeout: 15_000 },
		);

		await within(trigger).findByText(/^Jira$/);
	},
};

/**
 * A `?kind=` the app does not have. The form opens on its own default rather
 * than on an empty type, so a stale or hand-edited link still works.
 */
export const UnknownKindInUrl: Story = {
	args: { kindInUrl: 'not-a-kind' },
	play: async ({ canvasElement }): Promise<void> => {
		const trigger = await within(canvasElement).findByTestId(
			'channel-type-select',
			undefined,
			{ timeout: 15_000 },
		);

		await within(trigger).findByText(/^Slack$/);
	},
};
