import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	expect,
	screen,
	userEvent,
	waitFor,
	waitForElementToBeRemoved,
	within,
} from 'storybook/test';

import LayeringFixture from './LayeringFixture';

const meta = {
	title: 'Foundations/Layering',
	tags: ['play'],
	component: LayeringFixture,
} satisfies Meta<typeof LayeringFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Interaction: modal and body portal; verifies the select stays above its host. */
export const SelectOverModal: Story = {
	args: { host: 'modal' },
	play: async ({ canvasElement }): Promise<void> => {
		const trigger = within(canvasElement).getByTestId('open-layering-modal');

		await userEvent.click(trigger);
		await screen.findByRole('dialog', { name: 'Layering modal' });
		await userEvent.keyboard('{Escape}');
		await waitFor(() => expect(trigger).toHaveFocus());
		await userEvent.click(trigger);
		await userEvent.click(
			await screen.findByRole('combobox', { name: 'Modal environment' }),
		);
		await screen.findByRole('listbox');
	},
};

/**
 * Interaction: drawer and its local popup container; verifies overlay stacking.
 * Escape closes the drawer but leaves focus on the body instead of the trigger,
 * so the story asserts the close; see
 * `docs/reviews/signozhq-ui-drawer-feedback.md`.
 */
export const SelectOverDrawer: Story = {
	args: { host: 'drawer' },
	play: async ({ canvasElement }): Promise<void> => {
		const trigger = within(canvasElement).getByTestId('open-layering-drawer');

		await userEvent.click(trigger);
		const drawer = await screen.findByRole('dialog', { name: 'Layering drawer' });

		await userEvent.keyboard('{Escape}');
		await waitForElementToBeRemoved(drawer);
		await userEvent.click(trigger);
		await userEvent.click(
			await screen.findByRole('combobox', { name: 'Drawer environment' }),
		);
		await screen.findByRole('listbox');
	},
};

/** Interaction: scrollable local container; exposes clipping and positioning branches. */
export const SelectOverScrollablePanel: Story = {
	args: { host: 'scrollable-panel' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			within(canvasElement).getByRole('combobox', {
				name: 'Scrollable panel environment',
			}),
		);
		await screen.findByRole('listbox');
	},
};
