import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import LabelColumn from '../LabelColumn';

const meta = {
	title: 'Components/Label Column',
	component: LabelColumn,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 180 })],
	args: {
		labels: ['severity', 'team', 'service', 'environment'],
		value: {
			severity: 'critical',
			team: 'payments',
			service: 'checkout',
			environment: 'production',
		},
	},
} satisfies Meta<typeof LabelColumn>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Labels that fit the column; the rest collapse into a `+N` chip. */
export const Default: Story = {};

/** Copying one label from its tooltip. */
export const LabelCopiedToast: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.hover(
			await within(canvasElement).findByTestId('label-tag-severity'),
		);
		await userEvent.click(
			await screen.findByRole('button', { name: 'Copy to clipboard' }),
		);
		await waitFor(() =>
			expect(screen.getByText(/copied! use in search/i)).toBeVisible(),
		);
	},
};

/** Copying the labels that overflow the column from the `+N` chip's tooltip. */
export const OverflowLabelsCopiedToast: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.hover(
			await within(canvasElement).findByTestId('label-overflow-badge'),
		);
		await userEvent.click(
			await screen.findByRole('button', { name: 'Copy to clipboard' }),
		);
		await waitFor(() =>
			expect(screen.getByText(/copied! use in search/i)).toBeVisible(),
		);
	},
};
