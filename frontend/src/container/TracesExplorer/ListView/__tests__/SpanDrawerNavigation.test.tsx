import { logEventMock } from '__tests__/logEventMock';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	OpenTraceSource,
	TracesExplorerEvents,
} from 'container/TracesExplorer/events';
import { getCurrentLocation } from 'lib/router/navigation';
import { server } from 'mocks-server/server';
import { screen, userEvent, waitFor, within } from 'tests/test-utils';
import {
	listRows,
	mockSuccess,
	mockTraceSummary,
	renderListView,
} from './testUtils';

// globalTime starts with loading:true, which gates the list query. Force just that
// slice's loading to false so the query fires; every other selector is untouched.
jest.mock('react-redux', () => {
	const actual = jest.requireActual('react-redux');
	return {
		...actual,
		useSelector: (selector: (state: unknown) => unknown): unknown => {
			const result = actual.useSelector(selector);
			if (result && typeof result === 'object' && 'loading' in result) {
				return { ...result, loading: false };
			}
			return result;
		},
	};
});

// List columns come from the options menu (server-synced preferences). Pin them
// so the expected columns render, independent of that API.
jest.mock('container/OptionsMenu/useOptionsMenu', () => ({
	__esModule: true,
	default: (): unknown => ({
		options: {
			selectColumns: [
				{ name: 'service.name', fieldContext: 'resource' },
				{ name: 'name', fieldContext: 'span' },
				{ name: 'duration_nano', fieldContext: 'span' },
				{ name: 'http_method', fieldContext: 'span' },
				{ name: 'response_status_code', fieldContext: 'span' },
				{ name: 'http.route', fieldContext: 'attribute' },
				{ name: 'cache.hit', fieldContext: 'attribute' },
			],
		},
		config: { addColumn: { onRemove: jest.fn() } },
	}),
}));

const ROW_TEST_ID = `traces-table-row-${listRows[0].data.span_id}`;

// The row click handler sits on each cell, so a click on the <tr> does nothing.
const getRowCell = (row: HTMLElement): HTMLElement =>
	within(row).getAllByRole('cell')[0];

describe('Traces ListView - span drawer navigation', () => {
	beforeEach(() => {
		mockSuccess();
		mockTraceSummary({});
	});

	afterEach(() => {
		server.resetHandlers();
		jest.restoreAllMocks();
	});

	it('opens the clicked span and steps through rows with the arrow keys', async () => {
		const user = userEvent.setup();
		renderListView();

		await user.click(await screen.findByText('HTTP GET'));

		const drawer = await screen.findByTestId('span-details-drawer');
		expect(within(drawer).getByText('HTTP GET')).toBeInTheDocument();
		expect(within(drawer).getByTestId('span-details-trace-id')).toHaveTextContent(
			'0000000000000000344ded1387b08a7e',
		);

		await user.keyboard('{ArrowDown}');
		await expect(
			within(drawer).findByText('authenticate_check_db'),
		).resolves.toBeInTheDocument();

		await user.keyboard('{ArrowUp}');
		await expect(
			within(drawer).findByText('HTTP GET'),
		).resolves.toBeInTheDocument();
	});

	it('closes the drawer', async () => {
		const user = userEvent.setup();
		renderListView();

		await user.click(await screen.findByText('HTTP GET'));
		await screen.findByTestId('span-details-drawer');

		await user.click(screen.getByTestId('span-drawer-close'));

		await waitFor(() =>
			expect(screen.queryByTestId('span-details-drawer')).not.toBeInTheDocument(),
		);
	});

	it('stays open on a press in the drawer or the list, and closes on one outside', async () => {
		const user = userEvent.setup();
		renderListView();

		await user.click(await screen.findByText('HTTP GET'));
		const drawer = await screen.findByTestId('span-details-drawer');

		await user.click(drawer);
		// Hovering re-renders the row, so the press needs a fresh query.
		await user.hover(screen.getByText('authenticate_check_db'));
		await user.click(screen.getByText('authenticate_check_db'));
		await expect(
			within(drawer).findByText('authenticate_check_db'),
		).resolves.toBeInTheDocument();

		await user.click(document.body);
		await waitFor(() =>
			expect(screen.queryByTestId('span-details-drawer')).not.toBeInTheDocument(),
		);
	});

	it('opens the trace page in a new tab from the row icon without opening the drawer', async () => {
		const open = jest.spyOn(window, 'open').mockImplementation(() => null);
		// user-event leaves the row on its way to the button, which clears the hover.
		const user = userEvent.setup({ skipHover: true });
		renderListView();

		const row = (await screen.findByText('HTTP GET')).closest(
			'tr',
		) as HTMLElement;
		expect(screen.queryByTestId('span-row-open-trace')).not.toBeInTheDocument();
		await user.hover(row);
		await user.click(await screen.findByTestId('span-row-open-trace'));

		expect(open).toHaveBeenCalledWith(
			expect.stringMatching(
				/\/trace\/0000000000000000344ded1387b08a7e\?.*772c4d29dd9076ac/,
			),
			'_blank',
		);
		expect(getCurrentLocation().pathname).toBe('/traces-explorer');
		expect(screen.queryByTestId('span-details-drawer')).not.toBeInTheDocument();
		expect(logEventMock).toHaveBeenCalledWith(
			TracesExplorerEvents.OpenTraceClicked,
			{
				panelType: PANEL_TYPES.LIST,
				source: OpenTraceSource.RowIcon,
			},
		);
	});

	it('opens the trace page in a new tab from the drawer', async () => {
		const open = jest.spyOn(window, 'open').mockImplementation(() => null);
		const user = userEvent.setup();
		renderListView();

		await user.click(getRowCell(await screen.findByTestId(ROW_TEST_ID)));
		expect(logEventMock).not.toHaveBeenCalledWith(
			TracesExplorerEvents.OpenTraceClicked,
			{ panelType: PANEL_TYPES.LIST, source: OpenTraceSource.Row },
		);
		await user.click(await screen.findByTestId('span-drawer-view-full-trace'));

		expect(open).toHaveBeenCalledWith(
			expect.stringMatching(/\/trace\/0000000000000000344ded1387b08a7e\?/),
			'_blank',
		);
		expect(logEventMock).toHaveBeenCalledWith(
			TracesExplorerEvents.OpenTraceClicked,
			{
				panelType: PANEL_TYPES.LIST,
				source: OpenTraceSource.SpanDrawer,
			},
		);
	});

	it('opens the trace page in a new tab on a Cmd-click without opening the drawer', async () => {
		const open = jest.spyOn(window, 'open').mockImplementation(() => null);
		const user = userEvent.setup();
		renderListView();

		const cell = getRowCell(await screen.findByTestId(ROW_TEST_ID));
		await user.keyboard('{Meta>}');
		await user.click(cell);
		await user.keyboard('{/Meta}');

		expect(open).toHaveBeenCalledWith(
			expect.stringMatching(/\/trace\/0000000000000000344ded1387b08a7e\?/),
			'_blank',
			'noopener',
		);
		expect(screen.queryByTestId('span-details-drawer')).not.toBeInTheDocument();
		expect(logEventMock).toHaveBeenCalledWith(
			TracesExplorerEvents.OpenTraceClicked,
			{
				panelType: PANEL_TYPES.LIST,
				source: OpenTraceSource.Row,
			},
		);
	});

	it('shows the row icon only on the hovered copy of a duplicate span', async () => {
		mockSuccess([listRows[0], listRows[0]]);
		// user-event leaves the row on its way to the button, which clears the hover.
		const user = userEvent.setup({ skipHover: true });
		renderListView();

		const [first] = await screen.findAllByText('HTTP GET');
		await user.hover(first.closest('tr') as HTMLElement);

		await expect(
			screen.findAllByTestId('span-row-open-trace'),
		).resolves.toHaveLength(1);
	});
});
