/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { TIMELINE_TABLE_PAGE_SIZE } from 'container/AlertHistory/constants';
import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	ruleHistoryFilterKeysResponse,
	ruleHistoryFilterValuesResponse,
	ruleHistoryOverallStatusResponse,
	ruleHistoryStatsResponse,
	ruleHistoryTimelineResponse,
	ruleHistoryTopContributorsResponse,
	TIMELINE_MAX,
	TOP_CONTRIBUTOR_MAX,
	type HistoryWindow,
} from './__story_mockdata__/alertHistory';

import {
	alertRuleByIdResponse,
	ALERT_SCHEMAS,
	channelsResponse,
	CHANNEL_MAX,
	FIRST_RULE_NAME,
	type AlertSchema,
} from '../__story_mockdata__/alerts';

const STORY_RULE_ID = 'rule-1';
const STORY_RELATIVE_TIME = '6h';

const STATISTICS = 'Alert history · statistics';
const TIMELINE = 'Alert history · timeline';

/** Every history endpoint is asked for the same window the page resolved. */
const windowOf = (req: { url: URL }): HistoryWindow => {
	const end = Number(req.url.searchParams.get('end'));
	const start = Number(req.url.searchParams.get('start'));

	return { start, end };
};

export const alertHistoryMocks = defineStoryMocks({
	controls: {
		triggers: countControl('Times triggered', {
			group: STATISTICS,
			description:
				'Drives the Total Triggered card, the trigger sparkline and the counts the top contributors add up to. Zero is the card that says nothing fired.',
			value: 48,
			max: 200,
		}),
		resolutionMinutes: countControl('Avg. resolution, minutes', {
			group: STATISTICS,
			description: 'Zero is the card that says nothing was resolved.',
			value: 22,
			max: 180,
		}),
		topContributors: countControl('Top contributors', {
			group: STATISTICS,
			description: 'The label sets that fired most often in the window.',
			value: 5,
			max: TOP_CONTRIBUTOR_MAX,
		}),
		timelineEntries: countControl('Timeline entries', {
			group: TIMELINE,
			description: `The table pages at ${TIMELINE_TABLE_PAGE_SIZE}, so anything past that is a second page.`,
			value: 26,
			max: TIMELINE_MAX,
		}),
		statusWindows: countControl('Status bands', {
			group: TIMELINE,
			description: 'How finely the graph above the table slices the window.',
			value: 30,
			max: 60,
		}),
		alertSchema: choiceControl<AlertSchema>('Alert schema', {
			group: TIMELINE,
			description:
				'Which form the Overview tab opens the rule in. The history tab only shows it in the breadcrumb and the header.',
			options: ALERT_SCHEMAS,
			value: 'v2',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/rules/:id/history/stats',
			response.json((req) =>
				ruleHistoryStatsResponse(
					windowOf(req),
					values.triggers,
					values.resolutionMinutes,
				),
			),
		),

		rest.get(
			'http://localhost/api/v2/rules/:id/history/top_contributors',
			response.json(() =>
				ruleHistoryTopContributorsResponse(values.topContributors, values.triggers),
			),
		),

		rest.get(
			'http://localhost/api/v2/rules/:id/history/overall_status',
			response.json((req) =>
				ruleHistoryOverallStatusResponse(windowOf(req), values.statusWindows),
			),
		),

		rest.get(
			'http://localhost/api/v2/rules/:id/history/timeline',
			response.json((req) =>
				ruleHistoryTimelineResponse({
					total: values.timelineEntries,
					limit: TIMELINE_TABLE_PAGE_SIZE,
					end: windowOf(req).end,
					ruleId: String(req.params.id),
					ruleName: FIRST_RULE_NAME,
				}),
			),
		),

		rest.get(
			'http://localhost/api/v2/rules/:id/history/filter_keys',
			response.json(() => ruleHistoryFilterKeysResponse()),
		),

		rest.get(
			'http://localhost/api/v2/rules/:id/history/filter_values',
			response.json((req) =>
				ruleHistoryFilterValuesResponse(req.url.searchParams.get('key') ?? ''),
			),
		),

		rest.get(
			'http://localhost/api/v2/rules/:id',
			response.json((req) =>
				alertRuleByIdResponse(String(req.params.id), {
					severity: 'mixed',
					state: 'mixed',
					schema: values.alertSchema,
				}),
			),
		),

		rest.get(
			'http://localhost/api/v1/channels',
			response.json(() => channelsResponse(CHANNEL_MAX)),
		),
	],
	config: () => ({
		route: `/alerts/history?ruleId=${STORY_RULE_ID}&relativeTime=${STORY_RELATIVE_TIME}`,
	}),
});
