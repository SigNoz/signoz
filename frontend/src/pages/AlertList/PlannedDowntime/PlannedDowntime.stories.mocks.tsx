/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	DOWNTIME_KINDS,
	DOWNTIME_MAX,
	downtimeSchedulesResponse,
	type DowntimeKind,
} from './__story_mockdata__/plannedDowntime';

import { alertRulesResponse, RULE_MAX } from '../__story_mockdata__/alerts';
import { AlertListSubTabs, AlertListTabs } from '../types';

const LIST = 'Planned downtime · list';

export const plannedDowntimeMocks = defineStoryMocks({
	controls: {
		schedules: countControl('Planned downtimes', {
			group: LIST,
			value: 4,
			max: DOWNTIME_MAX,
		}),
		downtimeKind: choiceControl<DowntimeKind>('Kind', {
			group: LIST,
			description:
				'A recurring downtime carries a repeat rule instead of an end time, which is what the Repeats row shows.',
			options: DOWNTIME_KINDS,
			value: 'mixed',
		}),
		silencedRules: countControl('Alert rules to silence', {
			group: LIST,
			description:
				'The rules the form offers, and the names a downtime resolves its silenced ids to.',
			value: 8,
			max: RULE_MAX,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/downtime_schedules',
			response.json(() =>
				downtimeSchedulesResponse(values.schedules, values.downtimeKind),
			),
		),

		rest.post('http://localhost/api/v1/downtime_schedules', (_req, res, ctx) =>
			res(ctx.status(201), ctx.json({ status: 'success', data: null })),
		),

		rest.put('http://localhost/api/v1/downtime_schedules/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),

		rest.delete(
			'http://localhost/api/v1/downtime_schedules/:id',
			(_req, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),

		rest.get(
			'http://localhost/api/v2/rules',
			response.json(() =>
				alertRulesResponse(values.silencedRules, {
					severity: 'mixed',
					state: 'mixed',
				}),
			),
		),
	],
	config: () => ({
		route: `/alerts?tab=${AlertListTabs.CONFIGURATION}&subTab=${AlertListSubTabs.PLANNED_DOWNTIME}`,
	}),
});
