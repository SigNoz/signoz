import { AlertmanagertypesGettableNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';

import {
	channelToJson,
	hasSecrets,
	SECRET_PLACEHOLDER,
} from '../utils/channelJson';

const slackChannel = {
	id: '1',
	name: 'prod-alerts',
	displayName: 'prod alerts',
	createdAt: '2026-09-01T00:00:00Z',
	updatedAt: '2026-09-01T00:00:00Z',
	config: {
		kind: 'slack',
		spec: {
			apiUrl: 'https://hooks.slack.com/services/T/B/SECRET',
			channel: '#alerts',
			sendResolved: true,
		},
	},
} as AlertmanagertypesGettableNotificationChannelDTO;

const jiraChannel = (
	spec: Record<string, unknown>,
): AlertmanagertypesGettableNotificationChannelDTO =>
	({
		id: '2',
		name: 'jira-alerts',
		displayName: 'jira alerts',
		createdAt: '2026-09-01T00:00:00Z',
		updatedAt: '2026-09-01T00:00:00Z',
		config: { kind: 'jira', spec },
	}) as unknown as AlertmanagertypesGettableNotificationChannelDTO;

describe('channelToJson', () => {
	it('hides the credential the API returns in the clear', () => {
		const json = JSON.parse(channelToJson(slackChannel, false));

		expect(json.config.spec.apiUrl).toBe(SECRET_PLACEHOLDER);
		expect(json.config.spec.channel).toBe('#alerts');
		expect(channelToJson(slackChannel, false)).not.toContain('SECRET');
	});

	it('reveals it only when asked', () => {
		const json = JSON.parse(channelToJson(slackChannel, true));

		expect(json.config.spec.apiUrl).toBe(
			'https://hooks.slack.com/services/T/B/SECRET',
		);
	});

	it('leaves the timestamps and id out, so the JSON can be reused', () => {
		const json = JSON.parse(channelToJson(slackChannel, true));

		expect(json).not.toHaveProperty('id');
		expect(json).not.toHaveProperty('createdAt');
		expect(json.name).toBe('prod-alerts');
	});

	it('hides a credential nested under auth for both jira deployments', () => {
		const cloud = JSON.parse(
			channelToJson(
				jiraChannel({
					deployment: 'cloud',
					site: 'https://acme.atlassian.net',
					auth: { email: 'ops@acme.io', apiToken: 'CLOUDSECRET' },
				}),
				false,
			),
		);
		expect(cloud.config.spec.auth).toStrictEqual({
			email: 'ops@acme.io',
			apiToken: SECRET_PLACEHOLDER,
		});

		const selfhosted = channelToJson(
			jiraChannel({
				deployment: 'selfhosted',
				site: 'https://jira.acme.com',
				auth: { pat: 'PATSECRET' },
			}),
			false,
		);
		expect(JSON.parse(selfhosted).config.spec.auth.pat).toBe(SECRET_PLACEHOLDER);
		expect(selfhosted).not.toContain('PATSECRET');
	});

	it('knows which kinds carry a credential', () => {
		expect(hasSecrets('slack')).toBe(true);
		expect(hasSecrets('email')).toBe(false);
	});
});
