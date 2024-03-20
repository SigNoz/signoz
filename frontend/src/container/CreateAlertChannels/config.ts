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

// OpsgenieChannel configures alert manager to send
// events to opsgenie
export interface OpsgenieChannel extends Channel {
	//  ref: https://prometheus.io/docs/alerting/latest/configuration/#opsgenie_config
	api_key: string;

	message?: string;

	// A description of the incident
	description?: string;

	// A backlink to the sender of the notification.
	source?: string;

	// A set of arbitrary key/value pairs that provide further detail
	// about the alert.
	details?: string;
	detailsArray?: Record<string, string>;

	// Priority level of alert. Possible values are P1, P2, P3, P4, and P5.
	priority?: string;
}

export interface EmailChannel extends Channel {
	// comma separated list of email addresses to send alerts to
	to: string;
	//  HTML body of the email notification.
	html: string;
	// Further headers email header key/value pairs.
	// [ headers: { <string>: <tmpl_string>, ... } ]
	headers: Record<string, string>;
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

export enum ChannelType {
	Slack = 'slack',
	Email = 'email',
	Webhook = 'webhook',
	Pagerduty = 'pagerduty',
	Opsgenie = 'opsgenie',
	MsTeams = 'msteams',
}

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

export interface MsTeamsChannel extends Channel {
	webhook_url?: string;
	title?: string;
	text?: string;
}
