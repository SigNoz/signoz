import type { Meta, StoryObj } from '@storybook/react-vite';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { SIDEBAR_TOOLTIP_DELAY_MS } from 'components/QuickFilters/QuickFiltersLayout/constants';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withCanvas } from '@/storybook/decorators/withCanvas';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import SavedViewsHeader from '../SavedViewsHeader';
import SavedViewsPanel from '../SavedViewsPanel';
import { savedViewsMocks } from './SavedViews.stories.mocks';

type SavedViewsArgs = PageStoryArgs<typeof savedViewsMocks>;

const componentStory = storyMocks(savedViewsMocks);

/** The panel fetches the list and checks every row's permissions before it settles. */
const untilLoaded = { timeout: 15_000 };

/**
 * The saved views sidebar of an explorer without quick filters: the header with
 * the open view and its actions, above the list of views created by the user
 * and by others. Every action is gated on the `saved-view` authz permissions
 * (list, create, and read, update and delete per view).
 *
 * Route: the explorer of the Source control, with the Open view control's
 * `viewKey`.
 */
const meta = {
	title: 'Components/Saved Views',
	tags: ['authz', 'play'],
	component: SavedViewsPanel,
	decorators: [
		withCanvas({
			width: 280,
			height: 640,
			padding: 0,
			display: 'flex',
			flexDirection: 'column',
			borderRight: '1px solid var(--l1-border)',
		}),
	],
	render: ({ source }): JSX.Element => (
		<TooltipProvider delay={SIDEBAR_TOOLTIP_DELAY_MS}>
			<SavedViewsHeader source={source} />
			<SavedViewsPanel source={source} />
		</TooltipProvider>
	),
	...componentStory,
	parameters: { ...componentStory.parameters },
} satisfies Meta<SavedViewsArgs>;

export default meta;

type Story = StoryObj<SavedViewsArgs>;

/** Traces views created by the user and by others, with no view open. */
export const Default: Story = {};

/** A workspace with no views yet: the empty state offers Create view. */
export const Empty: Story = {
	args: { createdByMe: 0, createdByOthers: 0 },
};

/**
 * A view open with a query that differs from what it saved: the name carries
 * the unsaved dot, and ✓ and discard replace Clear view.
 */
export const UnsavedChanges: Story = {
	args: { openView: 'unsaved-changes' },
};

/** Without `list` on saved views, the panel shows the permission callout. */
export const NoAccess: Story = {
	args: { revoked: ['list:saved-view'] },
};

/**
 * The first row's menu. Edit details and Delete follow `update` and `delete` on
 * that view, so revoking either disables its item.
 */
export const RowMenu: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const [row] = await within(canvasElement).findAllByTestId(
			'saved-views-row',
			undefined,
			untilLoaded,
		);

		await userEvent.click(within(row).getByTestId('saved-views-row-menu'));
		await screen.findByRole('menu', undefined, untilLoaded);
	},
};

/**
 * The ✓ menu on a view with unsaved changes. Save as new view follows `create`
 * and Update selected view follows `update` on the open view.
 */
export const SaveChangesMenu: Story = {
	args: { openView: 'unsaved-changes' },
	play: async ({ canvasElement }): Promise<void> => {
		const trigger = await waitFor(async () => {
			const button = within(canvasElement).getByTestId('saved-views-save-changes');

			await expect(button).not.toHaveAttribute('aria-busy');

			return button;
		}, untilLoaded);

		await userEvent.click(trigger);
		await screen.findByRole('menu', undefined, untilLoaded);
	},
};
