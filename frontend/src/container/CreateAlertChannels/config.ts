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

// PagerChannel configures alert manager to send
// events to pagerduty
export interface PagerChannel extends Channel {
	//  ref: https://prometheus.io/docs/alerting/latest/configuration/#pagerduty_config
	routing_key: string;
	// displays source of the event in pager duty
	client?: string;
	client_url?: string;
	// A description of the incident
	description?: string;
	// Severity of the incident
	severity?: string;
	// The part or component of the affected system that is broken
	component?: string;
	//  A cluster or grouping of sources
	group?: string;
	// The class/type of the event.
	class?: string;
}

export type ChannelType = 'slack' | 'email' | 'webhook' | 'pagerduty';
export const SlackType: ChannelType = 'slack';
export const WebhookType: ChannelType = 'webhook';
export const PagerType: ChannelType = 'pagerduty';
