import {
	AlertmanagertypesChannelConfigDTO,
	AlertmanagertypesChannelEmailConfigDTO,
	AlertmanagertypesChannelGoogleChatConfigDTO,
	AlertmanagertypesChannelIncidentIOConfigDTO,
	AlertmanagertypesChannelJiraConfigDTO,
	AlertmanagertypesChannelJSMOpsConfigDTO,
	AlertmanagertypesChannelMSTeamsConfigDTO,
	AlertmanagertypesChannelOpsgenieConfigDTO,
	AlertmanagertypesChannelPagerdutyConfigDTO,
	AlertmanagertypesChannelSlackConfigDTO,
	AlertmanagertypesChannelTelegramConfigDTO,
	AlertmanagertypesChannelWebhookConfigDTO,
	AlertmanagertypesPostableNotificationChannelDTO,
	AlertmanagertypesTestableNotificationChannelDTO,
	AlertmanagertypesUpdatableNotificationChannelDTO,
} from 'api/generated/services/sigNoz.schemas';
import { omit, pick } from 'lodash-es';
import { omitBlank } from 'utils/omitBlank';

import {
	ChannelFormValues,
	ChannelKind,
	ChannelSpecFormValues,
	WebhookAuth,
} from './types';
import {
	canonicalJiraReopenDuration,
	filledRows,
	webhookAuthOf,
} from './utils';

const SPEC_FIELDS = {
	[ChannelKind.slack]: [
		'apiUrl',
		'channel',
		'title',
		'titleLink',
		'text',
		'pretext',
		'fallback',
		'footer',
		'color',
		'fields',
		'actions',
		'sendResolved',
	] as const satisfies readonly (keyof AlertmanagertypesChannelSlackConfigDTO)[],
	[ChannelKind.webhook]: [
		'url',
		'username',
		'password',
		'bearerToken',
		'sendResolved',
	] as const satisfies readonly (keyof AlertmanagertypesChannelWebhookConfigDTO)[],
	[ChannelKind.email]: [
		'to',
		'html',
		'headers',
		'sendResolved',
	] as const satisfies readonly (keyof AlertmanagertypesChannelEmailConfigDTO)[],
	[ChannelKind.pagerduty]: [
		'routingKey',
		'client',
		'clientUrl',
		'description',
		'severity',
		'component',
		'group',
		'class',
		'url',
		'source',
		'details',
		'sendResolved',
	] as const satisfies readonly (keyof AlertmanagertypesChannelPagerdutyConfigDTO)[],
	[ChannelKind.opsgenie]: [
		'apiKey',
		'apiUrl',
		'message',
		'description',
		'source',
		'priority',
		'details',
		'sendResolved',
	] as const satisfies readonly (keyof AlertmanagertypesChannelOpsgenieConfigDTO)[],
	[ChannelKind.msteams]: [
		'webhookUrl',
		'title',
		'text',
		'sendResolved',
	] as const satisfies readonly (keyof AlertmanagertypesChannelMSTeamsConfigDTO)[],
	[ChannelKind.googlechat]: [
		'webhookUrl',
		'title',
		'text',
		'sendResolved',
	] as const satisfies readonly (keyof AlertmanagertypesChannelGoogleChatConfigDTO)[],
	[ChannelKind.jira]: [
		'site',
		'project',
		'issueType',
		'email',
		'apiToken',
		'summary',
		'description',
		'priority',
		'labels',
		'resolveTransition',
		'reopenTransition',
		'wontFixResolution',
		'reopenDuration',
		'customFields',
		'sendResolved',
	] as const satisfies readonly (keyof AlertmanagertypesChannelJiraConfigDTO)[],
	[ChannelKind.jsmops]: [
		'apiKey',
		'message',
		'description',
		'priority',
		'tags',
		'sendResolved',
	] as const satisfies readonly (keyof AlertmanagertypesChannelJSMOpsConfigDTO)[],
	[ChannelKind.incidentio]: [
		'url',
		'token',
		'title',
		'description',
		'metadata',
		'sendResolved',
	] as const satisfies readonly (keyof AlertmanagertypesChannelIncidentIOConfigDTO)[],
	[ChannelKind.telegram]: [
		'apiUrl',
		'botToken',
		'chatId',
		'messageThreadId',
		'title',
		'message',
		'disableNotifications',
		'sendResolved',
	] as const satisfies readonly (keyof AlertmanagertypesChannelTelegramConfigDTO)[],
} satisfies Record<ChannelKind, readonly (keyof ChannelSpecFormValues)[]>;

/**
 * `satisfies` above only proves each listed key exists on the DTO, so a field
 * left out still compiles and is then dropped on save. This fails the build
 * instead, and the error names the missing field.
 */
type MissingFrom<D, T extends readonly PropertyKey[]> = Exclude<
	keyof D,
	T[number]
>;

type SpecFieldsComplete = {
	slack: MissingFrom<
		AlertmanagertypesChannelSlackConfigDTO,
		(typeof SPEC_FIELDS)['slack']
	>;
	webhook: MissingFrom<
		AlertmanagertypesChannelWebhookConfigDTO,
		(typeof SPEC_FIELDS)['webhook']
	>;
	email: MissingFrom<
		AlertmanagertypesChannelEmailConfigDTO,
		(typeof SPEC_FIELDS)['email']
	>;
	pagerduty: MissingFrom<
		AlertmanagertypesChannelPagerdutyConfigDTO,
		(typeof SPEC_FIELDS)['pagerduty']
	>;
	opsgenie: MissingFrom<
		AlertmanagertypesChannelOpsgenieConfigDTO,
		(typeof SPEC_FIELDS)['opsgenie']
	>;
	msteams: MissingFrom<
		AlertmanagertypesChannelMSTeamsConfigDTO,
		(typeof SPEC_FIELDS)['msteams']
	>;
	googlechat: MissingFrom<
		AlertmanagertypesChannelGoogleChatConfigDTO,
		(typeof SPEC_FIELDS)['googlechat']
	>;
	jira: MissingFrom<
		AlertmanagertypesChannelJiraConfigDTO,
		(typeof SPEC_FIELDS)['jira']
	>;
	jsmops: MissingFrom<
		AlertmanagertypesChannelJSMOpsConfigDTO,
		(typeof SPEC_FIELDS)['jsmops']
	>;
	incidentio: MissingFrom<
		AlertmanagertypesChannelIncidentIOConfigDTO,
		(typeof SPEC_FIELDS)['incidentio']
	>;
	telegram: MissingFrom<
		AlertmanagertypesChannelTelegramConfigDTO,
		(typeof SPEC_FIELDS)['telegram']
	>;
};

// every member must be `never`; a missed field shows up here by name
type NothingMissing<T extends Record<keyof T, never>> = T;
export type SpecFieldsAreExhaustive = NothingMissing<SpecFieldsComplete>;

export function toChannelConfig(
	kind: ChannelKind,
	values: ChannelFormValues,
): AlertmanagertypesChannelConfigDTO {
	const picked: Record<string, unknown> = pick(values, SPEC_FIELDS[kind]);

	if (kind === ChannelKind.slack) {
		picked.fields = filledRows(
			picked.fields as AlertmanagertypesChannelSlackConfigDTO['fields'],
			'title',
		);
		picked.actions = filledRows(
			picked.actions as AlertmanagertypesChannelSlackConfigDTO['actions'],
			'text',
		).map((action) =>
			action.confirm?.text?.trim() ? action : omit(action, 'confirm'),
		);
	}

	if (kind === ChannelKind.webhook) {
		const auth = webhookAuthOf(values);
		if (auth !== WebhookAuth.basic) {
			delete picked.username;
			delete picked.password;
		}
		if (auth !== WebhookAuth.bearer) {
			delete picked.bearerToken;
		}
	}

	const spec: Record<string, unknown> = omitBlank(picked);

	// the API answers a read with the duration prometheus would print, and
	// rejects anything spelled differently
	if (kind === ChannelKind.jira && typeof spec.reopenDuration === 'string') {
		spec.reopenDuration = canonicalJiraReopenDuration(spec.reopenDuration);
	}

	return { kind, spec } as unknown as AlertmanagertypesChannelConfigDTO;
}

export function toPostableChannel(
	kind: ChannelKind,
	values: ChannelFormValues,
): AlertmanagertypesPostableNotificationChannelDTO {
	return {
		generateName: true,
		displayName: values.name ?? '',
		config: toChannelConfig(kind, values),
	};
}

export function toUpdatableChannel(
	kind: ChannelKind,
	values: ChannelFormValues,
): AlertmanagertypesUpdatableNotificationChannelDTO {
	return { config: toChannelConfig(kind, values) };
}

export function toTestableChannel(
	kind: ChannelKind,
	values: ChannelFormValues,
): AlertmanagertypesTestableNotificationChannelDTO {
	return { config: toChannelConfig(kind, values) };
}
