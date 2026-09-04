import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { exceptionsMocks } from './AllErrors.stories.mocks';
import AllErrors from './index';

type AllErrorsArgs = PageStoryArgs<typeof exceptionsMocks>;

const pageStory = storyMocks(exceptionsMocks, { route: ROUTES.ALL_ERROR });

/**
 * Exception groups over the period, with the quick filters and the filter panel
 * the explorers share.
 *
 * Route: `/exceptions`.
 */
const meta = {
	title: 'Pages/Exceptions/List',
	tags: ['play'],
	component: AllErrors,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AllErrorsArgs>;

export default meta;

type Story = StoryObj<AllErrorsArgs>;

/** The page fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * Every exception group in the window: the org's quick filters down the left, the
 * resource filter and the time range above, and the table sorted by application
 * with each type linking to its detail page.
 */
export const Default: Story = {};

/**
 * A workspace with nothing thrown in the window and no quick filters configured,
 * so the table and the filter panel both show their empty states.
 */
export const NoExceptions: Story = {
	args: { exceptions: 0, quickFilters: 0 },
};

/** The table mid-query, with the cancel action the toolbar offers while it runs. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/**
 * What cancelling a running query leaves behind: the table is dropped for a
 * placeholder until Run Query is pressed again.
 */
export const QueryCancelled: Story = {
	args: { dataState: 'loading' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(/cancel/i, undefined, untilLoaded),
		);

		await screen.findByText(/query cancelled/i, undefined, untilLoaded);
	},
};
