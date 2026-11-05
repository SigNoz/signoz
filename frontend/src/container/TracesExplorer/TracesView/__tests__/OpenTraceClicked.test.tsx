import { logEventMock } from '__tests__/logEventMock';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	OpenTraceSource,
	TracesExplorerEvents,
} from 'container/TracesExplorer/events';
import { getCurrentLocation } from 'lib/router/navigation';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, userEvent, waitFor, within } from 'tests/test-utils';

import {
	groupedResponse,
	groupedRows,
	QUERY_RANGE_URL,
	renderTracesView,
} from './testUtils';

const TRACE_ID = '0000000000000000344ded1387b08a7e';
const ROW_TEST_ID = `traces-table-row-${TRACE_ID}`;

describe('TracesView - open trace clicked', () => {
	beforeEach(() => {
		server.use(
			rest.post(QUERY_RANGE_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(groupedResponse(groupedRows))),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('logs a row click that opens the trace page', async () => {
		const user = userEvent.setup();
		renderTracesView();

		const row = await screen.findByTestId(ROW_TEST_ID);
		// The row click handler sits on each cell, so a click on the <tr> does nothing.
		await user.click(within(row).getAllByRole('cell')[0]);

		await waitFor(() =>
			expect(getCurrentLocation().pathname).toBe(`/trace/${TRACE_ID}`),
		);
		expect(logEventMock).toHaveBeenCalledWith(
			TracesExplorerEvents.OpenTraceClicked,
			{
				panelType: PANEL_TYPES.TRACE,
				source: OpenTraceSource.Row,
			},
		);
	});

	it('logs a trace_id link click', async () => {
		const user = userEvent.setup();
		renderTracesView();

		const row = await screen.findByTestId(ROW_TEST_ID);
		await user.click(within(row).getByTestId('trace-id'));

		expect(logEventMock).toHaveBeenCalledWith(
			TracesExplorerEvents.OpenTraceClicked,
			{
				panelType: PANEL_TYPES.TRACE,
				source: OpenTraceSource.TraceId,
			},
		);
		expect(logEventMock).not.toHaveBeenCalledWith(
			TracesExplorerEvents.OpenTraceClicked,
			{ panelType: PANEL_TYPES.TRACE, source: OpenTraceSource.Row },
		);
	});

	it('logs a middle click on the trace_id link', async () => {
		const user = userEvent.setup();
		renderTracesView();

		const row = await screen.findByTestId(ROW_TEST_ID);
		await user.pointer({
			keys: '[MouseMiddle]',
			target: within(row).getByTestId('trace-id'),
		});

		expect(logEventMock).toHaveBeenCalledWith(
			TracesExplorerEvents.OpenTraceClicked,
			{
				panelType: PANEL_TYPES.TRACE,
				source: OpenTraceSource.TraceId,
			},
		);
	});
});
