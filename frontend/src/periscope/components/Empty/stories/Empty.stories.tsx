import type { Meta, StoryObj } from '@storybook/react-vite';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import EmptyComparison from './EmptyComparison';
import { assertEmptyParity } from './emptyParity.play';

const meta = {
	title: 'Components/Empty',
	component: EmptyComparison,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 960 })],
	args: { image: 'default', hideDescription: false, withFooter: false },
	argTypes: {
		image: { control: 'inline-radio', options: ['default', 'simple'] },
		description: { control: 'text' },
		hideDescription: { control: 'boolean' },
		withFooter: { control: 'boolean' },
	},
	play: assertEmptyParity,
} satisfies Meta<typeof EmptyComparison>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The simple image switches to the compact, muted variant. */
export const Simple: Story = {
	args: { image: 'simple' },
};

export const CustomDescription: Story = {
	args: { description: 'No metrics found' },
};

export const WithoutDescription: Story = {
	args: { hideDescription: true },
};

/** Children render in a footer below the description. */
export const WithFooter: Story = {
	args: { withFooter: true, description: 'No dashboards yet' },
};

export const SimpleWithFooter: Story = {
	args: { image: 'simple', withFooter: true },
};
