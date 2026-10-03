import { AlertmanagertypesChannelKindDTO } from 'api/generated/services/sigNoz.schemas';

export const SEARCH_KEY = 'search';
export const KIND_KEY = 'kind';
export const PAGE_KEY = 'page';

export const PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 300;

export const CHANNEL_KIND_LABEL: Record<
	AlertmanagertypesChannelKindDTO,
	string
> = {
	[AlertmanagertypesChannelKindDTO.slack]: 'Slack',
	[AlertmanagertypesChannelKindDTO.email]: 'Email',
	[AlertmanagertypesChannelKindDTO.webhook]: 'Webhook',
	[AlertmanagertypesChannelKindDTO.pagerduty]: 'PagerDuty',
	[AlertmanagertypesChannelKindDTO.opsgenie]: 'Opsgenie',
	[AlertmanagertypesChannelKindDTO.msteams]: 'MS Teams',
	[AlertmanagertypesChannelKindDTO.googlechat]: 'Google Chat',
	[AlertmanagertypesChannelKindDTO.jira]: 'Jira',
	[AlertmanagertypesChannelKindDTO.jsmops]: 'JSM Ops',
	[AlertmanagertypesChannelKindDTO.incidentio]: 'incident.io',
};

export const KIND_FILTER_ALL = 'all';

export const KIND_FILTER_OPTIONS = [
	{ value: KIND_FILTER_ALL, label: 'All types' },
	...Object.entries(CHANNEL_KIND_LABEL).map(([value, label]) => ({
		value,
		label,
	})),
];
