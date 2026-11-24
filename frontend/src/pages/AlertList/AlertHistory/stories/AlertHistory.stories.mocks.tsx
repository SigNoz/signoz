/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { TIMELINE_TABLE_PAGE_SIZE } from 'container/AlertHistory/constants';
import { rest } from 'msw';

import { buildRuleReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';

import { grantsAll } from '@/storybook/access/access';
import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	RELATED_EXPLORERS,
	ruleHistoryFilterKeysResponse,
	ruleHistoryFilterValuesResponse,
	ruleHistoryOverallStatusResponse,
	ruleHistoryStatsResponse,
	ruleHistoryTimelineResponse,
	ruleHistoryTopContributorsResponse,
	TIMELINE_MAX,
	TOP_CONTRIBUTOR_MAX,
	type HistoryWindow,
	type RelatedExplorer,
} from './__story_mockdata__/alertHistory';

import {
	alertRuleByIdResponse,
	notificationChannelsResponse,
	CHANNEL_MAX,
	FIRST_RULE_NAME,
} from '../../stories/__story_mockdata__/alerts';

const STORY_RULE_ID = 'rule-1';
const STORY_RELATIVE_TIME = '6h';

const STATISTICS = 'Alert history · statistics';
const TIMELINE = 'Alert history · timeline';

const TELEMETRY_ACCESS = ['granted', 'denied'] as const;
type TelemetryAccess = (typeof TELEMETRY_ACCESS)[number];

/** The backend's denial for a custom role without read on the queried logs. */
export const HISTORY_TELEMETRY_DENIAL =
	'user/story-user is not authorized to perform logs:read on resource "service.name"';

const denyTelemetry: Parameters<typeof rest.get>[1] = (_req, res, ctx) =>
	res(
		ctx.status(403),
		ctx.json({
			status: 'error',
			error: { code: 'authz_forbidden', message: HISTORY_TELEMETRY_DENIAL },
		}),
	);

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
		telemetryAccess: choiceControl<TelemetryAccess>('Telemetry access', {
			group: TIMELINE,
			description:
				'Whether the role reads the telemetry the rule queries. `denied` answers the timeline, the top contributors and the filter suggestions with the 403 only the server can raise.',
			options: TELEMETRY_ACCESS,
			value: 'granted',
		}),
		statusWindows: countControl('Status bands', {
			group: TIMELINE,
			description: 'How finely the graph above the table slices the window.',
			value: 30,
			max: 60,
		}),
		relatedExplorer: choiceControl<RelatedExplorer>('Related explorer', {
			group: TIMELINE,
			description:
				"Where a row's actions lead, for top contributors and timeline rows alike. The backend picks it from the rule's alert type; `none` is a metrics rule, whose actions are disabled.",
			options: RELATED_EXPLORERS,
			value: 'traces',
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
			values.telemetryAccess === 'denied'
				? denyTelemetry
				: response.json(() =>
						ruleHistoryTopContributorsResponse(
							values.topContributors,
							values.triggers,
							values.relatedExplorer,
						),
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
			values.telemetryAccess === 'denied'
				? denyTelemetry
				: response.json((req) =>
						ruleHistoryTimelineResponse({
							total: values.timelineEntries,
							limit: TIMELINE_TABLE_PAGE_SIZE,
							end: windowOf(req).end,
							ruleId: String(req.params.id),
							ruleName: FIRST_RULE_NAME,
							relatedExplorer: values.relatedExplorer,
						}),
					),
		),

		rest.get(
			'http://localhost/api/v2/rules/:id/history/filter_keys',
			values.telemetryAccess === 'denied'
				? denyTelemetry
				: response.json(() => ruleHistoryFilterKeysResponse()),
		),

		rest.get(
			'http://localhost/api/v2/rules/:id/history/filter_values',
			values.telemetryAccess === 'denied'
				? denyTelemetry
				: response.json((req) =>
						ruleHistoryFilterValuesResponse(req.url.searchParams.get('key') ?? ''),
					),
		),

		rest.get(
			'http://localhost/api/v2/rules/:id',
			response.json((req) =>
				alertRuleByIdResponse(String(req.params.id), {
					severity: 'mixed',
					state: 'mixed',
				}),
			),
		),

		rest.get(
			'http://localhost/api/v2/notification_channels',
			response.json(() => notificationChannelsResponse(CHANNEL_MAX)),
		),
	],
	config: () => ({
		route: `/alerts/history?ruleId=${STORY_RULE_ID}&relativeTime=${STORY_RELATIVE_TIME}`,
	}),
});

export type AlertHistoryArgs = PageStoryArgs<typeof alertHistoryMocks>;

export const untilLoaded = { timeout: 15_000 };

export const listsTimelineRows = (args: AlertHistoryArgs): boolean =>
	args.dataState === 'loaded' &&
	args.timelineEntries > 0 &&
	!refusesTelemetry(args) &&
	!deniesRuleRead(args);

const POPOVER_LINK_TEST_IDS: Record<RelatedExplorer, string | null> = {
	logs: 'alert-popover-view-logs',
	traces: 'alert-popover-view-traces',
	'ai-traces': 'alert-popover-view-ai-traces',
	none: null,
};

/** The popover link a row's actions open, or null when the rule has none and the actions are disabled. */
export const rowActionLinkTestId = (args: AlertHistoryArgs): string | null =>
	POPOVER_LINK_TEST_IDS[args.relatedExplorer];

/** The history loads, but the page refuses the rule for want of `read`. */
export const deniesRuleRead = (args: AlertHistoryArgs): boolean =>
	args.dataState === 'loaded' &&
	args.authzState === 'loaded' &&
	!grantsAll(args, buildRuleReadPermission(STORY_RULE_ID));

/** The page shows, and the server refuses what reads the queried telemetry. */
export const refusesTelemetry = (args: AlertHistoryArgs): boolean =>
	args.dataState === 'loaded' &&
	args.telemetryAccess === 'denied' &&
	!deniesRuleRead(args);
