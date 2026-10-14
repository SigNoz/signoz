import { TFunction } from 'i18next';

import { ChannelFormValues, ChannelKind } from './types';
import {
	isValidGoogleChatWebhookURL,
	isValidIncidentIOURL,
	isValidJiraReopenDuration,
	isValidJiraSiteURL,
} from './utils';

type Validator = (values: ChannelFormValues, t: TFunction) => string | null;

const requireWebhookUrl: Validator = (values, t) =>
	values.webhookUrl ? null : t('webhook_url_required');

const requireApiKey: Validator = (values, t) =>
	values.apiKey ? null : t('api_key_required');

const validateSlack: Validator = (values, t) =>
	values.apiUrl ? null : t('webhook_url_required');

const validateWebhook: Validator = (values, t) => {
	if (!values.url) {
		return t('webhook_url_required');
	}
	// the API allows bearer-only and no-auth webhooks, but a username without its
	// password is still an incomplete basic auth pair
	return values.username && !values.password ? t('username_no_password') : null;
};

const validatePagerduty: Validator = (values, t) =>
	values.routingKey ? null : t('routing_key_required');

const validateEmail: Validator = (values, t) =>
	values.to ? null : t('to_required');

const validateGoogleChat: Validator = (values, t) => {
	if (!values.webhookUrl) {
		return t('webhook_url_required');
	}
	return isValidGoogleChatWebhookURL(values.webhookUrl)
		? null
		: t('google_chat_webhook_url_invalid');
};

const validateJira: Validator = (values, t) => {
	if (
		!values.site ||
		!values.email ||
		!values.apiToken ||
		!values.project ||
		!values.issueType
	) {
		return t('jira_required_fields');
	}
	if (!isValidJiraSiteURL(values.site)) {
		return t('jira_site_invalid');
	}
	if (
		values.reopenDuration &&
		!isValidJiraReopenDuration(values.reopenDuration)
	) {
		return t('jira_reopen_duration_invalid');
	}
	return null;
};

const validateIncidentIO: Validator = (values, t) => {
	if (!values.url || !values.token) {
		return t('incidentio_required_fields');
	}
	return isValidIncidentIOURL(values.url) ? null : t('incidentio_url_invalid');
};

const VALIDATORS: Record<ChannelKind, Validator> = {
	[ChannelKind.slack]: validateSlack,
	[ChannelKind.webhook]: validateWebhook,
	[ChannelKind.pagerduty]: validatePagerduty,
	[ChannelKind.opsgenie]: requireApiKey,
	[ChannelKind.jsmops]: requireApiKey,
	[ChannelKind.email]: validateEmail,
	[ChannelKind.msteams]: requireWebhookUrl,
	[ChannelKind.googlechat]: validateGoogleChat,
	[ChannelKind.jira]: validateJira,
	[ChannelKind.incidentio]: validateIncidentIO,
};

/**
 * Client-side validation for the fields the API rejects outright, so a save
 * round trip is not spent on an obviously incomplete form. Each rule mirrors the
 * matching `Validate()` in `pkg/types/alertmanagertypes`. Returns the message to
 * show, or null when the form can be submitted.
 */
export function validateChannel(
	kind: ChannelKind,
	values: ChannelFormValues,
	t: TFunction,
): string | null {
	if (!values.name) {
		return t('channel_name_required');
	}

	const validate = VALIDATORS[kind];
	return validate ? validate(values, t) : t('selected_channel_invalid');
}
