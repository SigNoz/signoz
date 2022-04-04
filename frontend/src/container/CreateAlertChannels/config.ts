export interface Channel {
	send_resolved?: boolean;
	name: string;
	filter?: Partial<Array<LabelFilterStatement>>;
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
	routing_key?: string;
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

	details?: string;
	detailsArray?: Record<string, string>;
}
export const ValidatePagerChannel = (p: PagerChannel): string => {
	if (!p) {
		return 'Received unexpected input for this channel, please contact your administrator ';
	}

	if (!p.name || p.name === '') {
		return 'Name is mandatory for creating a channel';
	}

	if (!p.routing_key || p.routing_key === '') {
		return 'Routing Key is mandatory for creating pagerduty channel';
	}

	// validate details json
	try {
		JSON.parse(p.details || '{}');
	} catch (e) {
		return 'failed to parse additional information, please enter a valid json';
	}

	return '';
};

export type ChannelType = 'slack' | 'email' | 'webhook' | 'pagerduty';
export const SlackType: ChannelType = 'slack';
export const WebhookType: ChannelType = 'webhook';
export const PagerType: ChannelType = 'pagerduty';

// LabelFilterStatement will be used for preparing filter conditions / matchers
export interface LabelFilterStatement {
	// ref: https://prometheus.io/docs/alerting/latest/configuration/#matcher

	// label name
	name: string;

	// comparators supported by promql are =, !=, =~, or !~. =
	comparator: string;

	// filter value
	value: string;
}
