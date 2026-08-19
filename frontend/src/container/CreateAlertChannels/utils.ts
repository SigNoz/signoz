import {
	AlertmanagertypesPostableChannelDTO,
	ConfigSecretURLDTO,
} from 'api/generated/services/sigNoz.schemas';

import { ChannelType, GoogleChatChannel } from './config';

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
