import type { Meta, StoryObj } from '@storybook/react-vite';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import LayoutComparison from './LayoutComparison';
import { assertLayoutParity } from './layoutParity.play';

const meta = {
	title: 'Components/Layout',
	component: LayoutComparison,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 1200 })],
	args: {
		hasSider: false,
		showHeader: true,
		showFooter: true,
		contentLines: 3,
	},
	argTypes: {
		hasSider: { control: 'boolean' },
		showHeader: { control: 'boolean' },
		showFooter: { control: 'boolean' },
		contentLines: { control: { type: 'range', min: 0, max: 30 } },
	},
	play: assertLayoutParity,
} satisfies Meta<typeof LayoutComparison>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `hasSider` lays children out in a row; nested layouts and content shrink to fit. */
export const HasSider: Story = {
	args: { hasSider: true },
};

export const ContentOnly: Story = {
	args: { showHeader: false, showFooter: false },
};

/** Content shrinks below its own height rather than pushing the footer out. */
export const Overflowing: Story = {
	args: { contentLines: 30 },
};
