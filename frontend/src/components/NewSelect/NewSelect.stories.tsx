import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent } from 'storybook/test';

import { withCanvas } from '@/storybook/decorators/withCanvas';
import type { GlobalMockArgs } from '@/storybook/globals';

import { CustomMultiSelect, CustomSelect } from './index';

const options = [
	{ label: 'Checkout', value: 'checkout' },
	{ label: 'Frontend', value: 'frontend' },
	{ label: 'Payments', value: 'payments' },
	{ label: 'Search', value: 'search' },
];

const longOptions = Array.from({ length: 24 }, (_, index) => ({
	label: `Service ${String(index + 1).padStart(2, '0')}`,
	value: `service-${index + 1}`,
}));

const meta = {
	title: 'Components/New Select',
	component: CustomSelect,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 360 })],
	args: {
		'aria-label': 'Service',
		options,
		placeholder: 'Select a service',
	},
} satisfies Meta<typeof CustomSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

type TooltipsStory = StoryObj<GlobalMockArgs>;

/** Interaction: the body-portal menu is open for stacking and clipping review. */
export const PortalOpen: Story = {
	play: async (): Promise<void> => {
		await userEvent.click(
			await screen.findByRole('combobox', { name: 'Service' }),
		);
		await screen.findByRole('listbox');
	},
};

/** Density: a long result list keeps the menu scrollable. */
export const LongResults: Story = {
	args: { options: longOptions },
	play: async (): Promise<void> => {
		await userEvent.click(
			await screen.findByRole('combobox', { name: 'Service' }),
		);
		await screen.findByText('Service 24');
	},
};

/** Empty: the select reports its supported no-data state. */
export const NoResults: Story = {
	args: { noDataMessage: 'No services found', options: [] },
	play: async (): Promise<void> => {
		await userEvent.click(
			await screen.findByRole('combobox', { name: 'Service' }),
		);
		await screen.findByText('No services found');
	},
};

/** Loading: the open menu keeps its in-progress refresh feedback visible. */
export const Loading: Story = {
	args: {
		loading: true,
		options: [],
	},
	play: async (): Promise<void> => {
		await userEvent.click(
			await screen.findByRole('combobox', { name: 'Service' }),
		);
		await screen.findByText('Refreshing values...');
	},
};

/** Error: a retryable failed request remains visible in the open menu. */
export const Error: Story = {
	args: {
		errorMessage: 'Could not load services',
		onRetry: (): void => undefined,
		options: [],
	},
	play: async (): Promise<void> => {
		await userEvent.click(
			await screen.findByRole('combobox', { name: 'Service' }),
		);
		await screen.findByText('Could not load services');
	},
};

/** Selection: selected and unavailable options are distinguishable before choosing. */
export const SelectedDisabled: Story = {
	args: {
		options: [
			{ label: 'Checkout', value: 'checkout' },
			{ disabled: true, label: 'Legacy billing', value: 'legacy-billing' },
			{ label: 'Payments', value: 'payments' },
		],
		value: 'checkout',
	},
	play: async (): Promise<void> => {
		await userEvent.click(
			await screen.findByRole('combobox', { name: 'Service' }),
		);
		await screen.findByRole('option', { name: 'Legacy billing' });
	},
};

/** Overflow: a multi-select preserves its selected values when its trigger is constrained. */
export const MultiValueOverflow: Story = {
	render: (): JSX.Element => (
		<div style={{ maxWidth: 280 }}>
			<CustomMultiSelect
				aria-label="Services"
				maxTagCount={2}
				options={longOptions}
				value={['service-1', 'service-2', 'service-3', 'service-4']}
			/>
		</div>
	),
};

const LONG_LABEL_OPTION = {
	label:
		'checkout-service.production-eu-central-1.svc.cluster.local:8080/v1/orders/{orderId}/payment-authorisation',
	value: 'checkout-payment-authorisation',
};

/**
 * Every tooltip the select renders, held open: the selected chip revealing the
 * option label it was cut from. Nothing bounds that label, so the chip is given
 * one long enough to need the reveal.
 */
export const Tooltips: TooltipsStory = {
	args: { tooltipsOpen: true },
	render: (): JSX.Element => (
		<div style={{ maxWidth: 280 }}>
			<CustomMultiSelect
				aria-label="Services"
				maxTagCount={1}
				maxTagTextLength={14}
				options={[LONG_LABEL_OPTION, ...options]}
				value={[LONG_LABEL_OPTION.value]}
			/>
		</div>
	),
};
