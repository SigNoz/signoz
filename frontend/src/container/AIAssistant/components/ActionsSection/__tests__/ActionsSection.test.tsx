import { undoExecution } from 'api/ai-assistant/chat';
import type { MessageActionDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { MessageActionKindDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import ActionsSection from '../ActionsSection';

jest.mock('api/ai-assistant/chat', () => ({
	undoExecution: jest.fn(),
	revertExecution: jest.fn(),
	restoreExecution: jest.fn(),
}));
jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockUndo = undoExecution as jest.MockedFunction<typeof undoExecution>;

const UNDO_ACTION = {
	kind: MessageActionKindDTO.undo,
	label: 'Undo change',
	actionMetadataId: 'exec-1',
} as MessageActionDTO;

function renderUndoChip(): HTMLElement {
	render(<ActionsSection actions={[UNDO_ACTION]} messageId="m1" />);
	return screen.getByRole('button', { name: 'Undo change' });
}

describe('ActionsSection rollback chip', () => {
	beforeEach(() => {
		mockUndo.mockReset();
	});

	it('ignores clicks while the rollback is in flight', async () => {
		const user = userEvent.setup();
		mockUndo.mockReturnValue(new Promise(() => {}));
		const chip = renderUndoChip();

		await user.click(chip);
		await waitFor(() => expect(chip).toHaveAttribute('aria-busy', 'true'));
		await user.click(chip);

		expect(mockUndo).toHaveBeenCalledTimes(1);
		expect(mockUndo).toHaveBeenCalledWith('exec-1');
	});

	it('disables the chip after success and says why', async () => {
		const user = userEvent.setup();
		mockUndo.mockResolvedValue({} as Awaited<ReturnType<typeof undoExecution>>);
		const chip = renderUndoChip();

		await user.click(chip);
		await waitFor(() => expect(chip).toHaveAttribute('aria-disabled', 'true'));

		await user.click(chip);
		expect(mockUndo).toHaveBeenCalledTimes(1);

		// A click closes a Base UI tooltip until the pointer leaves the trigger.
		await user.unhover(chip);
		await user.hover(chip);
		await expect(
			screen.findByText('This action already ran'),
		).resolves.toBeInTheDocument();
	});

	it('shows the error text when the rollback fails', async () => {
		const user = userEvent.setup();
		mockUndo.mockRejectedValue(new Error('Execution already reverted'));
		const chip = renderUndoChip();

		await user.click(chip);
		await waitFor(() => expect(chip).not.toHaveAttribute('aria-busy', 'true'));
		expect(chip).not.toHaveAttribute('aria-disabled', 'true');

		await user.unhover(chip);
		await user.hover(chip);
		await expect(
			screen.findByText('Execution already reverted'),
		).resolves.toBeInTheDocument();
	});
});
