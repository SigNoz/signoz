/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { EditorView } from '@codemirror/view';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import type { QueryBuilderV2 } from '../QueryBuilderV2';

type QueryBuilderProps = Parameters<typeof QueryBuilderV2>[0];

/** The builder's provider reads its starting query from the URL, as every host seeds it. */
export const routeWith = (path: string, query: Query): string =>
	`${path}?compositeQuery=${encodeURIComponent(JSON.stringify(query))}`;

export const meterQuery: Query = {
	...initialQueriesMap.metrics,
	builder: {
		...initialQueriesMap.metrics.builder,
		queryData: [
			{ ...initialQueriesMap.metrics.builder.queryData[0], source: 'meter' },
		],
	},
};

/** `PanelEditorQueryBuilder`'s props, less the per-kind field config. */
export const PANEL_EDITOR_ARGS: Partial<QueryBuilderProps> = {
	allowedDataSources: [
		TelemetrytypesSignalDTO.logs,
		TelemetrytypesSignalDTO.traces,
		TelemetrytypesSignalDTO.metrics,
	],
	showTraceOperator: true,
	signalSourceChangeEnabled: true,
	savePreviousQuery: true,
};

export const PANEL_EDITOR_PATH = '/dashboard/story/panel/story';

interface ProbedQuery {
	type: string;
	spec: {
		aggregations?: Record<string, unknown>[];
		[key: string]: unknown;
	};
}

/** The `compositeQuery` the story's `QueryProbe` prints for the builder's state. */
export const payloadIn = (
	canvasElement: HTMLElement,
): { queries: ProbedQuery[] } =>
	JSON.parse(
		within(canvasElement).getByTestId('qb-payload').textContent ?? '{}',
	) as { queries: ProbedQuery[] };

export const expectFirstQuery = async (
	canvasElement: HTMLElement,
	spec: Record<string, unknown>,
): Promise<void> => {
	await waitFor(() =>
		expect(payloadIn(canvasElement).queries[0]).toMatchObject({
			type: 'builder_query',
			spec: expect.objectContaining(spec),
		}),
	);
};

/** The add-on toggles query `A` offers, in order (`group_by`, `having`, …). */
export const addOnToggles = (canvasElement: HTMLElement): string[] =>
	within(within(canvasElement).getByTestId('query-A'))
		.queryAllByTestId(/^query-add-on-/)
		.map((toggle) =>
			(toggle.getAttribute('data-testid') ?? '').replace('query-add-on-', ''),
		);

/** Picks `metricName` in query `A`'s metric selector; its list portals out. */
export const selectMetric = async (
	canvasElement: HTMLElement,
	metricName: string,
): Promise<void> => {
	const field = within(canvasElement).getByTestId('metric-name-selector-0');
	const input = within(field).getByRole('combobox');
	await userEvent.click(input);
	await userEvent.type(input, metricName);
	const option = await waitFor(async () => {
		const match = Array.from(
			document.querySelectorAll<HTMLElement>(
				'.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option',
			),
		).find((candidate) => candidate.textContent?.includes(metricName));
		await expect(match).toBeDefined();
		return match as HTMLElement;
	});
	await userEvent.click(option);
	await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
};

/**
 * Appends `text` to query `A`'s aggregation editor. Dispatched as a CodeMirror
 * transaction: `userEvent.type` strands the caret when the line redraws, and a
 * transaction runs the editor's own filters, which is what an input limit is.
 */
export const appendToAggregation = (
	canvasElement: HTMLElement,
	text: string,
): void => {
	const content = within(canvasElement)
		.getByTestId('query-aggregation-editor')
		.querySelector<HTMLElement>('.cm-content');
	const view = content ? EditorView.findFromDOM(content) : null;
	if (!view) {
		throw new Error('aggregation editor not mounted');
	}
	const end = view.state.doc.length;
	view.dispatch({
		changes: { from: end, insert: text },
		selection: { anchor: end + text.length },
		userEvent: 'input.type',
	});
};

export const DEFAULT_ARGS: Partial<QueryBuilderProps> = {
	panelType: PANEL_TYPES.TIME_SERIES,
	version: 'v3',
};
