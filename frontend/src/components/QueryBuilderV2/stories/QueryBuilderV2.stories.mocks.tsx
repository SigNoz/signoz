/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { EditorView } from '@codemirror/view';
import {
	findSuggestion,
	typeFilter,
} from 'components/QueryBuilderV2/QueryV2/QuerySearch/stories/__story_mockdata__/querySearch.play';
import { rest } from 'msw';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import {
	type GetFieldsKeys200,
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
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
 * Appends `text` to query `A`'s aggregation editor and returns its document
 * before and after. Dispatched as a CodeMirror transaction: `userEvent.type`
 * strands the caret when the line redraws, and a transaction runs the editor's
 * own filters, which is what an input limit is.
 */
export const appendToAggregation = (
	canvasElement: HTMLElement,
	text: string,
): { before: string; after: string } => {
	const content = within(canvasElement)
		.getByTestId('query-aggregation-editor')
		.querySelector<HTMLElement>('.cm-content');
	const view = content ? EditorView.findFromDOM(content) : null;
	if (!view) {
		throw new Error('aggregation editor not mounted');
	}
	const before = view.state.doc.toString();
	view.dispatch({
		changes: { from: before.length, insert: text },
		selection: { anchor: before.length + text.length },
		userEvent: 'input.type',
	});
	// Read synchronously: the document is the editor's own verdict, before
	// React state catches up.
	return { before, after: view.state.doc.toString() };
};

export const DEFAULT_ARGS: Partial<QueryBuilderProps> = {
	panelType: PANEL_TYPES.TIME_SERIES,
	version: 'v3',
};

export const expectLogsQuery = async ({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> => {
	await expectFirstQuery(canvasElement, {
		signal: 'logs',
		aggregations: [{ expression: 'count()' }],
	});
};

export const expectTracesQuery = async ({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> => {
	await expectFirstQuery(canvasElement, { signal: 'traces' });
};

export const expectMetricsQuery = async ({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> => {
	await expectFirstQuery(canvasElement, { signal: 'metrics' });
};

export const expectMeterQuery = async ({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> => {
	await expectFirstQuery(canvasElement, { signal: 'metrics', source: 'meter' });
};

export const expectPanelEditorQuery = async ({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> => {
	await expectFirstQuery(canvasElement, { signal: 'logs' });
	await expect(
		within(canvasElement).getByTestId('query-data-source-selector-0'),
	).toBeVisible();
};

export const expectLogsAlertQuery = async ({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> => {
	await expectFirstQuery(canvasElement, { signal: 'logs' });
};

export const calculatedTraceFieldHandlers = [
	rest.get('http://localhost/api/v1/fields/keys', (_req, res, ctx) => {
		const body: GetFieldsKeys200 = {
			status: 'success',
			data: {
				complete: true,
				keys: {
					response_status_code: [
						{
							name: 'response_status_code',
							description:
								'Derived response status code from the HTTP/RPC status code attributes. Learn more [here](https://signoz.io/docs/traces-management/guides/derived-fields-spans/#response_status_code)',
							signal: TelemetrytypesSignalDTO.traces,
							fieldContext: TelemetrytypesFieldContextDTO.span,
							fieldDataType: TelemetrytypesFieldDataTypeDTO.string,
						},
						{
							name: 'response_status_code',
							signal: TelemetrytypesSignalDTO.traces,
							fieldContext: TelemetrytypesFieldContextDTO.attribute,
							fieldDataType: TelemetrytypesFieldDataTypeDTO.string,
						},
					],
				},
			},
		};
		return res(ctx.status(200), ctx.json(body));
	}),
];

export const showCalculatedTraceFieldInfo = async ({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> => {
	await typeFilter(canvasElement, 'attribute.response_status');
	await findSuggestion(canvasElement, 'attribute.response_status_code');
	await expect(
		within(canvasElement).queryByTestId('calculated-trace-field-info'),
	).toBeNull();

	const editor = canvasElement.querySelector<HTMLElement>(
		'.code-mirror-where-clause .cm-content',
	);
	const view = editor ? EditorView.findFromDOM(editor) : null;
	if (!view) {
		throw new Error('filter editor not mounted');
	}
	view.dispatch({
		changes: { from: 0, to: view.state.doc.length, insert: '' },
		selection: { anchor: 0 },
	});
	await typeFilter(canvasElement, 'span.response_status');
	await findSuggestion(canvasElement, 'span.response_status_code');
	await userEvent.keyboard('{ArrowDown}');
	const info = await within(canvasElement).findByTestId(
		'calculated-trace-field-info',
		undefined,
		{ timeout: 15_000 },
	);
	await expect(info).toHaveTextContent(
		'Derived response status code from the HTTP/RPC status code attributes.',
	);
	await expect(
		within(info).getByTestId('calculated-trace-field-docs'),
	).toHaveAttribute(
		'href',
		'https://signoz.io/docs/traces-management/guides/derived-fields-spans/#response_status_code',
	);
};
