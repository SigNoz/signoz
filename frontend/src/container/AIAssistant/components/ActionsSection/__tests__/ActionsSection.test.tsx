import {
	ApplyFilterSignalDTO,
	MessageActionDTO,
	MessageActionKindDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { getCurrentLocation } from 'lib/router/navigation';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { QueryBuilderContextType } from 'types/common/queryBuilder';

import ActionsSection from '../ActionsSection';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

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
