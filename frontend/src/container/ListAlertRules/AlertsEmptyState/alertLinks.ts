export const ALERT_INFO_LINKS = [
	{
		infoText: 'How to create Metrics-based alerts',
		link:
			'https://signoz.io/docs/alerts-management/metrics-based-alerts/?utm_source=product&utm_medium=alert-empty-page',
		leftIconVisible: false,
		rightIconVisible: true,
	},
	{
		infoText: 'How to create Log-based alerts',
		link:
			'https://signoz.io/docs/alerts-management/log-based-alerts/?utm_source=product&utm_medium=alert-empty-page',
		leftIconVisible: false,
		rightIconVisible: true,
	},
	{
		infoText: 'How to create Trace-based alerts',
		link:
			'https://signoz.io/docs/alerts-management/trace-based-alerts/?utm_source=product&utm_medium=alert-empty-page',
		leftIconVisible: false,
		rightIconVisible: true,
	},
];

export const ALERT_CARDS = [
	{
		header: 'Alert on high memory usage',
		subheader: "Monitor your host's memory usage",
		link:
			'https://signoz.io/docs/alerts-management/metrics-based-alerts/?utm_source=product&utm_medium=alert-empty-page#1-alert-when-memory-usage-for-host-goes-above-400-mb-or-any-fixed-memory',
	},
	{
		header: 'Alert on slow external API calls',
		subheader: 'Monitor your external API calls',
		link:
			'https://signoz.io/docs/alerts-management/trace-based-alerts/?utm_source=product&utm_medium=alert-empty-page#examples',
	},
	{
		header: 'Alert on high percentage of timeout errors in logs',
		subheader: 'Monitor your logs for errors',
		link:
			'https://signoz.io/docs/alerts-management/log-based-alerts/?utm_source=product&utm_medium=alert-empty-page#1-alert-when-percentage-of-redis-timeout-error-logs-greater-than-7-in-last-5-mins',
	},
	{
		header: 'Alert on high error percentage of an endpoint',
		subheader: 'Monitor your API endpoint',
		link:
			'https://signoz.io/docs/alerts-management/metrics-based-alerts/?utm_source=product&utm_medium=alert-empty-page#3-alert-when-the-error-percentage-for-an-endpoint-exceeds-5',
	},
];
