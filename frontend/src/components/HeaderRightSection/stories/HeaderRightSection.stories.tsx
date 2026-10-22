import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent } from 'storybook/test';

import HeaderRightSection from '../HeaderRightSection';

const meta = {
	title: 'Components/Header Right Section',
	component: HeaderRightSection,
	tags: ['play'],
	args: {
		enableFeedback: true,
		enableShare: true,
		enableAnnouncements: false,
	},
} satisfies Meta<typeof HeaderRightSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The top bar's actions: feedback and share. */
export const Default: Story = {};

/** A feedback note submitted from the popover, which toasts once it is sent. */
export const FeedbackSubmittedToast: Story = {
	play: async (): Promise<void> => {
		await userEvent.click(
			await screen.findByRole('button', { name: 'Feedback' }),
		);
		await userEvent.type(
			await screen.findByPlaceholderText(/write your feedback here/i),
			'The new explorer is great',
		);
		await userEvent.click(await screen.findByRole('button', { name: /submit/i }));
		await screen.findByText(/feedback submitted successfully/i);
	},
};
