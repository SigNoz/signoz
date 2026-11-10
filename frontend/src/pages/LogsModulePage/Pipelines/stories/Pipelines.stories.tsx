import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import { type PipelinesArgs, pipelinesMocks } from './Pipelines.stories.mocks';
import {
	expandProcessors,
	openAddPipeline,
	openAddProcessor,
	openChangeHistory,
	openEditMode,
	openEditPipeline,
	openPreviewLogDetails,
	openProcessingPreview,
	openSeverityParserProcessor,
	suggestPipelineFilterKeys,
	suggestPipelineFilterValues,
} from './__story_mockdata__/pipelines.play';

import LogsModulePage from '../../LogsModulePage';

const pageStory = storyMocks(pipelinesMocks, { layout: 'app' });

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
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<PipelinesArgs>;

export default meta;

type Story = StoryObj<PipelinesArgs>;

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
	play: expandProcessors,
};

/** Edit mode: rows can be reordered, switched off, edited and deleted. */
export const EditMode: Story = {
	play: openEditMode,
};

/** The form a new pipeline is written in: what it matches and what to call it. */
export const AddPipeline: Story = {
	play: openAddPipeline,
};

/** The new pipeline's filter focused: the keys it can match on. */
export const AddPipelineFilterKeys: Story = {
	play: suggestPipelineFilterKeys,
};

/** A key and an operator typed into the filter: the values that key holds. */
export const AddPipelineFilterValues: Story = {
	play: suggestPipelineFilterValues,
};

/** The same form over an existing pipeline, filter included. */
export const EditPipeline: Story = {
	play: openEditPipeline,
};

/** Adding an operator to a pipeline: the type decides the rest of the form. */
export const AddProcessor: Story = {
	play: openAddProcessor,
};

/** Severity Parser is the type whose mapping fields are CSV inputs. */
export const AddSeverityParserProcessor: Story = {
	play: openSeverityParserProcessor,
};

/** Severity Parser is the type whose mapping fields are CSV inputs. */
export const AddSeverityParserProcessor: Story = {
	play: async (context): Promise<void> => {
		await AddProcessor.play?.(context);
		await userEvent.click(await screen.findByText('Grok'));
		await userEvent.click(await screen.findByTitle('Severity Parser'));
		await screen.findByText('Parse Severity Value From');
	},
};

/**
 * The logs a pipeline matches, over the interval the preview asks for, with the
 * simulation of its processors one click away.
 */
export const ProcessingPreview: Story = {
	play: openProcessingPreview,
};

/** A sample log from the preview opened in the log detail drawer. */
export const PreviewLogDetails: Story = {
	play: openPreviewLogDetails,
};

/** Every config version the org deployed, and how each deployment went. */
export const ChangeHistory: Story = {
	play: openChangeHistory,
};

/** A deployment the collector has not finished, which the page polls for. */
export const Deploying: Story = {
	args: { deployStatus: 'IN_PROGRESS' },
};
