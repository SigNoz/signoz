/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import { generatePath } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import { choiceControl, toggleControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	fieldKeysResponse,
	fieldValuesResponse,
} from '@/storybook/msw/__story_mockdata__/fields';
import {
	listMetricsResponse,
	metricMetadataResponse,
} from '@/storybook/msw/__story_mockdata__/metrics';

import {
	NEW_PANEL_ID,
	newPanelSearch,
} from '../../DashboardContainer/PanelEditor/newPanelRoute';
import {
	API_RESULTS,
	settle,
	type ApiResult,
} from '../../stories/__story_mockdata__/settled';
import {
	currentDashboardDocument,
	PANEL_IDS,
	patchDashboardDocument,
	seedDashboardDocument,
	STORY_DASHBOARD_ID,
	VARIABLE_KINDS,
	type DashboardArgs,
} from '../../stories/__story_mockdata__/dashboard';
import {
	emptyPanelResponse,
	NAMESPACE_VALUES,
	panelResponse,
	serviceVariableValues,
} from '../../stories/__story_mockdata__/panelData';
import {
	EDITOR_FIELD_KEYS,
	EDITOR_FIELD_VALUES,
	EDITOR_METRICS,
	NEW_PANEL_KINDS,
	newPanelKindOf,
	type NewPanelKind,
} from './__story_mockdata__/panelEditor';

const PANEL = 'Panel editor · panel';
const DATA = 'Panel editor · data';

const PANEL_OPTIONS = [...PANEL_IDS, NEW_PANEL_ID] as const;

type PanelOption = (typeof PANEL_OPTIONS)[number];

const editorRoute = (panel: PanelOption, kind: NewPanelKind): string => {
	const path = generatePath(ROUTES.DASHBOARD_PANEL_EDITOR, {
		dashboardId: STORY_DASHBOARD_ID,
		panelId: panel,
	});

	return panel === NEW_PANEL_ID
		? `${path}${newPanelSearch(newPanelKindOf(kind))}`
		: path;
};

export const panelEditorMocks = defineStoryMocks({
	controls: {
		panel: choiceControl<PanelOption>('Panel', {
			group: PANEL,
			description:
				'The panel the editor opens on. `new` is the create route, which seeds an unsaved panel of the kind below instead of loading one.',
			options: PANEL_OPTIONS,
			value: 'request-rate',
		}),
		newPanelKind: choiceControl<NewPanelKind>('New panel kind', {
			group: PANEL,
			description: 'Which kind the create route seeds. Ignored on a saved panel.',
			options: NEW_PANEL_KINDS,
			value: 'time-series',
		}),
		locked: toggleControl('Dashboard locked', {
			group: PANEL,
			description:
				'A locked dashboard is read-only, so the editor loads but Save is refused with the reason.',
			value: false,
		}),
		panelSave: choiceControl<ApiResult>('Panel save', {
			group: PANEL,
			description:
				'How the JSON Patch behind Save changes answers. `success` raises the "Panel saved" toast, `loading` never answers and leaves the button spinning.',
			options: API_RESULTS,
			value: 'success',
		}),
		noData: toggleControl('Preview returns nothing', {
			group: DATA,
			description: 'The preview query answers with an empty result.',
			value: false,
		}),
	},
	handlers: (values, response) => {
		const document: DashboardArgs = {
			panels: PANEL_IDS.length,
			sectioned: true,
			variables: VARIABLE_KINDS,
			locked: values.locked,
		};

		return [
			// The document the editor resolves its panel from, so it answers on its own
			// rather than through the Data control.
			rest.get('http://localhost/api/v2/dashboards/:id', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(currentDashboardDocument(document))),
			),

			// Saving the panel is a JSON Patch whose response replaces the cache, so
			// the ops are applied to the story's document and the edit stays.
			rest.patch('http://localhost/api/v2/dashboards/:id', (req, res, ctx) =>
				settle(values.panelSave, req, res, ctx, async () => {
					const ops = (await req.json()) as Parameters<
						typeof patchDashboardDocument
					>[1];

					return patchDashboardDocument(document, ops);
				}),
			),

			rest.post(
				'http://localhost/api/v5/query_range',
				response.json(async (req) => {
					if (values.noData) {
						return emptyPanelResponse();
					}

					const body = (await req.json()) as QueryRangeRequestV5;
					const spec = body.compositeQuery?.queries?.[0]?.spec as
						| {
								aggregations?: { metricName?: string }[];
								groupBy?: { name?: string }[];
						  }
						| undefined;

					return panelResponse({
						requestType: body.requestType,
						window: { start: body.start, end: body.end },
						metricName: spec?.aggregations?.[0]?.metricName,
						groupBy: spec?.groupBy?.[0]?.name,
					});
				}),
			),

			rest.post(
				'http://localhost/api/v2/variables/query',
				response.json(() => ({
					status: 'success',
					data: { variableValues: serviceVariableValues(4) },
				})),
			),

			rest.get(
				'http://localhost/api/v2/metrics',
				response.json((req) =>
					listMetricsResponse(
						EDITOR_METRICS,
						req.url.searchParams.get('searchText') ?? '',
					),
				),
			),

			rest.get(
				'http://localhost/api/v2/metrics/metadata',
				response.json((req) =>
					metricMetadataResponse(
						EDITOR_METRICS,
						req.url.searchParams.get('metricName') ?? '',
					),
				),
			),

			rest.get(
				'http://localhost/api/v1/fields/keys',
				response.json(() => fieldKeysResponse(EDITOR_FIELD_KEYS)),
			),

			rest.get(
				'http://localhost/api/v1/fields/values',
				response.json((req) =>
					fieldValuesResponse(
						EDITOR_FIELD_VALUES[req.url.searchParams.get('name') ?? ''] ??
							NAMESPACE_VALUES,
					),
				),
			),
		];
	},
	config: (values) => ({
		route: editorRoute(values.panel, values.newPanelKind),
	}),
	effect: (values) => {
		seedDashboardDocument({
			panels: PANEL_IDS.length,
			sectioned: true,
			variables: VARIABLE_KINDS,
			locked: values.locked,
		});
	},
});

export const savePanel = async (): Promise<void> => {
	const save = await screen.findByTestId(
		'panel-editor-v2-save',
		{},
		{ timeout: 10000 },
	);

	await waitFor(() => expect(save).toBeEnabled(), { timeout: 10000 });
	await userEvent.click(save);
};

// The editor resolves its panel from the dashboard document before it renders.
const PAGE_LOAD = { timeout: 10000 };

/**
 * Opens a display-options section and scrolls it to the top of the pane, where
 * a screenshot of the viewport can see it. Returns the section to query in.
 */
export const expandSection = async (title: string): Promise<HTMLElement> => {
	// The toggle's test id is the title, lowercased, with whitespace as dashes.
	const toggle = await screen.findByTestId(
		`config-section-${title.toLowerCase().replace(/\s+/g, '-')}`,
		{},
		PAGE_LOAD,
	);

	if (toggle.getAttribute('aria-expanded') !== 'true') {
		await userEvent.click(toggle);
	}
	toggle.scrollIntoView({ block: 'start' });

	return toggle.closest('section') ?? document.body;
};

/** Picks one tile of a radio-tile control by its value. */
export const pickSegment = async (
	testId: string,
	value: string,
): Promise<void> => {
	const radio = (): HTMLElement =>
		within(screen.getByTestId(`${testId}-${value}`)).getByRole('radio');

	// A pick made while the editor still seeds its draft from the panel is
	// dropped, so it is made again until it holds.
	await waitFor(async () => {
		if (!(radio() as HTMLInputElement).checked) {
			await userEvent.click(radio());
		}
		await expect(radio()).toBeChecked();
	}, PAGE_LOAD);
};

/**
 * The pane's pickers are antd Selects: the element carrying the test id does
 * nothing on click, the combobox inside it is what opens the list.
 */
export const openConfigSelect = async (testId: string): Promise<void> => {
	const select = await screen.findByTestId(testId, {}, PAGE_LOAD);

	await userEvent.click(within(select).getByRole('combobox'));
};

/**
 * Opens Thresholds and adds one row through the section's own button, whose
 * test id depends on the panel kind.
 */
export const addThreshold = async (
	testId = 'panel-editor-v2-add-threshold',
): Promise<void> => {
	const section = await expandSection('Thresholds');

	await userEvent.click(within(section).getByTestId(testId));
};

export const openLinkDialog = async (): Promise<void> => {
	const section = await expandSection('Context Links');

	// The header's quick add carries the same name, so the body button goes by id.
	await userEvent.click(within(section).getByTestId('panel-editor-v2-add-link'));
	await screen.findByTestId('context-link-dialog');
};
