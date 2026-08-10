import {
	AlertmanagertypesJiraReceiverConfigDTO,
	AlertmanagertypesPostableChannelDTO,
	ConfigSecretURLDTO,
	ModelDurationDTO,
} from 'api/generated/services/sigNoz.schemas';

import { ChannelType, GoogleChatChannel, JiraChannel } from './config';

export const isChannelType = (type: string): type is ChannelType =>
	Object.values(ChannelType).includes(type as ChannelType);

const GOOGLE_CHAT_WEBHOOK_HOST = 'chat.googleapis.com';

// the backend enforces the same two rules, this is only for a nicer error experience
export const isValidGoogleChatWebhookURL = (url: string): boolean => {
	try {
		const { protocol, hostname } = new URL(url);
		return (
			protocol === 'https:' && hostname.toLowerCase() === GOOGLE_CHAT_WEBHOOK_HOST
		);
	} catch {
		return false;
	}
};

// create, update and test all send the same body shape
export const prepareGoogleChatRequest = (
	config: Partial<GoogleChatChannel>,
): AlertmanagertypesPostableChannelDTO => ({
	name: config.name || '',
	googlechat_configs: [
		{
			// the generated type models go's config.SecretURL as an object, the api takes a string
			webhook_url: (config.webhook_url || '') as unknown as ConfigSecretURLDTO,
			title: config.title || '',
			text: config.text || '',
			send_resolved: config.send_resolved || false,
		},
	],
});

const JIRA_CLOUD_HOST_SUFFIX = '.atlassian.net';

// the backend enforces the same rule, this is only for a nicer error experience
export const isValidJiraSiteURL = (url: string): boolean => {
	try {
		const { protocol, hostname } = new URL(url);
		return (
			protocol === 'https:' &&
			hostname.toLowerCase().endsWith(JIRA_CLOUD_HOST_SUFFIX)
		);
	} catch {
		return false;
	}
};

// create, update and test all send the same body shape. Optional fields are
// omitted when empty so the backend applies its defaults.
export const prepareJiraRequest = (
	config: Partial<JiraChannel>,
): AlertmanagertypesPostableChannelDTO => {
	const jira: AlertmanagertypesJiraReceiverConfigDTO = {
		site: config.site || '',
		project: config.project || '',
		issue_type: config.issue_type || '',
		send_resolved: config.send_resolved || false,
		http_config: {
			basic_auth: {
				username: config.username || '',
				password: config.password || '',
			},
		},
	};

	if (config.priority) {
		jira.priority = config.priority;
	}
	if (config.labels?.length) {
		jira.labels = config.labels;
	}
	if (config.resolve_transition) {
		jira.resolve_transition = config.resolve_transition;
	}
	if (config.reopen_transition) {
		jira.reopen_transition = config.reopen_transition;
	}
	if (config.reopen_duration) {
		// the generated type models go's model.Duration as a number, the api takes a
		// duration string like "72h"
		jira.reopen_duration = config.reopen_duration as unknown as ModelDurationDTO;
	}

	return {
		name: config.name || '',
		jira_configs: [jira],
	};
};
