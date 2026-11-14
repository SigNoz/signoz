import type { Meta, StoryObj } from '@storybook/react-vite';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import ColComparison from './ColComparison';
import { assertColParity } from './colParity.play';

const SPAN_CONTROL = { control: { type: 'range', min: 0, max: 24 } } as const;

const meta = {
	title: 'Components/Col',
	component: ColComparison,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 1200 })],
	args: {
		span: 8,
		gutterX: 0,
		gutterY: 0,
		siblingSpan: 6,
		siblingCount: 2,
	},
	argTypes: {
		span: SPAN_CONTROL,
		offset: SPAN_CONTROL,
		order: SPAN_CONTROL,
		push: SPAN_CONTROL,
		pull: SPAN_CONTROL,
		flex: { control: 'text' },
		xs: SPAN_CONTROL,
		sm: SPAN_CONTROL,
		md: SPAN_CONTROL,
		lg: SPAN_CONTROL,
		xl: SPAN_CONTROL,
		xxl: SPAN_CONTROL,
		gutterX: { control: { type: 'range', min: 0, max: 48, step: 4 } },
		gutterY: { control: { type: 'range', min: 0, max: 48, step: 4 } },
		wrap: { control: 'boolean' },
		siblingSpan: SPAN_CONTROL,
		siblingCount: { control: { type: 'range', min: 0, max: 6 } },
	},
	play: assertColParity,
} satisfies Meta<typeof ColComparison>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Offset: Story = {
	args: { span: 6, offset: 6 },
};

/** `push` and `pull` swap the visual order of two columns. */
export const PushPull: Story = {
	args: { span: 6, push: 18, siblingSpan: 18, siblingCount: 1 },
};

export const Order: Story = {
	args: { span: 6, order: 3, siblingCount: 3 },
};

export const Gutter: Story = {
	args: { span: 8, gutterX: 24, gutterY: 16, siblingSpan: 8, siblingCount: 4 },
};

/** `span={0}` hides the column. */
export const Hidden: Story = {
	args: { span: 0 },
};

/** A number grows like `n n auto`; a length is a fixed basis. */
export const Flex: Story = {
	args: { span: undefined, flex: '2', siblingSpan: 0, siblingCount: 2 },
};

export const FlexBasis: Story = {
	args: { span: undefined, flex: '120px', siblingSpan: 0, siblingCount: 2 },
};

/** A non-wrapping row lets a flex column shrink below its content. */
export const FlexNoWrap: Story = {
	args: {
		span: undefined,
		flex: 'auto',
		wrap: false,
		siblingSpan: 12,
		siblingCount: 2,
	},
};

/** Resize the viewport across 576, 768, 992, 1200 and 1600px. */
export const Responsive: Story = {
	args: { span: undefined, xs: 24, sm: 12, md: 8, lg: 6, xl: 4, xxl: 2 },
};

export const ResponsiveObjects: Story = {
	args: {
		span: 24,
		xs: { span: 12, offset: 0 },
		md: { span: 8, offset: 4, order: 2 },
		lg: { span: 6, push: 6, pull: 0 },
		siblingCount: 3,
	},
};
