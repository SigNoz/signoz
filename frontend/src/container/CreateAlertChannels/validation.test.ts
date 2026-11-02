import { TFunction } from 'i18next';

import { ChannelFormValues, ChannelKind, WebhookAuth } from './types';
import { validateChannel } from './validation';

const t = ((key: string) => key) as TFunction;

describe('validateChannel', () => {
	it.each<[string, ChannelKind, ChannelFormValues, string | null]>([
		[
			'a google chat webhook behind a proxy',
			ChannelKind.googlechat,
			{ webhookUrl: 'http://relay.internal/chat' },
			null,
		],
		[
			'a jira site that is not on atlassian.net',
			ChannelKind.jira,
			{
				site: 'https://jira-proxy.acme.com/',
				email: 'a@acme.com',
				apiToken: 't',
				project: 'OPS',
				issueType: 'Bug',
			},
			null,
		],
		[
			'any incident.io url',
			ChannelKind.incidentio,
			{ url: 'https://relay.internal/incidentio', token: 'tok' },
			null,
		],
		[
			'an incident.io token pasted with its Bearer prefix',
			ChannelKind.incidentio,
			{ url: 'https://relay.internal/incidentio', token: 'Bearer tok' },
			'incidentio_token_bearer_prefix',
		],
		[
			'an incident.io token with a trailing space',
			ChannelKind.incidentio,
			{ url: 'https://relay.internal/incidentio', token: 'tok ' },
			'incidentio_token_whitespace',
		],
		[
			'a webhook username without a password',
			ChannelKind.webhook,
			{ url: 'https://hook', webhookAuth: WebhookAuth.basic, username: 'u' },
			null,
		],
		[
			'basic auth with neither username nor password',
			ChannelKind.webhook,
			{ url: 'https://hook', webhookAuth: WebhookAuth.basic },
			'webhook_basic_auth_required',
		],
		[
			'bearer auth without a token',
			ChannelKind.webhook,
			{ url: 'https://hook', webhookAuth: WebhookAuth.bearer, username: 'u' },
			'webhook_bearer_token_required',
		],
		[
			'a slack field without a value',
			ChannelKind.slack,
			{ apiUrl: 'https://hooks', fields: [{ title: 'env', value: '' }] },
			'slack_field_value_required',
		],
		[
			'a slack button with neither url nor name',
			ChannelKind.slack,
			{
				apiUrl: 'https://hooks',
				actions: [{ type: 'button', text: 'Runbook', url: '' }],
			},
			'slack_action_url_or_name_required',
		],
		[
			'a slack button with a name only',
			ChannelKind.slack,
			{
				apiUrl: 'https://hooks',
				actions: [{ type: 'button', text: 'Ack', name: 'ack' }],
			},
			null,
		],
	])('%s', (_, kind, values, expected) => {
		expect(validateChannel(kind, { name: 'channel', ...values }, t)).toBe(
			expected,
		);
	});
});
