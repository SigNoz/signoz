import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';
import { screen, userEvent, waitFor } from 'storybook/test';

import type { GlobalMockArgs } from '../globals';

/** A page that puts nothing in the strip, so the shell is all there is. */
function EmptyPage(): JSX.Element {
	return <div />;
}

/** The shell renders its entry points after the global config and the license settle. */
const untilLoaded = { timeout: 10_000 };

/**
 * The strip along the foot of the shell, behind the `SAVED_VIEW_ENABLED` flag:
 * what the page puts on the left, the build version when it puts nothing, and
 * the shell's own Ask Noz and Support on the right. Support follows the chat
 * support the workspace has, the way the floating bubble it replaces did.
 *
 * Route: every page inside the app shell; these stories use `/home`.
 */
const meta = {
	title: 'Foundations/Bottom Strip',
	tags: ['play'],
	component: EmptyPage,
	args: { bottomStrip: true },
	parameters: { signoz: { route: ROUTES.HOME, layout: 'app' } },
} satisfies Meta<GlobalMockArgs>;

export default meta;

type Story = StoryObj<GlobalMockArgs>;

/**
 * The build version on the left. With Noz off and no chat support configured,
 * the right side is empty.
 */
export const Default: Story = {};

/** Ask Noz and Support on the right, Support handing off to Pylon. */
export const Actions: Story = {
	args: { noz: true, support: 'pylon' },
};

/**
 * A cloud trial without a card, whose Support offers the Add Credit Card modal
 * rather than Pylon. The floating bubble that used to offer it is gone.
 */
export const AddCard: Story = {
	args: { noz: true, support: 'add-card' },
};

/** The Add Credit Card modal, opened from the strip's Support. */
export const AddCardModal: Story = {
	args: { noz: true, support: 'add-card' },
	play: async (): Promise<void> => {
		await userEvent.click(
			await screen.findByTestId('bottom-strip-support', undefined, untilLoaded),
		);
		await screen.findByRole('dialog', {
			name: /Add Credit Card for Chat Support/i,
		});
	},
};

/**
 * The pulsing dot beside Ask Noz while conversations wait on an approval. The
 * top nav's Noz entry carries the same count.
 */
export const NozAwaitingYou: Story = {
	args: { noz: true, nozAwaiting: 2, support: 'pylon' },
};

/** Every tooltip the strip carries, held open. */
export const Tooltips: Story = {
	args: { noz: true, support: 'pylon', tooltipsOpen: true },
};

/**
 * The flag off, on a cloud trial without a card: no strip, and chat support is
 * the floating bubble in the corner.
 */
export const WithoutStrip: Story = {
	args: { bottomStrip: false, noz: true, support: 'add-card' },
};

/** The Add Credit Card modal, opened from the floating bubble with the flag off. */
export const WithoutStripAddCardModal: Story = {
	args: { bottomStrip: false, noz: true, support: 'add-card' },
	play: async (): Promise<void> => {
		// The bubble is an icon with no label or test id of its own.
		const bubble = await waitFor(() => {
			const found = document.querySelector<HTMLElement>(
				'.chat-support-gateway-btn',
			);

			if (!found) {
				throw new Error('the floating support bubble never rendered');
			}

			return found;
		}, untilLoaded);

		await userEvent.click(bubble);
		await screen.findByRole('dialog', {
			name: /Add Credit Card for Chat Support/i,
		});
	},
};
