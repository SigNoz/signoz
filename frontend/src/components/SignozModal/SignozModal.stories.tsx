import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@signozhq/ui/button';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import { CustomSelect } from '../NewSelect';
import SignozModal from './SignozModal';

function ModalFixture(): JSX.Element {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button data-testid="open-signoz-modal" onClick={(): void => setOpen(true)}>
				Open modal
			</Button>
			<SignozModal
				footer={null}
				open={open}
				onCancel={(): void => setOpen(false)}
				title="Create saved view"
			>
				<CustomSelect
					aria-label="View scope"
					options={[
						{ label: 'This workspace', value: 'workspace' },
						{ label: 'My views', value: 'personal' },
					]}
					placeholder="Select a scope"
				/>
			</SignozModal>
		</>
	);
}

const meta = {
	title: 'Components/Signoz Modal',
	component: ModalFixture,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 400 })],
} satisfies Meta<typeof ModalFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Interaction: the modal and its nested body-portal select are both genuinely open. */
export const OpenWithNestedSelect: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const trigger = within(canvasElement).getByTestId('open-signoz-modal');

		await userEvent.click(trigger);
		await screen.findByRole('dialog', { name: 'Create saved view' });
		await userEvent.keyboard('{Escape}');
		await waitFor(() => expect(trigger).toHaveFocus());
		await userEvent.click(trigger);
		await userEvent.click(
			await screen.findByRole('combobox', { name: 'View scope' }),
		);
		await screen.findByRole('listbox');
	},
};
