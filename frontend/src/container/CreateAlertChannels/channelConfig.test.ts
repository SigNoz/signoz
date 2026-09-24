import { AlertmanagertypesGettableNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';

import { toChannelConfig, toPostableChannel } from './channelConfig';
import { toChannelFormState } from './channelFormValues';
import { ChannelFormValues, ChannelKind } from './types';

const slackValues: ChannelFormValues = {
	name: 'prod alerts',
	apiUrl: 'https://hooks.slack.com/services/T/B/X',
	channel: '#alerts',
	title: 'title template',
	titleLink: 'https://signoz.io',
	text: 'body template',
	pretext: 'pretext',
	fallback: 'fallback',
	footer: 'footer',
	color: 'danger',
	fields: [{ title: 'env', value: 'prod', short: true }],
	actions: [{ type: 'button', text: 'Runbook', url: 'https://runbook' }],
	sendResolved: true,
};

describe('toChannelConfig', () => {
	it('sends every field the slack spec models, new ones included', () => {
		expect(toChannelConfig(ChannelKind.slack, slackValues)).toStrictEqual({
			kind: 'slack',
			spec: {
				apiUrl: 'https://hooks.slack.com/services/T/B/X',
				channel: '#alerts',
				title: 'title template',
				titleLink: 'https://signoz.io',
				text: 'body template',
				pretext: 'pretext',
				fallback: 'fallback',
				footer: 'footer',
				color: 'danger',
				fields: [{ title: 'env', value: 'prod', short: true }],
				actions: [{ type: 'button', text: 'Runbook', url: 'https://runbook' }],
				sendResolved: true,
			},
		});
	});

	it('drops untouched fields so the api applies its own defaults', () => {
		expect(
			toChannelConfig(ChannelKind.webhook, { url: 'https://example.com/hook' }),
		).toStrictEqual({
			kind: 'webhook',
			spec: { url: 'https://example.com/hook' },
		});
	});

	it('keeps a false the user chose rather than treating it as blank', () => {
		expect(
			toChannelConfig(ChannelKind.webhook, {
				url: 'https://example.com/hook',
				sendResolved: false,
			}),
		).toMatchObject({ spec: { sendResolved: false } });
	});

	it('sends only the selected kind s fields, not another kind s leftovers', () => {
		const config = toChannelConfig(ChannelKind.msteams, {
			webhookUrl: 'https://teams.example.com/hook',
			title: 'shared title',
			// left over from a kind the user switched away from
			routingKey: 'pagerduty-key',
			apiUrl: 'https://hooks.slack.com/services/T/B/X',
		});

		expect(config.spec).toStrictEqual({
			webhookUrl: 'https://teams.example.com/hook',
			title: 'shared title',
		});
	});
});

describe('toPostableChannel', () => {
	it('lets the api generate the immutable name from the display name', () => {
		expect(toPostableChannel(ChannelKind.slack, slackValues)).toMatchObject({
			generateName: true,
			displayName: 'prod alerts',
		});
	});

	it('leaves the display name out of the spec', () => {
		expect(
			toPostableChannel(ChannelKind.slack, slackValues).config.spec,
		).not.toHaveProperty('name');
	});
});

describe('toChannelFormState', () => {
	it('round-trips a channel back into the form it was built from', () => {
		const channel = {
			id: '1',
			name: 'prod-alerts',
			displayName: 'prod alerts',
			createdAt: '2026-09-01T00:00:00Z',
			updatedAt: '2026-09-01T00:00:00Z',
			config: toChannelConfig(ChannelKind.slack, slackValues),
		} as AlertmanagertypesGettableNotificationChannelDTO;

		const { kind, values } = toChannelFormState(channel);

		expect(kind).toBe(ChannelKind.slack);
		expect(toChannelConfig(kind, values)).toStrictEqual(channel.config);
		expect(values.name).toBe('prod alerts');
	});
});
