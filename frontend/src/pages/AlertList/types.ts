export enum AlertListTabs {
	TRIGGERED_ALERTS = 'TriggeredAlerts',
	ALERT_RULES = 'AlertRules',
	PLANNED_DOWNTIME = 'PlannedDowntime',
	ROUTING_POLICIES = 'RoutingPolicies',
}

// Legacy values kept so old URLs (?tab=Configuration&subTab=...) keep working.
export const LEGACY_CONFIGURATION_TAB = 'Configuration';
export const LEGACY_SUB_TABS = {
	PLANNED_DOWNTIME: 'planned-downtime',
	ROUTING_POLICIES: 'routing-policies',
} as const;
