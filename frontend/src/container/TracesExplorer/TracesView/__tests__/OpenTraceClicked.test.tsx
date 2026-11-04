import logEvent from 'api/common/logEvent';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	OpenTraceSource,
	TracesExplorerEvents,
} from 'container/TracesExplorer/events';
import { getCurrentLocation } from 'lib/router/navigation';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, userEvent, waitFor } from 'tests/test-utils';

import {
	groupedResponse,
	groupedRows,
	QUERY_RANGE_URL,
	renderTracesView,
} from './testUtils';

jest.mock('api/common/logEvent');

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

		await user.click(await screen.findByText('HTTP GET'));

		await waitFor(() =>
			expect(getCurrentLocation().pathname).toBe(
				'/trace/0000000000000000344ded1387b08a7e',
			),
		);
		expect(logEvent).toHaveBeenCalledWith(TracesExplorerEvents.OpenTraceClicked, {
			panelType: PANEL_TYPES.TRACE,
			source: OpenTraceSource.Row,
		});
	});

	it('logs a trace_id link click', async () => {
		const user = userEvent.setup();
		renderTracesView();

		await user.click(await screen.findByText('0000000000000000344ded1387b08a7e'));

		expect(logEvent).toHaveBeenCalledWith(TracesExplorerEvents.OpenTraceClicked, {
			panelType: PANEL_TYPES.TRACE,
			source: OpenTraceSource.TraceId,
		});
		expect(logEvent).not.toHaveBeenCalledWith(
			TracesExplorerEvents.OpenTraceClicked,
			{ panelType: PANEL_TYPES.TRACE, source: OpenTraceSource.Row },
		);
	});

	it('logs a middle click on the trace_id link', async () => {
		const user = userEvent.setup();
		renderTracesView();

		await user.pointer({
			keys: '[MouseMiddle]',
			target: await screen.findByText('0000000000000000344ded1387b08a7e'),
		});

		expect(logEvent).toHaveBeenCalledWith(TracesExplorerEvents.OpenTraceClicked, {
			panelType: PANEL_TYPES.TRACE,
			source: OpenTraceSource.TraceId,
		});
	});
});
