export interface SlackChannel {
	send_resolved: boolean;
	api_url: string;
	channel: string;
	title: string;
	text: string;
	name: string;
}

export type ChannelType = 'slack' | 'email';
