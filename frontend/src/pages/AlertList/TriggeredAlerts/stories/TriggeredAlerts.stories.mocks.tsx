/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	SEVERITY_CHOICES,
	TRIGGERED_ALERT_MAX,
	TRIGGERED_STATES,
	triggeredAlertsResponse,
	type SeverityChoice,
	type TriggeredState,
} from '../../stories/__story_mockdata__/alerts';
import { AlertListTabs } from '../../types';

const LIST = 'Triggered alerts · list';

export const triggeredAlertsMocks = defineStoryMocks({
	controls: {
		alerts: countControl('Triggered alerts', {
			group: LIST,
			value: 9,
			max: TRIGGERED_ALERT_MAX,
		}),
		alertSeverity: choiceControl<SeverityChoice>('Severity', {
			group: LIST,
			description:
				'The severity label every alert carries. `mixed` leaves each alert with its own, which is what the tag filter has something to narrow.',
			options: SEVERITY_CHOICES,
			value: 'mixed',
		}),
		alertState: choiceControl<TriggeredState>('Alert state', {
			group: LIST,
			description: 'Suppressed alerts are the ones a silence is holding back.',
			options: TRIGGERED_STATES,
			value: 'mixed',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/alerts',
			response.json(() =>
				triggeredAlertsResponse(values.alerts, {
					severity: values.alertSeverity,
					state: values.alertState,
				}),
			),
		),
	],
	config: () => ({ route: `/alerts?tab=${AlertListTabs.TRIGGERED_ALERTS}` }),
});

/**
 * Long enough that the column can only fit the first badge, so the rest land in
 * the overflow tooltip as one joined line.
 */
const OVERFLOW_LABELS: Record<string, string> = {
	environment: 'production-eu-central-1',
	team: 'platform-observability-oncall',
	owner: 'sre-primary@signoz.io',
	runbook: 'runbooks.internal.example.com/checkout/latency-budget',
	tier: 'tier-0-revenue-critical',
	compliance: 'soc2-type-2-in-scope',
};

export const overflowingLabels = rest.get(
	'http://localhost/api/v1/alerts',
	(_req, res, ctx) => {
		const list = triggeredAlertsResponse(3, {
			severity: 'mixed',
			state: 'mixed',
		});

		return res(
			ctx.status(200),
			ctx.json({
				...list,
				data: list.data.map((alert) => ({
					...alert,
					labels: { ...alert.labels, ...OVERFLOW_LABELS },
				})),
			}),
		);
	},
);
