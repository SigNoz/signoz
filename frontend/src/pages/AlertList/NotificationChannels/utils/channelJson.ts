import { AlertmanagertypesGettableNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';
import { cloneDeep, get, set } from 'lodash-es';

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
	jira: ['auth.apiToken', 'auth.pat'],
	jsmops: ['apiKey'],
	incidentio: ['token'],
	telegram: ['botToken'],
};

export function channelToJson(
	channel: AlertmanagertypesGettableNotificationChannelDTO,
	showSecrets: boolean,
): string {
	const { kind, spec } = channel.config;
	const secrets = SECRET_FIELDS_BY_KIND[kind] ?? [];

	const safeSpec = cloneDeep(spec);
	if (!showSecrets) {
		secrets.forEach((path) => {
			if (get(safeSpec, path)) {
				set(safeSpec, path, SECRET_PLACEHOLDER);
			}
		});
	}

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
