import { QueryParams } from 'constants/query';
import { render, screen } from 'tests/test-utils';
import { Widgets } from 'types/api/dashboard/getAll';

import TracesTableComponent from '../TracesTableComponent';

jest.mock('components/OverlayScrollbar/OverlayScrollbar', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }): JSX.Element => (
		<div>{children}</div>
	),
}));

Object.defineProperty(globalThis, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
	})),
});

const WIDGET_ID = 'traces-panel-widget-id';

const widget = ({
	id: WIDGET_ID,
	selectedTracesFields: [],
	query: { builder: { queryData: [{ dataSource: 'traces' }] } },
} as unknown) as Widgets;

const queryResponse = ({
	data: { payload: { data: { newResult: { data: { result: [] } } } } },
	isError: false,
	isFetching: false,
} as unknown) as never;

const renderWithPaginationInUrl = (limit: number): void => {
	const paginationValue = encodeURIComponent(
		JSON.stringify({ offset: 0, limit }),
	);
	render(
		<TracesTableComponent
			widget={widget}
			queryResponse={queryResponse}
			setRequestData={jest.fn()}
		/>,
		undefined,
		{ initialRoute: `/?${QueryParams.pagination}-${WIDGET_ID}=${paginationValue}` },
	);
};

describe('TracesTableComponent pagination', () => {
	it('reflects the page size persisted in the URL instead of resetting to the default', () => {
		renderWithPaginationInUrl(25);

		expect(screen.getByText('25 / page')).toBeInTheDocument();
		expect(screen.queryByText('10 / page')).not.toBeInTheDocument();
	});
});
