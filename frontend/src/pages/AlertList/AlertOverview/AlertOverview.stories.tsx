import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { alertOverviewMocks } from './AlertOverview.stories.mocks';

import AlertList from '../index';

type AlertOverviewArgs = PageStoryArgs<typeof alertOverviewMocks>;

const pageStory = storyMocks(alertOverviewMocks);

/**
 * One rule read only: its condition, the series it evaluates against, its state
 * and the channels it notifies.
 *
 * Route: `/alerts/overview?ruleId=...`.
 */
const meta = {
	title: 'Pages/Alerts/Overview',
	component: AlertList,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AlertOverviewArgs>;

export default meta;

type Story = StoryObj<AlertOverviewArgs>;

/**
 * One alert rule opened up: the query it watches, the condition it fires on and
 * where the notification goes.
 */
export const Default: Story = {};

/** A rule written before the current schema, which opens in the classic form. */
export const ClassicSchema: Story = {
	args: { alertSchema: 'classic' },
};

/** A rule someone turned off: the toggle in the header is what turns it back on. */
export const Disabled: Story = {
	args: { ruleState: 'disabled' },
};

/** A rule with no matching series in the window, so the preview has nothing to draw. */
export const NoPreviewData: Story = {
	args: { previewSeries: 0 },
};

/** The rule id in the URL does not resolve, which is where the page gives up. */
export const RuleNotFound: Story = {
	args: { dataState: 'error' },
};
