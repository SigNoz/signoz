/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	DOWNTIME_KINDS,
	DOWNTIME_MAX,
	type DowntimeKind,
	downtimeSchedulesResponse,
	FIRST_DOWNTIME_NAME,
} from './__story_mockdata__/plannedDowntime';

import { alertRulesPage } from '../../AlertRules/stories/__story_mockdata__/ruleViews';
import { RULE_MAX } from '../../stories/__story_mockdata__/alerts';
import { AlertListSubTabs, AlertListTabs } from '../../types';

const LIST = 'Planned downtime · list';
const REQUEST = 'Planned downtime · requests';

const REQUEST_STATES = ['loaded', 'error'] as const;
type RequestState = (typeof REQUEST_STATES)[number];

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
		schedulesState: choiceControl<RequestState>('Schedules request', {
			group: REQUEST,
			options: REQUEST_STATES,
			value: 'loaded',
		}),
		rulesState: choiceControl<RequestState>('Alert rules request', {
			group: REQUEST,
			options: REQUEST_STATES,
			value: 'loaded',
		}),
	},
	handlers: (values, _response) => [
		rest.get('http://localhost/api/v1/downtime_schedules', (_req, res, ctx) =>
			values.schedulesState === 'error'
				? res(ctx.status(500), ctx.json({ status: 'error' }))
				: res(
						ctx.json(
							downtimeSchedulesResponse(values.schedules, values.downtimeKind),
						),
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

		rest.get('http://localhost/api/v3/rules', (req, res, ctx) => {
			if (values.rulesState === 'error') {
				return res(ctx.status(500), ctx.json({ status: 'error' }));
			}
			return res(
				ctx.json(
					alertRulesPage(
						values.silencedRules,
						{ severity: 'mixed', state: 'mixed' },
						req.url.searchParams,
					),
				),
			);
		}),
	],
	config: () => ({
		route: `/alerts?tab=${AlertListTabs.CONFIGURATION}&subTab=${AlertListSubTabs.PLANNED_DOWNTIME}`,
	}),
});

/** The page fetches before it renders a row, which outlasts the 1s default. */
export const untilLoaded = { timeout: 15_000 };

export const clickFirstRowAction = async (
	canvasElement: HTMLElement,
	action: 'edit' | 'delete',
): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: `Actions for ${FIRST_DOWNTIME_NAME}` },
			untilLoaded,
		),
	);
	const row = await screen.findByRole(
		'menuitem',
		{ name: action === 'edit' ? 'Edit' : 'Delete' },
		untilLoaded,
	);
	// A gated row stays inert until its permission check answers.
	await waitFor(
		() =>
			expect(
				row.hasAttribute('data-loading') || row.hasAttribute('data-disabled'),
			).toBe(false),
		untilLoaded,
	);
	await userEvent.click(row);
};
