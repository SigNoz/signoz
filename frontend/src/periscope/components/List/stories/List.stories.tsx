import type { Meta, StoryObj } from '@storybook/react-vite';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import ListComparison from './ListComparison';
import { assertListParity } from './listParity.play';

const meta = {
	title: 'Components/List',
	component: ListComparison,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 960 })],
	args: {
		itemCount: 3,
		avatar: true,
		description: false,
		actions: false,
		extra: false,
	},
	argTypes: {
		itemCount: { control: { type: 'range', min: 0, max: 12 } },
		itemLayout: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
		size: { control: 'inline-radio', options: ['small', 'default', 'large'] },
		bordered: { control: 'boolean' },
		split: { control: 'boolean' },
		header: { control: 'text' },
		footer: { control: 'text' },
		emptyText: { control: 'text' },
		fontSize: { control: 'number' },
		avatar: { control: 'boolean' },
		description: { control: 'boolean' },
		actions: { control: 'boolean' },
		extra: { control: 'boolean' },
	},
	play: assertListParity,
} satisfies Meta<typeof ListComparison>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HeaderAndFooter: Story = {
	args: { header: 'Header', footer: 'Footer', description: true },
};

export const Bordered: Story = {
	args: { bordered: true, header: 'Header', footer: 'Footer' },
};

export const BorderedSmall: Story = {
	args: { bordered: true, size: 'small', header: 'Header', footer: 'Footer' },
};

export const Large: Story = {
	args: { size: 'large', description: true },
};

export const WithActions: Story = {
	args: { actions: true, description: true },
};

/** Vertical items with `extra` lay out the content beside the extra block. */
export const Vertical: Story = {
	args: {
		itemLayout: 'vertical',
		description: true,
		actions: true,
		extra: true,
	},
};

export const NoSplit: Story = {
	args: { split: false, footer: 'Footer' },
};

export const Empty: Story = {
	args: { itemCount: 0 },
};

export const CustomEmptyText: Story = {
	args: { itemCount: 0, emptyText: 'Nothing here', bordered: true },
};

/** A font size on the root reaches the header and footer only. */
export const RootFontSize: Story = {
	args: { fontSize: 20, header: 'Header', footer: 'Footer', description: true },
};
