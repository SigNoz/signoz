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
	GoogleChat = 'googlechat',
	Jira = 'jira',
	JsmOps = 'jsmops',
	IncidentIO = 'incidentio',
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

export interface GoogleChatChannel extends Channel {
	// incoming webhook url of the google chat space, must be an
	// https url on chat.googleapis.com
	webhook_url?: string;
	title?: string;
	text?: string;
}

// JiraChannel configures the Jira Cloud alert channel. Auth is basic auth
// (Atlassian account email + API token) carried in username / password.
export interface JiraChannel extends Channel {
	// Jira Cloud base URL, e.g. https://acme.atlassian.net
	site?: string;
	project?: string;
	issue_type?: string;
	// issue title template
	summary?: string;
	// issue body template, rendered to rich text server-side
	description?: string;
	// basic auth: username is the Atlassian account email, password is the API token
	username?: string;
	password?: string;
	priority?: string;
	labels?: string[];
	resolve_transition?: string;
	reopen_transition?: string;
	// duration string, e.g. 72h or 3d
	reopen_duration?: string;
}

// IncidentIOChannel configures the incident.io alert channel, backed by an
// incident.io HTTP alert source (Alert Events V2 API).
export interface IncidentIOChannel extends Channel {
	// per-source alert events URL, e.g.
	// https://api.incident.io/v2/alert_events/http/<source_config_id>
	url?: string;
	// the alert source's secret token
	token?: string;
	// alert title template
	title?: string;
	// alert body template (markdown, rendered natively by incident.io)
	description?: string;
}

// JsmOpsChannel configures the Jira Service Management Ops alert channel
// (ex-Opsgenie alert API). Auth is the JSM integration API key.
export interface JsmOpsChannel extends Channel {
	api_key?: string;
	// alert title template
	message?: string;
	// alert body template (markdown, rendered to HTML server-side)
	description?: string;
	// priority template, resolves to P1-P5
	priority?: string;
	// tags, joined to a comma-separated string for the backend
	tags?: string[];
}
