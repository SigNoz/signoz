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
	AlertmanagertypesChannelWebhookConfigDTO,
	AlertmanagertypesPostableNotificationChannelDTO,
	AlertmanagertypesTestableNotificationChannelDTO,
	AlertmanagertypesUpdatableNotificationChannelDTO,
} from 'api/generated/services/sigNoz.schemas';
import { pick } from 'lodash-es';
import { omitBlank } from 'utils/omitBlank';

import { ChannelFormValues, ChannelKind, ChannelSpecFormValues } from './types';

/**
 * The fields each kind sends. `satisfies` ties every entry to that kind's
 * generated spec, so a key the API does not model fails to compile.
 * An untouched field is dropped rather than sent empty, because the API
 * applies its own default only for an absent key.
 */
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
} satisfies Record<ChannelKind, readonly (keyof ChannelSpecFormValues)[]>;

export function toChannelConfig(
	kind: ChannelKind,
	values: ChannelFormValues,
): AlertmanagertypesChannelConfigDTO {
	const spec = omitBlank(pick(values, SPEC_FIELDS[kind]));

	// The generated config type is a union whose every member fixes `kind` to a
	// single literal, so a plain ChannelKind never matches one. Asserted once
	// here instead of ten times.
	return { kind, spec } as unknown as AlertmanagertypesChannelConfigDTO;
}

export function toPostableChannel(
	kind: ChannelKind,
	values: ChannelFormValues,
): AlertmanagertypesPostableNotificationChannelDTO {
	return {
		// the API derives the immutable dns1123 name from the display name
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
