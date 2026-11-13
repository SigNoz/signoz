import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen } from 'tests/test-utils';

import ChannelForm from '../components/ChannelForm/ChannelForm';

const FIND = { timeout: 5000 };

interface PrefillCase {
	kind: string;
	spec: Record<string, unknown>;
	fields: [string, string | number][];
}

const CASES: PrefillCase[] = [
	{
		kind: 'slack',
		spec: {
			apiUrl: 'https://hooks.slack.com/services/T/B/X',
			channel: '#ops',
			title: 'slack title',
			titleLink: 'https://signoz.io',
			text: 'slack body',
			color: 'danger',
			pretext: 'slack pretext',
			fallback: 'slack fallback',
			footer: 'slack footer',
		},
		fields: [
			['webhook-url-textbox-field', 'https://hooks.slack.com/services/T/B/X'],
			['slack-channel-textbox-field', '#ops'],
			['title-textarea', 'slack title'],
			['title-link-textbox-field', 'https://signoz.io'],
			['description-textarea', 'slack body'],
			['slack-color-textbox-field', 'danger'],
			['slack-pretext-textbox-field', 'slack pretext'],
			['slack-fallback-textbox-field', 'slack fallback'],
			['slack-footer-textbox-field', 'slack footer'],
		],
	},
	{
		kind: 'webhook',
		spec: {
			url: 'https://example.com/hook',
			username: 'hook-user',
			password: 'hook-pass',
		},
		fields: [
			['webhook-url-textbox-field', 'https://example.com/hook'],
			['webhook-username-textbox-field', 'hook-user'],
			['webhook-password-textbox-field', 'hook-pass'],
		],
	},
	{
		kind: 'webhook',
		spec: { url: 'https://example.com/hook', bearerToken: 'hook-token' },
		fields: [['webhook-bearer-token-textbox-field', 'hook-token']],
	},
	{
		kind: 'email',
		spec: { to: 'oncall@signoz.io', html: '<p>alert</p>' },
		fields: [['email-to-textbox-field', 'oncall@signoz.io']],
	},
	{
		kind: 'pagerduty',
		spec: {
			routingKey: 'pd-routing-key',
			description: 'pd description',
			severity: 'critical',
			group: 'pd group',
			class: 'pd class',
			client: 'pd client',
			clientUrl: 'https://pd.example.com',
		},
		fields: [
			['pager-routing-key-textbox-field', 'pd-routing-key'],
			['pager-description-textarea', 'pd description'],
			['pager-severity-textbox-field', 'critical'],
			['pager-group-textarea-field', 'pd group'],
			['pager-class-textarea-field', 'pd class'],
			['pager-client-textarea-field', 'pd client'],
			['pager-client-url-textarea-field', 'https://pd.example.com'],
		],
	},
	{
		kind: 'opsgenie',
		spec: {
			apiKey: 'og-api-key',
			message: 'og message',
			description: 'og description',
			priority: 'P1',
		},
		fields: [
			['opsgenie-api-key-textbox-field', 'og-api-key'],
			['opsgenie-message-textarea', 'og message'],
			['opsgenie-description-textarea', 'og description'],
			['opsgenie-priority-textarea', 'P1'],
		],
	},
	{
		kind: 'msteams',
		spec: {
			webhookUrl: 'https://teams.example.com/hook',
			title: 'teams title',
			text: 'teams body',
		},
		fields: [
			['webhook-url-textbox-field', 'https://teams.example.com/hook'],
			['title-textarea', 'teams title'],
			['description-textarea', 'teams body'],
		],
	},
	{
		kind: 'googlechat',
		spec: {
			webhookUrl: 'https://chat.googleapis.com/v1/spaces/A',
			title: 'chat title',
			text: 'chat body',
		},
		fields: [
			['webhook-url-textbox-field', 'https://chat.googleapis.com/v1/spaces/A'],
			['title-textarea', 'chat title'],
			['description-textarea', 'chat body'],
		],
	},
	{
		kind: 'jira',
		spec: {
			deployment: 'cloud',
			site: 'https://acme.atlassian.net',
			project: 'OPS',
			issueType: 'Task',
			auth: { email: 'someone@acme.io', apiToken: 'jira-token' },
			summary: 'jira summary',
			description: 'jira description',
			priority: 'High',
			resolveTransition: 'Done',
			reopenTransition: 'Reopen',
			wontFixResolution: "Won't Fix",
			reopenDuration: '72h',
		},
		fields: [
			['jira-site-textbox-field', 'https://acme.atlassian.net'],
			['jira-project-textbox-field', 'OPS'],
			['jira-issue-type-textbox-field', 'Task'],
			['jira-email-textbox-field', 'someone@acme.io'],
			['jira-api-token-textbox-field', 'jira-token'],
			['jira-summary-textarea', 'jira summary'],
			['jira-description-textarea', 'jira description'],
			['jira-priority-textbox-field', 'High'],
			['jira-resolve-transition-textbox-field', 'Done'],
			['jira-reopen-transition-textbox-field', 'Reopen'],
			['jira-wont-fix-resolution-textbox-field', "Won't Fix"],
			['jira-reopen-duration-textbox-field', '72h'],
		],
	},
	{
		kind: 'jira',
		spec: {
			deployment: 'selfhosted',
			site: 'https://jira.acme.com',
			project: 'OPS',
			issueType: 'Task',
			auth: { pat: 'jira-pat' },
		},
		fields: [
			['jira-site-textbox-field', 'https://jira.acme.com'],
			['jira-pat-textbox-field', 'jira-pat'],
		],
	},
	{
		kind: 'jsmops',
		spec: {
			apiKey: 'jsm-api-key',
			message: 'jsm message',
			description: 'jsm description',
			priority: 'P2',
			tags: 'prod,db',
		},
		fields: [
			['jsmops-api-key-textbox-field', 'jsm-api-key'],
			['jsmops-message-textarea', 'jsm message'],
			['jsmops-description-textarea', 'jsm description'],
			['jsmops-priority-textarea', 'P2'],
		],
	},
	{
		kind: 'incidentio',
		spec: {
			url: 'https://api.incident.io/v2/alert_events/http/abc',
			token: 'incident-token',
			title: 'incident title',
			description: 'incident description',
		},
		fields: [
			[
				'incidentio-url-textbox-field',
				'https://api.incident.io/v2/alert_events/http/abc',
			],
			['incidentio-token-textbox-field', 'incident-token'],
			['incidentio-title-textarea', 'incident title'],
			['incidentio-description-textarea', 'incident description'],
		],
	},
	{
		kind: 'telegram',
		spec: {
			botToken: '123456789:AA-token',
			chatId: -1001234567890,
			messageThreadId: 42,
			title: 'telegram title',
			message: 'telegram message',
			apiUrl: 'https://api.telegram.org',
		},
		fields: [
			['telegram-bot-token-textbox-field', '123456789:AA-token'],
			['telegram-chat-id-textbox-field', -1001234567890],
			['telegram-message-thread-id-textbox-field', 42],
			['telegram-title-textarea', 'telegram title'],
			['telegram-message-textarea', 'telegram message'],
			['telegram-api-url-textbox-field', 'https://api.telegram.org'],
		],
	},
];

describe('ChannelForm prefill', () => {
	beforeEach(() => {
		window.history.replaceState({}, '', '/');
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	it.each(CASES)(
		'prefills every $kind field from the API',
		async ({ kind, spec, fields }) => {
			server.use(
				rest.get(
					'http://localhost/api/v2/notification_channels/:id',
					(_, res, ctx) =>
						res(
							ctx.status(200),
							ctx.json({
								status: 'success',
								data: {
									id: '3',
									name: `${kind}-channel`,
									displayName: `${kind} channel`,
									createdAt: '2026-01-01T00:00:00Z',
									updatedAt: '2026-01-01T00:00:00Z',
									config: { kind, spec: { ...spec, sendResolved: true } },
								},
							}),
						),
				),
			);

			render(<ChannelForm channelId="3" onDone={jest.fn()} />);

			await expect(
				screen.findByTestId('channel-name-textbox-field', {}, FIND),
			).resolves.toHaveValue(`${kind} channel`);

			fields.forEach(([testId, expected]) => {
				expect(screen.getByTestId(testId)).toHaveValue(expected);
			});
		},
		20000,
	);
});
