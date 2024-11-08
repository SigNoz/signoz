import { AlertRuleStats, AlertRuleTopContributors } from 'types/api/alerts/def';

export type TopContributorsCardProps = {
	topContributorsData: AlertRuleTopContributors[];
	totalCurrentTriggers: AlertRuleStats['totalCurrentTriggers'];
};
