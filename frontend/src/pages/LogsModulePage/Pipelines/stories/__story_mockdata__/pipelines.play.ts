/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent, within } from 'storybook/test';

import type { PipelinesArgs } from '../Pipelines.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: PipelinesArgs;
}

/** The page fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/** Every play starts from a pipeline row, which only a loaded, non-empty list has. */
const listsPipelines = (args: PipelinesArgs): boolean =>
	args.dataState === 'loaded' && args.pipelines > 0;

/** A pipeline without processors has no preview action. */
const previewsPipelines = (args: PipelinesArgs): boolean =>
	listsPipelines(args) && args.processors > 0;

/** Row actions repeat per pipeline, so a play that opens one takes the first. */
const clickFirst = async (
	canvasElement: HTMLElement,
	testId: string,
): Promise<void> => {
	const [action] = await within(canvasElement).findAllByTestId(
		testId,
		undefined,
		untilLoaded,
	);

	await userEvent.click(action);
};

/**
 * Editing is a mode the whole table is in: the row actions, the drag handles and
 * the save bar only exist inside it.
 */
const enterEditMode = async (canvasElement: HTMLElement): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByText(
			/enter edit mode/i,
			undefined,
			untilLoaded,
		),
	);
};

const openNewPipelineForm = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	await enterEditMode(canvasElement);
	await userEvent.click(
		await within(canvasElement).findByText(/add a new pipeline/i),
	);
	await screen.findByText(/create new pipeline/i);
};

const openNewProcessorForm = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	await enterEditMode(canvasElement);
	await clickFirst(canvasElement, 'pipeline-row-expand');
	await userEvent.click(await screen.findByText(/add processor/i));
	await screen.findByText(/create new processor/i);
};

const openPreview = async (canvasElement: HTMLElement): Promise<void> => {
	await clickFirst(canvasElement, 'pipeline-preview-action');
	await screen.findByText(/processed output/i, undefined, untilLoaded);
};

/** The filter is an antd select: focusing its input opens the suggestions. */
const focusPipelineFilter = async (): Promise<HTMLElement> => {
	const [filter] = await screen.findAllByTestId('qb-search-select');
	const input = within(filter).getByRole('combobox');

	await userEvent.click(input);

	return input;
};

export const expandProcessors = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsPipelines(args)) {
		return;
	}

	await clickFirst(canvasElement, 'pipeline-row-expand');
};

export const openEditMode = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsPipelines(args)) {
		return;
	}

	await enterEditMode(canvasElement);
};

export const openAddPipeline = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsPipelines(args)) {
		return;
	}

	await openNewPipelineForm(canvasElement);
};

export const suggestPipelineFilterKeys = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsPipelines(args)) {
		return;
	}

	await openNewPipelineForm(canvasElement);
	await focusPipelineFilter();
	await screen.findAllByText('service.name', undefined, untilLoaded);
};

export const suggestPipelineFilterValues = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsPipelines(args)) {
		return;
	}

	await openNewPipelineForm(canvasElement);
	await userEvent.type(await focusPipelineFilter(), 'service.name = ');
	await screen.findAllByText('checkout', undefined, untilLoaded);
};

export const openEditPipeline = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsPipelines(args)) {
		return;
	}

	await enterEditMode(canvasElement);
	await clickFirst(canvasElement, 'pipeline-edit-action');
	await screen.findByText(/edit pipeline/i);
};

export const openAddProcessor = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsPipelines(args)) {
		return;
	}

	await openNewProcessorForm(canvasElement);
};

/** Severity Parser is the type whose mapping fields are CSV inputs. */
export const openSeverityParserProcessor = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsPipelines(args)) {
		return;
	}

	await openNewProcessorForm(canvasElement);
	await userEvent.click(await screen.findByText('Grok'));
	await userEvent.click(await screen.findByTitle('Severity Parser'));
	await screen.findByText('Parse Severity Value From');
};

export const openProcessingPreview = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!previewsPipelines(args)) {
		return;
	}

	await openPreview(canvasElement);
};

/** Each sample log in the preview opens in the log detail drawer. */
export const openPreviewLogDetails = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!previewsPipelines(args) || args.sampleLogs === 0) {
		return;
	}

	await openPreview(canvasElement);

	const [log] = await screen.findAllByTestId(
		'pipeline-preview-log',
		undefined,
		untilLoaded,
	);
	const expand = log.querySelector<HTMLElement>(
		'.logs-preview-list-item-expand',
	);

	if (!expand) {
		throw new Error('Preview log has no expand control');
	}

	await userEvent.click(expand);
	await screen.findByTestId('log-detail-drawer', undefined, untilLoaded);
};

export const openChangeHistory = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.dataState !== 'loaded') {
		return;
	}

	const canvas = within(canvasElement);

	await userEvent.click(
		await canvas.findByText(/change history/i, undefined, untilLoaded),
	);
	await canvas.findByText('Deployment Stage', undefined, untilLoaded);
};
