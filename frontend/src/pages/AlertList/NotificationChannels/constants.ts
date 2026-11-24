import type { SelectItemType } from '@signozhq/ui/select';
import { AlertmanagertypesChannelKindDTO } from 'api/generated/services/sigNoz.schemas';

export const SEARCH_KEY = 'search';
export const KIND_KEY = 'kind';

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
	[AlertmanagertypesChannelKindDTO.telegram]: 'Telegram',
};

export const KIND_FILTER_ALL = 'all';

export const KIND_FILTER_OPTIONS: SelectItemType[] = [
	{ type: 'item', value: KIND_FILTER_ALL, label: 'All types' },
	...Object.entries(CHANNEL_KIND_LABEL).map(
		([value, label]): SelectItemType => ({ type: 'item', value, label }),
	),
];
