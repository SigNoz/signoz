/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';
import { userEvent, within } from 'storybook/test';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	alertFieldKeysResponse,
	alertFieldValuesResponse,
	alertMetricMetadataResponse,
	alertMetricsResponse,
	alertPreviewSeries,
} from '../../AlertList/stories/__story_mockdata__/alertQuery';
import {
	alertRuleByIdResponse,
	ALERT_SCHEMAS,
	channelsResponse,
	CHANNEL_MAX,
	type AlertSchema,
} from '../../AlertList/stories/__story_mockdata__/alerts';

const STORY_RULE_ID = 'rule-1';

const RULE = 'Edit rule · rule';

export const editRulesMocks = defineStoryMocks({
	controls: {
		alertSchema: choiceControl<AlertSchema>('Alert schema', {
			group: RULE,
			description:
				'`classic` is the single-form page this route was built for. `v2` throws: the new form reads `CreateAlertProvider`, which only `pages/AlertDetails` mounts, so this route crashes on any rule saved on the current schema.',
			options: ALERT_SCHEMAS,
			value: 'classic',
		}),
		channels: countControl('Notification channels', {
			group: RULE,
			value: 5,
			max: CHANNEL_MAX,
		}),
		previewSeries: countControl('Preview series', {
			group: RULE,
			description: 'Lines the chart above the condition draws.',
			value: 3,
			max: 6,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/rules/:id',
			response.json((req) =>
				alertRuleByIdResponse(String(req.params.id), {
					severity: 'critical',
					state: 'firing',
					schema: values.alertSchema,
				}),
			),
		),

		rest.put('http://localhost/api/v2/rules/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),

		rest.post('http://localhost/api/v2/rules/test', (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: { alertCount: 2, message: 'Rule tested against the last 6 hours' },
				}),
			),
		),

		rest.get(
			'http://localhost/api/v1/channels',
			response.json(() => channelsResponse(values.channels)),
		),

		rest.post(
			'http://localhost/api/v5/query_range',
			response.json(async (req) => alertPreviewSeries(values.previewSeries, req)),
		),

		rest.get(
			'http://localhost/api/v2/metrics',
			response.json((req) =>
				alertMetricsResponse(req.url.searchParams.get('searchText') ?? ''),
			),
		),

		rest.get(
			'http://localhost/api/v2/metrics/metadata',
			response.json((req) =>
				alertMetricMetadataResponse(req.url.searchParams.get('metricName') ?? ''),
			),
		),

		rest.get(
			'http://localhost/api/v1/fields/keys',
			response.json((req) =>
				alertFieldKeysResponse(req.url.searchParams.get('searchText') ?? ''),
			),
		),

		rest.get(
			'http://localhost/api/v1/fields/values',
			response.json((req) =>
				alertFieldValuesResponse(
					req.url.searchParams.get('name') ?? '',
					req.url.searchParams.get('searchText') ?? '',
				),
			),
		),
	],
	config: () => ({
		route: `${ROUTES.EDIT_ALERTS}?ruleId=${STORY_RULE_ID}&relativeTime=6h`,
	}),
});

/** The page fetches the rule before it renders the form, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

const LABEL_INPUT = 'alert-labels-input-v1';

/** The labels field, scrolled into view once the rule has loaded. */
export const findLabelInput = async (
	canvasElement: HTMLElement,
): Promise<HTMLElement> => {
	const input = await within(canvasElement).findByTestId(
		LABEL_INPUT,
		undefined,
		untilLoaded,
	);
	input.scrollIntoView({ block: 'center' });
	return input;
};

export const removeLabel = async (
	canvasElement: HTMLElement,
	label: string,
): Promise<void> => {
	const chip = within(canvasElement)
		.getByText(label)
		.closest<HTMLElement>('[data-slot="badge"]');

	if (!chip) {
		throw new Error(`Label ${label} did not render`);
	}

	await userEvent.click(within(chip).getByRole('button'));
};
