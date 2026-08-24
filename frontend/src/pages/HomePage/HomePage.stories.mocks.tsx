import { rest } from 'msw';

import {
	countControl,
	choiceControl,
	multiChoiceControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	buildAlertRules,
	buildServices,
	homeFeatureFlags,
	homeUserPreferences,
	HOME_CHECKLIST_STEPS,
	isSavedViewSignal,
	metricsOnboardingResponse,
	queryRangeV5ScalarResponse,
	recentDashboardsResponse,
	SAVED_VIEW_SIGNALS,
	type SavedViewSignal,
	savedViewsResponse,
	SERVICES_SOURCES,
	type ServicesSource,
	spanMetricsResponse,
	topLevelOperationsResponse,
} from './__story_mockdata__/home';

const SIGNALS = 'Home · signals';
const ONBOARDING = 'Home · onboarding';
const LISTS = 'Home · lists';

const INGESTED_COUNT = 4213;

/** Home caps every list at five rows, so the control has to go past that. */
const LIST_MAX = 8;

const CHECKLIST_VISIBILITY = ['visible', 'dismissed'] as const;

type ChecklistVisibility = (typeof CHECKLIST_VISIBILITY)[number];

interface QueryRangeV5Body {
	compositeQuery?: { queries?: { spec?: { signal?: string } }[] };
}

/**
 * Home detects logs and traces with one `query_range` call each, told apart by
 * the signal on the query spec.
 */
const signalOf = (body: QueryRangeV5Body): string | undefined =>
	body.compositeQuery?.queries?.[0]?.spec?.signal;

export const homeMocks = defineStoryMocks({
	controls: {
		logsIngestion: toggleControl('Logs ingestion', {
			group: SIGNALS,
			value: true,
		}),
		tracesIngestion: toggleControl('Traces ingestion', {
			group: SIGNALS,
			value: true,
		}),
		metricsIngestion: toggleControl('Metrics ingestion', {
			group: SIGNALS,
			value: true,
		}),
		welcomeChecklist: choiceControl<ChecklistVisibility>('Welcome checklist', {
			group: ONBOARDING,
			description:
				'Dismissing it moves the checklist behind the header button, as "I\'ll do this later" does.',
			options: CHECKLIST_VISIBILITY,
			value: 'visible',
		}),
		skippedSteps: multiChoiceControl('Skipped steps', {
			group: ONBOARDING,
			description: 'Steps the user chose to skip. Completion follows the data.',
			options: HOME_CHECKLIST_STEPS,
			value: [],
		}),
		alertRules: countControl('Alert rules', {
			group: LISTS,
			value: 5,
			max: LIST_MAX,
		}),
		dashboards: countControl('Recent dashboards', {
			group: LISTS,
			value: 5,
			max: LIST_MAX,
		}),
		savedViews: countControl('Saved views per signal', {
			group: LISTS,
			value: 5,
			max: LIST_MAX,
		}),
		savedViewSignals: multiChoiceControl<SavedViewSignal>('Signals with views', {
			group: LISTS,
			description:
				'Explorer tabs that have views; the rest fall back to their empty state.',
			options: SAVED_VIEW_SIGNALS,
			value: SAVED_VIEW_SIGNALS,
		}),
		services: countControl('Services', {
			group: LISTS,
			value: 6,
			max: LIST_MAX,
		}),
		servicesSource: choiceControl<ServicesSource>('Services source', {
			group: LISTS,
			description:
				'`span-metrics` turns on the feature flag that swaps the services card for the span-metrics one.',
			options: SERVICES_SOURCES,
			value: 'traces',
		}),
	},
	handlers: (values, response) => [
		rest.get('http://localhost/api/v2/metrics/onboarding', (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json(metricsOnboardingResponse(values.metricsIngestion)),
			),
		),

		rest.post('http://localhost/api/v5/query_range', async (req, res, ctx) => {
			const signal = signalOf((await req.json()) as QueryRangeV5Body);

			const isActive =
				signal === 'traces' ? values.tracesIngestion : values.logsIngestion;

			return res(
				ctx.status(200),
				ctx.json(queryRangeV5ScalarResponse(isActive ? INGESTED_COUNT : 0)),
			);
		}),

		rest.get('http://localhost/api/v1/user/preferences', (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: homeUserPreferences({
						checklistDismissed: values.welcomeChecklist === 'dismissed',
						skippedSteps: values.skippedSteps,
					}),
				}),
			),
		),

		rest.get(
			'http://localhost/api/v2/users/me/dashboards',
			response.json(() => recentDashboardsResponse(values.dashboards)),
		),

		rest.get(
			'http://localhost/api/v2/rules',
			response.json(() => ({
				status: 'success',
				data: buildAlertRules(values.alertRules),
			})),
		),

		rest.get(
			'http://localhost/api/v1/explorer/views',
			response.json((req) => {
				const sourcePage = req.url.searchParams.get('sourcePage') ?? 'logs';
				const signal = isSavedViewSignal(sourcePage) ? sourcePage : 'logs';

				return savedViewsResponse(
					values.savedViewSignals.includes(signal) ? values.savedViews : 0,
					signal,
				);
			}),
		),

		rest.post(
			'http://localhost/api/v2/services',
			response.json(() => ({
				status: 'success',
				data: buildServices(values.services),
			})),
		),

		rest.post(
			'http://localhost/api/v1/service/top_level_operations',
			response.json(() => topLevelOperationsResponse(values.services)),
		),

		rest.post(
			'http://localhost/api/v4/query_range',
			response.json(() => spanMetricsResponse()),
		),
	],
	config: ({ servicesSource }) => ({
		appContext: { featureFlags: homeFeatureFlags(servicesSource) },
	}),
});
