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
import { isEmpty, isNil, omitBy, pick } from 'lodash-es';

import { ChannelFormValues, ChannelKind, ChannelSpecFormValues } from './types';

/**
 * The fields each kind sends. `satisfies` ties every entry to that kind's
 * generated spec, so a key the API does not model fails to compile.
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

/**
 * The API rejects a key it does not model and applies its own default for an
 * absent one, so an untouched field is dropped rather than sent empty. `false`
 * and `0` are values a user chose, so only blanks go.
 */
function omitBlank(spec: Record<string, unknown>): Record<string, unknown> {
	return omitBy(
		spec,
		(value) =>
			isNil(value) ||
			value === '' ||
			((Array.isArray(value) || typeof value === 'object') && isEmpty(value)),
	);
}

export function toChannelConfig(
	kind: ChannelKind,
	values: ChannelFormValues,
): AlertmanagertypesChannelConfigDTO {
	const spec = omitBlank(pick(values, SPEC_FIELDS[kind]));

	// Each variant narrows `kind` to its own single-member enum, which a value
	// typed as the shared ChannelKind cannot satisfy. The string values are the
	// same, so the union is asserted once here rather than per kind.
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
