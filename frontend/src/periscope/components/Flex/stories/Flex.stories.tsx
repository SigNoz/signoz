import type { Meta, StoryObj } from '@storybook/react-vite';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import FlexComparison from './FlexComparison';
import { assertFlexParity } from './flexParity.play';

const meta = {
	title: 'Components/Flex',
	component: FlexComparison,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 960 })],
	args: { itemCount: 3 },
	argTypes: {
		itemCount: { control: { type: 'range', min: 0, max: 12 } },
		vertical: { control: 'boolean' },
		wrap: { control: 'select', options: ['wrap', 'nowrap', 'wrap-reverse'] },
		justify: {
			control: 'select',
			options: [
				'flex-start',
				'flex-end',
				'start',
				'end',
				'center',
				'space-between',
				'space-around',
				'space-evenly',
				'stretch',
				'normal',
				'left',
				'right',
			],
		},
		align: {
			control: 'select',
			options: [
				'center',
				'start',
				'end',
				'flex-start',
				'flex-end',
				'self-start',
				'self-end',
				'baseline',
				'normal',
				'stretch',
			],
		},
		gap: {
			control: 'select',
			options: ['small', 'middle', 'large', 0, 4, '12px', '4px 16px'],
		},
		flex: { control: 'text' },
	},
	play: assertFlexParity,
} satisfies Meta<typeof FlexComparison>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CenteredRow: Story = {
	args: { align: 'center', justify: 'center', gap: 8 },
};

export const SpaceBetween: Story = {
	args: { align: 'center', justify: 'space-between', gap: 4 },
};

/** Without `align`, a vertical flex stretches its children. */
export const Vertical: Story = {
	args: { vertical: true, gap: 'small' },
};

export const VerticalAligned: Story = {
	args: { vertical: true, align: 'flex-end', justify: 'center' },
};

export const PresetGaps: Story = {
	args: { gap: 'large', wrap: 'wrap', itemCount: 12 },
};

export const CustomGap: Story = {
	args: { gap: '4px 16px', wrap: 'wrap', itemCount: 12 },
};

/** `gap={0}` is ignored rather than applied. */
export const ZeroGap: Story = {
	args: { gap: 0, align: 'baseline' },
};

export const WrapReverse: Story = {
	args: { wrap: 'wrap-reverse', align: 'start', itemCount: 12 },
};

export const Grow: Story = {
	args: { flex: '1', justify: 'space-around', align: 'end' },
};

/** An empty flex is hidden. */
export const Empty: Story = {
	args: { itemCount: 0, gap: 'middle' },
};
