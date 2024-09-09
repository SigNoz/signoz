import {
	AlertRuleTimelineTableResponse,
	AlertRuleTimelineTableResponsePayload,
} from 'types/api/alerts/def';

export type TimelineTableProps = {
	timelineData: AlertRuleTimelineTableResponse[];
	totalItems: AlertRuleTimelineTableResponsePayload['data']['total'];
};
