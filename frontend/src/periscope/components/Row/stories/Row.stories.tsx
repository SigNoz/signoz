import type { Meta, StoryObj } from '@storybook/react-vite';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import RowComparison from './RowComparison';
import { assertRowParity } from './rowParity.play';

const GUTTERS = {
	none: undefined,
	'0': 0,
	'8': 8,
	'24': 24,
	'[16, 8]': [16, 8],
	'[0, 15]': [0, 15],
	'[24, 48]': [24, 48],
	'{ xs: 8, md: 16, xl: 32 }': { xs: 8, md: 16, xl: 32 },
	'[{ xs: 8, lg: 24 }, { sm: 4, xl: 16 }]': [
		{ xs: 8, lg: 24 },
		{ sm: 4, xl: 16 },
	],
};

const JUSTIFIES = {
	none: undefined,
	start: 'start',
	end: 'end',
	center: 'center',
	'space-around': 'space-around',
	'space-between': 'space-between',
	'space-evenly': 'space-evenly',
	"{ xs: 'start', md: 'center', xl: 'space-between' }": {
		xs: 'start',
		md: 'center',
		xl: 'space-between',
	},
};

const ALIGNS = {
	none: undefined,
	top: 'top',
	middle: 'middle',
	bottom: 'bottom',
	stretch: 'stretch',
	"{ xs: 'top', lg: 'bottom' }": { xs: 'top', lg: 'bottom' },
};

const meta = {
	title: 'Components/Row',
	component: RowComparison,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 960 })],
	args: { itemCount: 4 },
	argTypes: {
		itemCount: { control: { type: 'range', min: 0, max: 12 } },
		gutter: {
			control: 'select',
			options: Object.keys(GUTTERS),
			mapping: GUTTERS,
		},
		justify: {
			control: 'select',
			options: Object.keys(JUSTIFIES),
			mapping: JUSTIFIES,
		},
		align: {
			control: 'select',
			options: Object.keys(ALIGNS),
			mapping: ALIGNS,
		},
		wrap: { control: 'boolean' },
	},
	play: assertRowParity,
} satisfies Meta<typeof RowComparison>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A horizontal gutter pulls the row out by half the gutter on each side. */
export const HorizontalGutter: Story = {
	args: { gutter: 24, itemCount: 8 },
};

export const BothGutters: Story = {
	args: { gutter: [24, 16], justify: 'center', itemCount: 8 },
};

export const CenteredMiddle: Story = {
	args: { justify: 'center', align: 'middle' },
};

export const SpaceBetween: Story = {
	args: { justify: 'space-between', align: 'bottom' },
};

export const NoWrap: Story = {
	args: { wrap: false, itemCount: 8, align: 'top' },
};

/** Resolves to the widest breakpoint the viewport matches. */
export const Responsive: Story = {
	args: {
		gutter: [
			{ xs: 8, lg: 24 },
			{ sm: 4, xl: 16 },
		],
		justify: { xs: 'start', md: 'center', xl: 'space-between' },
		align: { xs: 'top', lg: 'bottom' },
		itemCount: 8,
	},
};
