/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { EQueryType } from 'types/common/dashboard';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import {
	blurActiveElement,
	findMonacoEditor,
	setMonacoText,
} from '@/storybook/play/monacoEditor';

import {
	hasClickHouseTab,
	hasDisconnectValues,
	hasPromQLTab,
	openConfigSelect,
	type PanelEditorArgs,
	pickSegment,
	savePanel,
} from '../PanelEditorPage.stories.mocks';
import { openChartAppearance } from './chartOptions.play';

const EDITOR_LOAD = { timeout: 10_000 };

interface PlayContext {
	canvasElement: HTMLElement;
	args: PanelEditorArgs;
}

export const expandConfigSections = async ({
	canvasElement,
}: Pick<PlayContext, 'canvasElement'>): Promise<void> => {
	const canvas = within(canvasElement);

	const headers = await canvas.findAllByTestId(
		/^config-section-/,
		{},
		EDITOR_LOAD,
	);
	for (const header of headers) {
		if (header.getAttribute('aria-expanded') === 'false') {
			await userEvent.click(header);
		}
	}
	(document.activeElement as HTMLElement | null)?.blur();
	for (let el = headers[0].parentElement; el; el = el.parentElement) {
		el.scrollTop = 0;
	}
};

export const openAddColumn = async (): Promise<void> => {
	await userEvent.click(
		await screen.findByTestId('list-columns-add', undefined, EDITOR_LOAD),
	);
	await screen.findAllByTestId('list-columns-suggestion');
};

export const openPanelTypeSwitcher = async ({
	canvasElement,
}: Pick<PlayContext, 'canvasElement'>): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'panel-editor-v2-type-switcher',
			{},
			EDITOR_LOAD,
		),
	);
	await screen.findByTestId('panel-type-switcher-drawer');
};

export const changeSettings = async (
	context: Pick<PlayContext, 'canvasElement'>,
): Promise<void> => {
	const canvas = within(context.canvasElement);

	await expandConfigSections(context);
	await userEvent.click(
		await canvas.findByTestId('panel-editor-v2-log-scale-log'),
	);
	await userEvent.click(
		await canvas.findByTestId('panel-editor-v2-line-style-dashed'),
	);
};

export const saveAndExpectToast = async ({
	args,
}: Pick<PlayContext, 'args'>): Promise<void> => {
	await savePanel();
	if (args.panelSave === 'success') {
		await screen.findByText('Panel saved');
	}
};

export const openAIQueryBuilder = async ({
	canvasElement,
}: Pick<PlayContext, 'canvasElement'>): Promise<void> => {
	const canvas = within(canvasElement);

	await canvas.findByTestId('panel-editor-v2-query-builder', {}, EDITOR_LOAD);
	const aiTab = canvas.queryByTestId(
		`query-type-tab-${EQueryType.AI_QUERY_BUILDER}`,
	);
	// Kinds without an AI query type (heatmap, text) have no tab to open.
	if (!aiTab) {
		return;
	}

	const hadMetricQuery = Boolean(canvas.queryByTestId('metric-name-selector-0'));
	await userEvent.click(aiTab);
	await canvas.findByTestId('query-aggregation-editor', {}, EDITOR_LOAD);
	// The AI slot pins traces, so the builder slot's metric query is not what it shows.
	if (hadMetricQuery) {
		await waitFor(() =>
			expect(
				canvas.queryByTestId('metric-name-selector-0'),
			).not.toBeInTheDocument(),
		);
	}
};

/** Switches a new heatmap to traces and opens its field picker. */
export const pickHeatmapTracesField = async ({
	args,
}: Pick<PlayContext, 'args'>): Promise<void> => {
	await openConfigSelect('query-data-source-selector-0');
	await userEvent.click(await screen.findByTitle('Traces'));

	await userEvent.click(
		await screen.findByTestId('distribution-field-select', {}, EDITOR_LOAD),
	);
	if (args.dataState === 'loaded') {
		await screen.findByTestId(
			'distribution-field-select-item-attribute.retry.count',
			{},
			EDITOR_LOAD,
		);
	}
};

export const openClickHouseQuery = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!hasClickHouseTab(args)) {
		return;
	}

	await userEvent.click(
		await within(canvasElement).findByText('ClickHouse Query', undefined, {
			timeout: 15000,
		}),
	);
	await screen.findByText(/ClickHouse query agent skill/i, undefined, {
		timeout: 15000,
	});
	// A new query starts empty, so the editor has no text to wait for.
	await findMonacoEditor(document, '');
	blurActiveElement();
};

const CLICKHOUSE_SQL = `SELECT
    toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS ts,
    serviceName,
    count() AS value
FROM signoz_traces.distributed_signoz_index_v3
WHERE timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}}
GROUP BY ts, serviceName
ORDER BY ts`;

export const writeClickHouseQuery = async (
	context: PlayContext,
): Promise<void> => {
	if (!hasClickHouseTab(context.args)) {
		return;
	}

	await openClickHouseQuery(context);
	await setMonacoText('sql', CLICKHOUSE_SQL);
	await findMonacoEditor(document, 'distributed_signoz_index_v3');
	blurActiveElement();
};

export const openPromQLQuery = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!hasPromQLTab(args)) {
		return;
	}

	await userEvent.click(
		await within(canvasElement).findByText('PromQL', undefined, {
			timeout: 15000,
		}),
	);
	await screen.findByTestId('promql-query-input', undefined, {
		timeout: 15000,
	});
};

export const enterInvalidDisconnectThreshold = async ({
	args,
}: PlayContext): Promise<void> => {
	if (!hasDisconnectValues(args)) {
		return;
	}

	await openChartAppearance();
	await pickSegment('panel-editor-v2-span-gaps', 'threshold');
	const input = await screen.findByTestId('panel-editor-v2-span-gaps-value');

	await userEvent.clear(input);
	await userEvent.type(input, '5x');
	await screen.findByText(/enter a valid duration/i);
};
