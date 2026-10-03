import { AlertmanagertypesGettableNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';

export const SECRET_PLACEHOLDER = '••••••••';

/**
 * The spec fields the API marks `format: password`. A fetch by ID returns them
 * in the clear, so the JSON view hides them until asked.
 */
const SECRET_FIELDS_BY_KIND: Record<string, readonly string[]> = {
	slack: ['apiUrl'],
	webhook: ['url', 'password', 'bearerToken'],
	pagerduty: ['routingKey'],
	opsgenie: ['apiKey'],
	msteams: ['webhookUrl'],
	googlechat: ['webhookUrl'],
	jira: ['apiToken'],
	jsmops: ['apiKey'],
	incidentio: ['token'],
};

export function channelToJson(
	channel: AlertmanagertypesGettableNotificationChannelDTO,
	showSecrets: boolean,
): string {
	const { kind, spec } = channel.config;
	const secrets = SECRET_FIELDS_BY_KIND[kind] ?? [];

	const safeSpec = showSecrets
		? spec
		: Object.fromEntries(
				Object.entries(spec).map(([key, value]) => [
					key,
					secrets.includes(key) && value ? SECRET_PLACEHOLDER : value,
				]),
			);

	return JSON.stringify(
		{
			name: channel.name,
			displayName: channel.displayName,
			config: { kind, spec: safeSpec },
		},
		null,
		2,
	);
}

export function hasSecrets(kind: string): boolean {
	return (SECRET_FIELDS_BY_KIND[kind] ?? []).length > 0;
}
