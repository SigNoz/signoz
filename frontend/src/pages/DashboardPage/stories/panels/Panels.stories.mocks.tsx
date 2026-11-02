/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import ROUTES from 'constants/routes';
import { buildRoutePath } from 'lib/router/buildRoutePath';
import {
	DashboardtypesHeatmapPaletteDTO as HeatmapPalette,
	DashboardtypesHeatmapYScaleDTO as HeatmapYScale,
	DashboardtypesLegendPositionDTO as LegendPosition,
	DashboardtypesLineStyleDTO as LineStyle,
	DashboardtypesStackModeDTO as StackMode,
	DashboardtypesTextAlignDTO as TextAlign,
} from 'api/generated/services/sigNoz.schemas';
import { useDashboardPreferencesStore } from 'hooks/dashboard/useDashboardPreference';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import { publicDashboardMeta } from '../__story_mockdata__/publicDashboard';

import {
	BUCKET_WIDTHS,
	GAPS,
	HEATMAP_COUNT_RANGES,
	HEATMAP_FIXED_COUNTS,
	HEATMAP_PALETTES,
	HEATMAP_Y_SCALES,
	LEGEND_POSITIONS,
	LINE_STYLES,
	MAX_SERIES,
	PANEL_KINDS,
	PANEL_RESULTS,
	PANELS_DASHBOARD_ID,
	SPAN_GAPS,
	STACK_MODES,
	TEXT_ALIGNS,
	TEXT_SAMPLES,
	UNITS,
	Y_SCALES,
} from './__story_mockdata__/constants';
import {
	currentPanelsDocument,
	patchPanelsDocument,
	seedPanelsDocument,
} from './__story_mockdata__/panelDocuments';
import {
	panelQueryResponse,
	recordPanelRequest,
	resetPanelRequests,
} from './__story_mockdata__/panelResponses';
import type {
	BucketWidth,
	Gaps,
	HeatmapCountRange,
	PanelArgs,
	PanelKind,
	PanelResult,
	PanelUnit,
	SpanGaps,
	TextSample,
	YScale,
} from './__story_mockdata__/types';

const PANEL = 'Panels · panel';
const DATA = 'Panels · data';

interface QueryRangeBody {
	start: number;
	end: number;
	compositeQuery?: {
		queries?: { spec?: { offset?: number; limit?: number } }[];
	};
}

export const panelsMocks = defineStoryMocks({
	controls: {
		kind: choiceControl<PanelKind>('Panel kind', {
			group: PANEL,
			description: 'The one panel the dashboard holds.',
			options: PANEL_KINDS,
			value: 'TimeSeries',
		}),
		legend: choiceControl<LegendPosition>('Legend', {
			group: PANEL,
			description: 'Legend position on the charts and the pie.',
			options: LEGEND_POSITIONS,
			value: LegendPosition.bottom,
		}),
		thresholds: toggleControl('Thresholds', {
			group: PANEL,
			description:
				'A dashed labelled line on Time Series, Bar and Area; a background colour on Number when the value is above it; a filled `A` cell on Table rows above it, never a `B` cell. Other kinds have none.',
			value: false,
		}),
		unit: choiceControl<PanelUnit>('Unit', {
			group: PANEL,
			description:
				'Formatting unit: the y axis and tooltip of the charts, the Number value, the pie total, the Table value column.',
			options: UNITS,
			value: 'ms',
		}),
		stack: choiceControl<StackMode>('Stack', {
			group: PANEL,
			description:
				'Area stacks `normal` or to `percent`; Bar stacks on anything but `none`. No effect on other kinds.',
			options: STACK_MODES,
			value: StackMode.none,
		}),
		palette: choiceControl<HeatmapPalette>('Heatmap palette', {
			group: PANEL,
			options: HEATMAP_PALETTES,
			value: HeatmapPalette.lava,
		}),
		heatmapScale: choiceControl<HeatmapYScale>('Heatmap y scale', {
			group: PANEL,
			description:
				'Row layout of the bucket axis. The buckets are linear, so `auto` lays them out linearly.',
			options: HEATMAP_Y_SCALES,
			value: HeatmapYScale.auto,
		}),
		heatmapCounts: choiceControl<HeatmapCountRange>('Heatmap count range', {
			group: PANEL,
			description: `The colour bar's bounds: from 0 to the busiest cell, or fixed at ${HEATMAP_FIXED_COUNTS.min}–${HEATMAP_FIXED_COUNTS.max}.`,
			options: HEATMAP_COUNT_RANGES,
			value: 'auto',
		}),
		bucketWidth: choiceControl<BucketWidth>('Histogram bucket width', {
			group: PANEL,
			description:
				'Width of each Histogram bin, in the series unit; `auto` picks one from the value range.',
			options: BUCKET_WIDTHS,
			value: 'auto',
		}),
		textSample: choiceControl<TextSample>('Text body', {
			group: PANEL,
			description:
				'The Text panel’s Markdown: a runbook with a heading, list, link and code block, a one-line note, or nothing written yet.',
			options: TEXT_SAMPLES,
			value: 'runbook',
		}),
		textAlign: choiceControl<TextAlign>('Text alignment', {
			group: PANEL,
			options: TEXT_ALIGNS,
			value: TextAlign.left,
		}),
		hideHeader: toggleControl('Hide text header', {
			group: PANEL,
			description:
				'The Text panel without its title strip; drag and actions move to hover.',
			value: false,
		}),
		yScale: choiceControl<YScale>('Y scale', {
			group: PANEL,
			description: 'The y axis of Time Series, Bar and Area.',
			options: Y_SCALES,
			value: 'linear',
		}),
		lineStyle: choiceControl<LineStyle>('Line style', {
			group: PANEL,
			description: 'Time Series and Area lines.',
			options: LINE_STYLES,
			value: LineStyle.solid,
		}),
		showPoints: toggleControl('Show points', {
			group: PANEL,
			description: 'A marker on every Time Series and Area sample.',
			value: false,
		}),
		spanGaps: choiceControl<SpanGaps>('Span gaps', {
			group: PANEL,
			description:
				'Time Series and Area: bridge every gap, or break the line across gaps of 10m or more. Visible with Gaps on `hole`.',
			options: SPAN_GAPS,
			value: 'bridge',
		}),
		columnUnits: toggleControl('Table column unit', {
			group: PANEL,
			description: 'Formats the Table value column in the Unit above.',
			value: false,
		}),
		result: choiceControl<PanelResult>('Query result', {
			group: DATA,
			description:
				'What `query_range` answers with: data, a successful empty result, or data with a warning in the panel header. Loading and failed come from the Data control.',
			options: PANEL_RESULTS,
			value: 'data',
		}),
		series: countControl('Series', {
			group: DATA,
			description:
				'Series on the charts, groups on the heatmap, slices on the pie, rows on the table.',
			value: 4,
			max: MAX_SERIES,
		}),
		gaps: choiceControl<Gaps>('Gaps', {
			group: DATA,
			description:
				'`hole` drops 12 of the 30 samples from the middle of every time series, a 13m gap.',
			options: GAPS,
			value: 'none',
		}),
		listRows: countControl('List rows', {
			group: DATA,
			description:
				'Log rows the List panel can page through, 25 a page; more than 25 enables Next.',
			value: 20,
			max: 80,
		}),
	},
	handlers: (values, response) => {
		const args: PanelArgs = values;

		return [
			// The document lays the panel out before it queries, so it answers on its
			// own: the Data control holds the panel, not the dashboard, in loading
			// and failed.
			rest.get('http://localhost/api/v2/dashboards/:id', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(currentPanelsDocument(args))),
			),

			rest.patch('http://localhost/api/v2/dashboards/:id', async (req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json(
						patchPanelsDocument(
							args,
							(await req.json()) as Parameters<typeof patchPanelsDocument>[1],
						),
					),
				),
			),

			rest.get('http://localhost/api/v1/dashboards/:id/public', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(publicDashboardMeta(PANELS_DASHBOARD_ID))),
			),

			rest.post(
				'http://localhost/api/v5/query_range',
				response.json(async (req) => {
					const body = (await req.json()) as QueryRangeBody;
					const spec = body.compositeQuery?.queries?.[0]?.spec;
					const request = {
						window: { start: body.start, end: body.end },
						offset: spec?.offset ?? 0,
						limit: spec?.limit ?? values.listRows,
					};
					recordPanelRequest(request);

					return panelQueryResponse({
						...request,
						kind: values.kind,
						result: values.result,
						series: values.series,
						listRows: values.listRows,
						gaps: values.gaps,
					});
				}),
			),
		];
	},
	config: () => ({
		route: buildRoutePath(ROUTES.DASHBOARD, { dashboardId: PANELS_DASHBOARD_ID }),
	}),
	effect: (values) => {
		seedPanelsDocument(values);
		resetPanelRequests();
		useDashboardPreferencesStore.setState({ preferences: {} });
	},
});
