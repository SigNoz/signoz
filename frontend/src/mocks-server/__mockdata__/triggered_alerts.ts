import type { AlertmanagertypesDeprecatedGettableAlertDTO } from 'api/generated/services/sigNoz.schemas';

export const triggeredAlertsFixture: AlertmanagertypesDeprecatedGettableAlertDTO[] =
	[
		{
			fingerprint: 'fp-critical-1',
			startsAt: '2023-10-19T10:00:00Z',
			endsAt: '0001-01-01T00:00:00Z',
			generatorURL: 'http://localhost/alerts/edit?ruleId=rule-1&panelTypes=graph',
			labels: {
				alertname: 'High CPU Usage',
				severity: 'critical',
				ruleId: 'rule-1',
				service: 'frontend',
				env: 'prod',
			},
			annotations: {
				summary: 'CPU above 90%',
				description: 'Frontend CPU usage critical',
			},
			status: { state: 'active', silencedBy: [], inhibitedBy: [] },
			receivers: ['slack'],
		},
		{
			fingerprint: 'fp-warning-1',
			startsAt: '2023-10-19T09:00:00Z',
			endsAt: '0001-01-01T00:00:00Z',
			generatorURL: 'http://localhost/alerts/edit?ruleId=rule-2',
			labels: {
				alertname: 'Memory Warning',
				severity: 'warning',
				ruleId: 'rule-2',
				service: 'backend',
				env: 'prod',
			},
			annotations: { summary: 'Memory high' },
			status: { state: 'active', silencedBy: [], inhibitedBy: [] },
			receivers: ['slack'],
		},
		{
			fingerprint: 'fp-info-1',
			startsAt: '2023-10-19T08:00:00Z',
			endsAt: '0001-01-01T00:00:00Z',
			generatorURL: 'http://localhost/alerts/edit?ruleId=rule-3',
			labels: {
				alertname: 'Disk Slow',
				severity: 'info',
				ruleId: 'rule-3',
				service: 'frontend',
				env: 'staging',
			},
			annotations: { summary: 'Disk slow' },
			status: { state: 'unprocessed', silencedBy: [], inhibitedBy: [] },
			receivers: ['email'],
		},
		{
			fingerprint: 'fp-suppressed-1',
			startsAt: '2023-10-19T07:00:00Z',
			endsAt: '0001-01-01T00:00:00Z',
			generatorURL: 'http://localhost/alerts/edit?ruleId=rule-4',
			labels: {
				alertname: 'Network Hiccup',
				severity: 'error',
				ruleId: 'rule-4',
				service: 'backend',
				env: 'dev',
			},
			annotations: { summary: 'Network errors' },
			status: { state: 'suppressed', silencedBy: ['s-1'], inhibitedBy: [] },
			receivers: ['pagerduty'],
		},
		{
			fingerprint: 'fp-noseverity',
			startsAt: '2023-10-19T06:00:00Z',
			endsAt: '0001-01-01T00:00:00Z',
			labels: {
				alertname: 'Unknown Alert',
				service: 'misc',
			},
			annotations: {},
			status: { state: 'active', silencedBy: [], inhibitedBy: [] },
			receivers: [],
		},
	];

// Bigger fixture for pagination tests (15 entries → 2 pages at limit=10).
export const triggeredAlertsPaginationFixture: AlertmanagertypesDeprecatedGettableAlertDTO[] =
	Array.from({ length: 15 }, (_, i) => ({
		fingerprint: `fp-pag-${i}`,
		startsAt: `2023-10-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
		endsAt: '0001-01-01T00:00:00Z',
		generatorURL: `http://localhost/alerts/edit?ruleId=rule-pag-${i}`,
		labels: {
			alertname: `Pag Alert ${i}`,
			severity: i % 2 === 0 ? 'critical' : 'warning',
			ruleId: `rule-pag-${i}`,
			service: 'frontend',
		},
		annotations: {},
		status: { state: 'active', silencedBy: [], inhibitedBy: [] },
		receivers: [],
	}));
