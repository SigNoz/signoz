import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { savedViewsMocks } from './SavedViews.stories.mocks';

import LogsModulePage from '../LogsModulePage';

type SavedViewsArgs = PageStoryArgs<typeof savedViewsMocks>;

const pageStory = storyMocks(savedViewsMocks);

/**
 * Saved views on the logs explorer, and the actions the legacy editor role gates.
 *
 * Route: `/logs/saved-views`.
 */
const meta = {
	title: 'Pages/Logs/Saved Views',
	tags: ['role-gated', 'play'],
	component: LogsModulePage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<SavedViewsArgs>;

export default meta;

type Story = StoryObj<SavedViewsArgs>;

/** The page fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/** Row actions are per-view icons, so a story that opens one picks the first. */
const openFirstAction = async (
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
 * The views tab: every view the org saved for logs, who saved it and when, with
 * the colour the view picker shows it under.
 */
export const Default: Story = {};

/** A workspace where nobody has saved a view yet. */
export const NoViews: Story = {
	args: { views: 0 },
};

/** Enough views to paginate, which is the only place the second page shows up. */
export const Paginated: Story = {
	args: { views: 8 },
};

/** Renaming a view: its label and the colour the picker shows it under. */
export const EditView: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openFirstAction(canvasElement, 'edit-view');
		await screen.findByText('Edit view details', undefined, untilLoaded);
	},
};

/** The confirmation a view has to pass before it is deleted. */
export const DeleteView: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openFirstAction(canvasElement, 'delete-view');
		await screen.findByText(
			/are you sure you want to delete/i,
			undefined,
			untilLoaded,
		);
	},
};

/** A viewer: the views are listed, none of them editable. */
export const ViewerAccess: Story = {
	args: { access: 'viewer' },
};
