import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import dayjs from 'dayjs';
import { screen, userEvent } from 'storybook/test';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import CustomTimePicker from './CustomTimePicker';

const minTime = dayjs('2025-01-15T11:00:00Z').valueOf() * 1_000_000;
const maxTime = dayjs('2025-01-15T12:00:00Z').valueOf() * 1_000_000;

function TimePickerFixture(): JSX.Element {
	const [open, setOpen] = useState(false);
	const [selectedTime, setSelectedTime] = useState('1h');

	return (
		<CustomTimePicker
			isModalTimeSelection
			items={[
				{ label: 'Last 15 minutes', value: '15m' },
				{ label: 'Last 1 hour', value: '1h' },
				{ label: 'Last 6 hours', value: '6h' },
				{ label: 'Custom', value: 'custom' },
			]}
			maxTime={maxTime}
			minTime={minTime}
			newPopover
			open={open}
			onCustomDateHandler={(): void => undefined}
			onError={(): void => undefined}
			onSelect={(value): void => setSelectedTime(value)}
			onValidCustomDateChange={(): void => undefined}
			selectedTime={selectedTime}
			selectedValue="15 Jan 2025 11:00:00 - 15 Jan 2025 12:00:00"
			setOpen={setOpen}
		/>
	);
}

const meta = {
	title: 'Components/Custom Time Picker',
	component: TimePickerFixture,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 400 })],
} satisfies Meta<typeof TimePickerFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Interaction: the time-range menu is open with its relative-range choices. */
export const TimeRangeMenuOpen: Story = {
	play: async (): Promise<void> => {
		await userEvent.click(await screen.findByRole('textbox'));
		await screen.findByText('RELATIVE TIMES');
	},
};

/** Interaction: the timezone menu is reached through the real time-range footer. */
export const TimezoneMenuOpen: Story = {
	play: async (): Promise<void> => {
		await userEvent.click(await screen.findByRole('textbox'));
		await userEvent.click(
			await screen.findByRole('button', { name: 'Change Timezone' }),
		);
		await screen.findByPlaceholderText('Search timezones...');
	},
};
