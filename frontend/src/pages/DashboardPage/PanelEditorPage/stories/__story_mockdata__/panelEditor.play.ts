/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { EQueryType } from 'types/common/dashboard';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { openConfigSelect, savePanel } from '../PanelEditorPage.stories.mocks';

const EDITOR_LOAD = { timeout: 10_000 };

interface PlayContext {
	canvasElement: HTMLElement;
	args: { panelSave?: string; dataState?: string };
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

	await openConfigSelect('heatmap-field-select');
	if (args.dataState === 'loaded') {
		await screen.findByTitle('attribute.retry.count', undefined, EDITOR_LOAD);
	}
};
