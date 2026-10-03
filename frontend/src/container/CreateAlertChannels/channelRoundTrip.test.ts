import { AlertmanagertypesGettableNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';

import { toChannelConfig, toUpdatableChannel } from './channelConfig';
import { toChannelFormState } from './channelFormValues';
import { ChannelKind } from './types';

/**
 * Loading a channel and saving it again without touching anything must send the
 * API exactly what it returned. A field the form model drops silently loses a
 * user's configuration on the next save, because the update replaces the whole
 * config.
 */
const SPECS: Record<string, Record<string, unknown>> = {
	slack: {
		apiUrl: 'https://hooks.slack.com/services/T/B/X',
		channel: '#ops',
		title: 'title',
		titleLink: 'https://signoz.io',
		text: 'body',
		pretext: 'pre',
		fallback: 'fall',
		footer: 'foot',
		color: 'danger',
		fields: [{ title: 'env', value: 'prod', short: true }],
		actions: [{ type: 'button', text: 'Runbook', url: 'https://runbook' }],
		sendResolved: true,
	},
	webhook: {
		url: 'https://example.com/hook',
		username: 'u',
		password: 'p',
		bearerToken: 't',
		sendResolved: true,
	},
	email: {
		to: 'oncall@signoz.io',
		html: '<p>a</p>',
		headers: { 'X-Team': 'ops' },
		sendResolved: true,
	},
	pagerduty: {
		routingKey: 'k',
		client: 'c',
		clientUrl: 'https://c',
		description: 'd',
		severity: 'critical',
		component: 'comp',
		group: 'grp',
		class: 'cls',
		url: 'https://events.pagerduty.com',
		details: { firing: '{{ .Alerts.Firing }}' },
		sendResolved: true,
	},
	opsgenie: {
		apiKey: 'k',
		apiUrl: 'https://api.opsgenie.com',
		message: 'm',
		description: 'd',
		source: 's',
		priority: 'P1',
		details: { env: 'prod' },
		sendResolved: true,
	},
	msteams: {
		webhookUrl: 'https://teams',
		title: 't',
		text: 'b',
		sendResolved: true,
	},
	googlechat: {
		webhookUrl: 'https://chat.googleapis.com/v1/spaces/A',
		title: 't',
		text: 'b',
		sendResolved: true,
	},
	jira: {
		site: 'https://acme.atlassian.net',
		project: 'OPS',
		issueType: 'Task',
		email: 'a@b.c',
		apiToken: 'tok',
		summary: 's',
		description: 'd',
		priority: 'High',
		labels: ['one', 'two'],
		resolveTransition: 'Done',
		reopenTransition: 'Reopen',
		wontFixResolution: 'WontFix',
		reopenDuration: '72h',
		customFields: { customfield_1: 'v' },
		sendResolved: true,
	},
	jsmops: {
		apiKey: 'k',
		message: 'm',
		description: 'd',
		priority: 'P2',
		tags: 'prod,db',
		sendResolved: true,
	},
	incidentio: {
		url: 'https://api.incident.io/v2/alert_events/http/abc',
		token: 'tok',
		title: 't',
		description: 'd',
		metadata: { team: 'ops' },
		sendResolved: true,
	},
};

describe('load then save round trip', () => {
	it.each(Object.keys(SPECS))('keeps every %s field', (kind) => {
		const channel = {
			id: '1',
			name: `${kind}-channel`,
			displayName: `${kind} channel`,
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-01T00:00:00Z',
			config: { kind, spec: SPECS[kind] },
		} as unknown as AlertmanagertypesGettableNotificationChannelDTO;

		const { kind: loadedKind, values } = toChannelFormState(channel);
		const saved = toUpdatableChannel(loadedKind, values);

		expect(loadedKind).toBe(kind as ChannelKind);
		expect(saved.config).toStrictEqual(channel.config);
	});

	it('never sends the display name inside the spec', () => {
		const config = toChannelConfig(ChannelKind.slack, {
			name: 'prod alerts',
			apiUrl: 'https://hooks.slack.com/x',
		});

		expect(config.spec).not.toHaveProperty('name');
	});
});
