import type { Meta, StoryObj } from '@storybook/react-vite';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import SpaceComparison from './SpaceComparison';
import { assertSpaceParity } from './spaceParity.play';

const SIZES = {
	small: 'small',
	middle: 'middle',
	large: 'large',
	'0': 0,
	'4': 4,
	'20': 20,
	'[large, small]': ['large', 'small'],
	'[4, 20]': [4, 20],
} as const;

const meta = {
	title: 'Components/Space',
	component: SpaceComparison,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 960 })],
	args: { itemCount: 3 },
	argTypes: {
		itemCount: { control: { type: 'range', min: 0, max: 16 } },
		withEmptyChildren: { control: 'boolean' },
		direction: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
		align: { control: 'select', options: ['start', 'end', 'center', 'baseline'] },
		size: { control: 'select', options: Object.keys(SIZES), mapping: SIZES },
		wrap: { control: 'boolean' },
		split: { control: 'select', options: ['|', '/'] },
		compact: { control: 'boolean' },
		block: { control: 'boolean', if: { arg: 'compact' } },
	},
	play: assertSpaceParity,
} satisfies Meta<typeof SpaceComparison>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A horizontal space centers its items. */
export const Default: Story = {};

export const Vertical: Story = {
	args: { direction: 'vertical', size: 'middle' },
};

export const VerticalAligned: Story = {
	args: { direction: 'vertical', align: 'end' },
};

export const Baseline: Story = {
	args: { align: 'baseline', size: 'large' },
};

/** A pair sets the column gap, then the row gap. */
export const MixedSizes: Story = {
	args: { size: [4, 20], wrap: true, itemCount: 16 },
};

/** `size={0}` is ignored rather than applied. */
export const ZeroSize: Story = {
	args: { size: 0 },
};

/** Empty children get no item and no split. */
export const Split: Story = {
	args: { split: '|', withEmptyChildren: true },
};

export const Wrap: Story = {
	args: { wrap: true, size: 'large', itemCount: 16 },
};

/** A space with no children renders nothing. */
export const Empty: Story = {
	args: { itemCount: 0 },
};

/** Lays children out without item wrappers; `block` fills the width. */
export const Compact: Story = {
	args: { compact: true, block: true, direction: 'vertical' },
};
