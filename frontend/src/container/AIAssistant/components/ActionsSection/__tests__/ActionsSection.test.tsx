import { undoExecution } from 'api/ai-assistant/chat';
import type { MessageActionDTO } from '@signozhq/noz-client';
import {
	ApplyFilterSignalDTO,
	MessageActionKindDTO,
} from '@signozhq/noz-client';
import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { getCurrentLocation } from 'lib/router/navigation';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { QueryBuilderContextType } from 'types/common/queryBuilder';

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

// Labels differ per test: auto-applied filters are deduped module-wide by label.
function countByServiceAction(label: string): MessageActionDTO {
	return {
		kind: MessageActionKindDTO.apply_filter,
		label,
		signal: ApplyFilterSignalDTO.logs,
		query: {
			requestType: Querybuildertypesv5RequestTypeDTO.scalar,
			compositeQuery: {
				queries: [
					{
						type: 'builder_query',
						spec: {
							name: 'A',
							signal: 'logs',
							aggregations: [{ expression: 'count()' }],
							groupBy: [{ name: 'service.name' }],
						},
					},
				],
			},
		},
	};
}

function currentPanelTypesParam(): string | null {
	return new URLSearchParams(getCurrentLocation().search).get(
		QueryParams.panelTypes,
	);
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

describe('ActionsSection apply_filter', () => {
	it('opens the explorer in the Table view when the chip is clicked from another page', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<ActionsSection
				actions={[countByServiceAction('Open in Logs Explorer')]}
				messageId="message-1"
			/>,
			undefined,
			{ initialRoute: ROUTES.HOME },
		);

		await user.click(screen.getByTestId('ai-action-chip-apply_filter'));

		await waitFor(() =>
			expect(getCurrentLocation().pathname).toBe(ROUTES.LOGS_EXPLORER),
		);
		expect(currentPanelTypesParam()).toBe(JSON.stringify(PANEL_TYPES.TABLE));
	});

	it('switches the open explorer to the Table view when applied on it', async () => {
		const redirectWithQueryBuilderData = jest.fn() as jest.MockedFunction<
			QueryBuilderContextType['redirectWithQueryBuilderData']
		>;
		const handleSetQueryData = jest.fn() as jest.MockedFunction<
			QueryBuilderContextType['handleSetQueryData']
		>;
		render(
			<ActionsSection
				actions={[countByServiceAction('Apply on Logs Explorer')]}
				messageId="message-2"
			/>,
			undefined,
			{
				initialRoute: ROUTES.LOGS_EXPLORER,
				queryBuilderOverrides: { redirectWithQueryBuilderData, handleSetQueryData },
			},
		);

		await waitFor(() =>
			expect(redirectWithQueryBuilderData).toHaveBeenCalledTimes(1),
		);
		expect(redirectWithQueryBuilderData).toHaveBeenCalledWith(
			expect.objectContaining({ builder: expect.anything() }),
			{ [QueryParams.panelTypes]: PANEL_TYPES.TABLE },
		);
	});
});
