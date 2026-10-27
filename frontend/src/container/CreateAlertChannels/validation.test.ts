import { TFunction } from 'i18next';

import { ChannelFormValues, ChannelKind } from './types';
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
	])('%s', (_, kind, values, expected) => {
		expect(validateChannel(kind, { name: 'channel', ...values }, t)).toBe(
			expected,
		);
	});
});
