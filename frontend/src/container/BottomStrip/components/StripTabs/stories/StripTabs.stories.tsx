import type { Meta, StoryObj } from '@storybook/react-vite';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import StripTabsFixture from './StripTabsFixture';
import { focusFirstTab } from './__story_mockdata__/stripTabs.play';

/**
 * Closable tabs for the bottom strip. The label opens a tab and the × over its
 * end closes it; tabs shrink with an ellipsis to share the width they are given.
 * A prefix, such as the dot Noz uses for an unseen reply, sits before the label.
 */
const meta = {
	title: 'Components/Strip Tabs',
	tags: ['play'],
	component: StripTabsFixture,
	decorators: [withCanvas({})],
	// A component has no page config; stating it tells the clobbered-mocks check this is on purpose.
	parameters: { signoz: {} },
	args: { tabs: 4, marked: 1, active: 1, width: 900 },
	argTypes: {
		tabs: { control: { type: 'range', min: 0, max: 5, step: 1 } },
		marked: { control: { type: 'range', min: 0, max: 5, step: 1 } },
		active: { control: { type: 'range', min: -1, max: 4, step: 1 } },
		width: { control: { type: 'range', min: 200, max: 1200, step: 20 } },
	},
} satisfies Meta<typeof StripTabsFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Four tabs: one active, the last one marked. */
export const Default: Story = {};

/** Five tabs in a narrow strip, shrunk to share it. */
export const Crowded: Story = {
	args: { tabs: 5, marked: 2, width: 420 },
};

/** A tab reached by keyboard: highlighted with its × shown, as on hover. */
export const Focused: Story = {
	play: focusFirstTab,
};
