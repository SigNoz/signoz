import { expect, test } from '../../../drivers/channels';
import { deleteChannelViaApi } from '../../../helpers/channels/api';

// One pass per channel type, filling only what the form refuses to save
// without. The point is that every type can be created at all: a type whose
// settings component or validator drifts fails here rather than in support.
const TYPES: { label: string; fields: [string, string][] }[] = [
	{
		label: 'Slack',
		fields: [['webhook-url-textbox', 'https://hooks.slack.com/services/T/B/X']],
	},
	{
		label: 'Webhook',
		fields: [['webhook-url-textbox', 'https://example.test/e2e-hook']],
	},
	{
		label: 'Pagerduty',
		fields: [['pager-routing-key-textbox', 'e2e-routing-key']],
	},
	{
		label: 'Opsgenie',
		fields: [['opsgenie-api-key-textbox', 'e2e-api-key']],
	},
	{
		label: 'Email',
		fields: [['email-to-textbox', 'e2e@signoz.test']],
	},
	{
		label: 'Microsoft Teams',
		fields: [
			['webhook-url-textbox', 'https://outlook.office.com/webhook/e2e-teams'],
		],
	},
	{
		label: 'Google Chat',
		// the validator accepts https on chat.googleapis.com and nothing else
		fields: [
			[
				'webhook-url-textbox',
				'https://chat.googleapis.com/v1/spaces/AAA/messages?key=k&token=t',
			],
		],
	},
	{
		label: 'Jira',
		// the site has to be an https atlassian.net host
		fields: [
			['jira-site-textbox', 'https://e2e.atlassian.net'],
			['jira-email-textbox', 'e2e@signoz.test'],
			['jira-api-token-textbox', 'e2e-api-token'],
			['jira-project-textbox', 'E2E'],
			['jira-issue-type-textbox', 'Task'],
		],
	},
	{
		label: 'Jira Service Management Ops',
		fields: [['jsmops-api-key-textbox', 'e2e-api-key']],
	},
	{
		label: 'incident.io',
		// the path has to carry an id after /v2/alert_events/http/
		fields: [
			[
				'incidentio-url-textbox',
				'https://api.incident.io/v2/alert_events/http/e2e-source',
			],
			['incidentio-token-textbox', 'e2e-token'],
		],
	},
	{
		label: 'Telegram',
		// the API rejects a chat id of 0, so this one is deliberately non-zero
		fields: [
			['telegram-bot-token-textbox', '123456:e2e-bot-token'],
			['telegram-chat-id-textbox', '-1001234567890'],
		],
	},
];

test.describe('Notification channels — one of each type', () => {
	TYPES.forEach(({ label, fields }, index) => {
		const number = String(index + 1).padStart(2, '0');

		test(`TC-${number} a ${label} channel saves and shows up in the list`, async ({
			channels,
			authedPage,
		}) => {
			const name = `e2e-nct-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
			let id: string | undefined;

			try {
				await channels.form.gotoNew();
				await channels.form.name().fill(name);
				await channels.form.pickType(label);

				for (const [testId, value] of fields) {
					// eslint-disable-next-line no-await-in-loop
					await channels.form.fillField(testId, value);
				}

				id = await channels.form.saveAndReturnId();

				await channels.list.goto({ search: name });
				await expect(channels.list.row(name)).toBeVisible();
			} finally {
				await deleteChannelViaApi(authedPage, id);
			}
		});
	});
});
