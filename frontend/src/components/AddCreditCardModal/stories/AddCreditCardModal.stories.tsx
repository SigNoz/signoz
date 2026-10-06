import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@signozhq/ui/button';
import { screen, userEvent, within } from 'storybook/test';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import { createSubscriptionHandlers } from './AddCreditCardModal.stories.mocks';

import AddCreditCardModal from '../AddCreditCardModal';

/** Stands in for the surfaces that open it: the strip's Support button, and
 * `LaunchChatSupport` in the custom domain and onboarding flows. */
function ModalFixture(): JSX.Element {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				data-testid="open-add-credit-card"
				onClick={(): void => setOpen(true)}
			>
				Contact support
			</Button>
			<AddCreditCardModal open={open} onClose={(): void => setOpen(false)} />
		</>
	);
}

const meta = {
	title: 'Components/Add Credit Card Modal',
	component: ModalFixture,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 400 })],
	parameters: {
		msw: { handlers: createSubscriptionHandlers },
	},
} satisfies Meta<typeof ModalFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** What a trial user without a card sees in place of chat support. */
export const Default: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			within(canvasElement).getByTestId('open-add-credit-card'),
		);
		await screen.findByRole('dialog', {
			name: /Add Credit Card for Chat Support/i,
		});
	},
};
