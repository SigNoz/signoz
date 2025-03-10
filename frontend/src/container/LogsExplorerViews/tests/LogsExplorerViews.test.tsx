import ROUTES from 'constants/routes';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { logsQueryRangeSuccessResponse } from 'mocks-server/__mockdata__/logs_query_range';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { SELECTED_VIEWS } from 'pages/LogsExplorer/utils';
import { VirtuosoMockContext } from 'react-virtuoso';
import { fireEvent, render, RenderResult } from 'tests/test-utils';

import LogsExplorerViews from '..';
import { logsQueryRangeSuccessNewFormatResponse } from './mock';

const queryRangeURL = 'http://localhost/api/v3/query_range';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.LOGS_EXPLORER}`,
	}),
}));

const lodsQueryServerRequest = (): void =>
	server.use(
		rest.post(queryRangeURL, (req, res, ctx) =>
			res(ctx.status(200), ctx.json(logsQueryRangeSuccessResponse)),
		),
	);

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

// mocking the graph components in this test as this should be handled separately
jest.mock(
	'container/TimeSeriesView/TimeSeriesView',
	() =>
		// eslint-disable-next-line func-names, @typescript-eslint/explicit-function-return-type, react/display-name
		function () {
			return <div>Time Series Chart</div>;
		},
);
jest.mock(
	'container/LogsExplorerChart',
	() =>
		// eslint-disable-next-line func-names, @typescript-eslint/explicit-function-return-type, react/display-name
		function () {
			return <div>Histogram Chart</div>;
		},
);

jest.mock('api/common/getQueryStats', () => ({
	getQueryStats: jest.fn(),
}));

jest.mock('constants/panelTypes', () => ({
	AVAILABLE_EXPORT_PANEL_TYPES: ['graph', 'table'],
}));

jest.mock('d3-interpolate', () => ({
	interpolate: jest.fn(),
}));

jest.mock('hooks/queryBuilder/useGetExplorerQueryRange', () => ({
	__esModule: true,
	useGetExplorerQueryRange: jest.fn(),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

// Set up the specific behavior for useGetExplorerQueryRange in individual test cases
beforeEach(() => {
	(useGetExplorerQueryRange as jest.Mock).mockReturnValue({
		data: { payload: logsQueryRangeSuccessNewFormatResponse },
	});
});

const renderer = (): RenderResult =>
	render(
		<VirtuosoMockContext.Provider
			value={{ viewportHeight: 300, itemHeight: 100 }}
		>
			<LogsExplorerViews
				selectedView={SELECTED_VIEWS.SEARCH}
				showFrequencyChart
				setIsLoadingQueries={(): void => {}}
				listQueryKeyRef={{ current: {} }}
				chartQueryKeyRef={{ current: {} }}
			/>
		</VirtuosoMockContext.Provider>,
	);

describe('LogsExplorerViews -', () => {
	it('render correctly with props - list and table', async () => {
		lodsQueryServerRequest();
		const { queryByText, queryByTestId } = renderer();

		expect(queryByTestId('periscope-btn')).toBeInTheDocument();
		fireEvent.click(queryByTestId('periscope-btn') as HTMLElement);

		expect(document.querySelector('.menu-container')).toBeInTheDocument();

		const menuItems = document.querySelectorAll('.menu-items .item');
		expect(menuItems.length).toBe(3);

		// switch to table view
		// eslint-disable-next-line sonarjs/no-duplicate-string
		fireEvent.click(queryByTestId('table-view') as HTMLElement);

		expect(
			queryByText(
				'{"container_id":"container_id","container_name":"container_name","driver":"driver","eta":"2m0s","location":"frontend","log_level":"INFO","message":"Dispatch successful","service":"frontend","span_id":"span_id","trace_id":"span_id"}',
			),
		).toBeInTheDocument();
	});

	it('check isLoading state', async () => {
		lodsQueryServerRequest();
		(useGetExplorerQueryRange as jest.Mock).mockReturnValue({
			data: { payload: logsQueryRangeSuccessNewFormatResponse },
			isLoading: true,
			isFetching: false,
		});
		const { queryByText, queryByTestId } = renderer();

		// switch to table view
		fireEvent.click(queryByTestId('table-view') as HTMLElement);
		expect(queryByText('pending_data_placeholder')).toBeInTheDocument();
	});

	it('check error state', async () => {
		lodsQueryServerRequest();
		(useGetExplorerQueryRange as jest.Mock).mockReturnValue({
			data: { payload: logsQueryRangeSuccessNewFormatResponse },
			isLoading: false,
			isFetching: false,
			isError: true,
		});
		const { queryByText, queryByTestId } = renderer();

		expect(
			queryByText('Something went wrong. Please try again or contact support.'),
		).toBeInTheDocument();

		// switch to table view
		fireEvent.click(queryByTestId('table-view') as HTMLElement);

		expect(
			queryByText('Something went wrong. Please try again or contact support.'),
		).toBeInTheDocument();
	});
});
