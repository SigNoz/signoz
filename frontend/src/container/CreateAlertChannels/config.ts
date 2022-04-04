export interface Channel {
	send_resolved?: boolean;
	name: string;
}

export interface SlackChannel extends Channel {
	api_url?: string;
	channel?: string;
	title?: string;
	text?: string;
}

export interface WebhookChannel extends Channel {
	api_url?: string;
	// basic auth
	username?: string;
	password?: string;
}

export type ChannelType = 'slack' | 'email' | 'webhook';
export const SlackType: ChannelType = 'slack';
export const WebhookType: ChannelType = 'webhook';
