import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent } from 'tests/test-utils';

import ChannelForm from '../components/ChannelForm/ChannelForm';

const FIND = { timeout: 5000 };

interface PrefillCase {
	kind: string;
	spec: Record<string, unknown>;
	/** [data-testid, expected value] for the fields that kind renders. */
	fields: [string, string][];
	/**
	 * Jira and JSM Ops keep their extra fields behind a collapsed panel. Tests
	 * run without translations, so the header shows the i18n key.
	 */
	expandAdvanced?: string;
}

/**
 * Editing a channel must show what the API returned. A field whose form name
 * drifts from its spec key renders blank, which is silent and easy to miss, so
 * every kind is checked field by field.
 */
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
			['webhook-url-textbox', 'https://hooks.slack.com/services/T/B/X'],
			['slack-channel-textbox', '#ops'],
			['title-textarea', 'slack title'],
			['title-link-textbox', 'https://signoz.io'],
			['description-textarea', 'slack body'],
			['slack-color-textbox', 'danger'],
			['slack-pretext-textbox', 'slack pretext'],
			['slack-fallback-textbox', 'slack fallback'],
			['slack-footer-textbox', 'slack footer'],
		],
	},
	{
		kind: 'webhook',
		spec: {
			url: 'https://example.com/hook',
			username: 'hook-user',
			password: 'hook-pass',
			bearerToken: 'hook-token',
		},
		fields: [
			['webhook-url-textbox', 'https://example.com/hook'],
			['webhook-username-textbox', 'hook-user'],
			['webhook-password-textbox', 'hook-pass'],
			['webhook-bearer-token-textbox', 'hook-token'],
		],
	},
	{
		kind: 'email',
		spec: { to: 'oncall@signoz.io', html: '<p>alert</p>' },
		fields: [['email-to-textbox', 'oncall@signoz.io']],
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
			['pager-routing-key-textbox', 'pd-routing-key'],
			['pager-description-textarea', 'pd description'],
			['pager-severity-textbox', 'critical'],
			['pager-group-textarea', 'pd group'],
			['pager-class-textarea', 'pd class'],
			['pager-client-textarea', 'pd client'],
			['pager-client-url-textarea', 'https://pd.example.com'],
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
			['opsgenie-api-key-textbox', 'og-api-key'],
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
			['webhook-url-textbox', 'https://teams.example.com/hook'],
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
			['webhook-url-textbox', 'https://chat.googleapis.com/v1/spaces/A'],
			['title-textarea', 'chat title'],
			['description-textarea', 'chat body'],
		],
	},
	{
		kind: 'jira',
		expandAdvanced: 'jira_advanced_section',
		spec: {
			site: 'https://acme.atlassian.net',
			project: 'OPS',
			issueType: 'Task',
			email: 'someone@acme.io',
			apiToken: 'jira-token',
			summary: 'jira summary',
			description: 'jira description',
			priority: 'High',
			resolveTransition: 'Done',
			reopenTransition: 'Reopen',
			wontFixResolution: "Won't Fix",
			reopenDuration: '72h',
		},
		fields: [
			['jira-site-textbox', 'https://acme.atlassian.net'],
			['jira-project-textbox', 'OPS'],
			['jira-issue-type-textbox', 'Task'],
			['jira-email-textbox', 'someone@acme.io'],
			['jira-api-token-textbox', 'jira-token'],
			['jira-summary-textarea', 'jira summary'],
			['jira-description-textarea', 'jira description'],
			['jira-priority-textbox', 'High'],
			['jira-resolve-transition-textbox', 'Done'],
			['jira-reopen-transition-textbox', 'Reopen'],
			['jira-wont-fix-resolution-textbox', "Won't Fix"],
			['jira-reopen-duration-textbox', '72h'],
		],
	},
	{
		kind: 'jsmops',
		expandAdvanced: 'jsmops_advanced_section',
		spec: {
			apiKey: 'jsm-api-key',
			message: 'jsm message',
			description: 'jsm description',
			priority: 'P2',
			tags: 'prod,db',
		},
		fields: [
			['jsmops-api-key-textbox', 'jsm-api-key'],
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
				'incidentio-url-textbox',
				'https://api.incident.io/v2/alert_events/http/abc',
			],
			['incidentio-token-textbox', 'incident-token'],
			['incidentio-title-textarea', 'incident title'],
			['incidentio-description-textarea', 'incident description'],
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
		async ({ kind, spec, fields, expandAdvanced }) => {
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
				screen.findByTestId('channel-name-textbox', {}, FIND),
			).resolves.toHaveValue(`${kind} channel`);

			if (expandAdvanced) {
				const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
				await user.click(await screen.findByText(expandAdvanced, {}, FIND));
			}

			fields.forEach(([testId, expected]) => {
				expect(screen.getByTestId(testId)).toHaveValue(expected);
			});
		},
		20000,
	);
});
