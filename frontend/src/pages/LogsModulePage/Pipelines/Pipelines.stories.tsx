import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { pipelinesMocks } from './Pipelines.stories.mocks';

import LogsModulePage from '../LogsModulePage';

type PipelinesArgs = PageStoryArgs<typeof pipelinesMocks>;

const pageStory = storyMocks(pipelinesMocks);

/**
 * Log processing pipelines: the operators each runs, the sample preview, the
 * deploy state and the version history.
 *
 * Route: `/logs/pipelines`.
 */
const meta = {
	title: 'Pages/Logs/Pipelines',
	tags: ['play'],
	component: LogsModulePage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<PipelinesArgs>;

export default meta;

type Story = StoryObj<PipelinesArgs>;

/** The page fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/** Row actions repeat per pipeline, so a story that opens one takes the first. */
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

/**
 * The pipelines tab: the processors the org runs over logs before storing them,
 * in the order they run, with the version that is deployed on the collector.
 */
export const Default: Story = {};

/** A workspace with no pipeline yet, which is where the tab explains itself. */
export const NoPipelines: Story = {
	args: { pipelines: 0 },
};

/** A pipeline opened up: the operators it runs, in order. */
export const ExpandedProcessors: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await clickFirst(canvasElement, 'pipeline-row-expand');
	},
};

/** Edit mode: rows can be reordered, switched off, edited and deleted. */
export const EditMode: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await enterEditMode(canvasElement);
	},
};

/** The form a new pipeline is written in: what it matches and what to call it. */
export const AddPipeline: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await enterEditMode(canvasElement);
		await userEvent.click(
			await within(canvasElement).findByText(/add a new pipeline/i),
		);
		await screen.findByText(/create new pipeline/i);
	},
};

/** The same form over an existing pipeline, filter included. */
export const EditPipeline: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await enterEditMode(canvasElement);
		await clickFirst(canvasElement, 'pipeline-edit-action');
		await screen.findByText(/edit pipeline/i);
	},
};

/** Adding an operator to a pipeline: the type decides the rest of the form. */
export const AddProcessor: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await enterEditMode(canvasElement);
		await clickFirst(canvasElement, 'pipeline-row-expand');
		await userEvent.click(await screen.findByText(/add processor/i));
		await screen.findByText(/create new processor/i);
	},
};

/**
 * The logs a pipeline matches, over the interval the preview asks for, with the
 * simulation of its processors one click away.
 */
export const ProcessingPreview: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await clickFirst(canvasElement, 'pipeline-preview-action');
		await screen.findByText(/processed output/i, undefined, untilLoaded);
	},
};

/** Every config version the org deployed, and how each deployment went. */
export const ChangeHistory: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/change history/i,
				undefined,
				untilLoaded,
			),
		);
	},
};

/** A deployment the collector has not finished, which the page polls for. */
export const Deploying: Story = {
	args: { deployStatus: 'IN_PROGRESS' },
};
