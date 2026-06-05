import { screen } from '@testing-library/react';
import useGetTraceAggregations from 'hooks/trace/useGetTraceAggregations';
import { render } from 'tests/test-utils';

import { DEFAULT_COLOR_BY_FIELD } from '../../../constants';
import { useTraceStore } from '../../../stores/traceStore';
import AnalyticsPanel from '../AnalyticsPanel';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useParams: (): { id: string } => ({ id: 'trace-123' }),
}));

jest.mock('hooks/trace/useGetTraceAggregations', () => ({
	__esModule: true,
	default: jest.fn(),
}));

// Isolate the panel's own logic from the floating-panel chrome.
jest.mock('periscope/components/FloatingPanel', () => ({
	__esModule: true,
	FloatingPanel: ({ children }: { children: React.ReactNode }): JSX.Element => (
		<div>{children}</div>
	),
}));
jest.mock('components/DetailsPanel', () => ({
	__esModule: true,
	DetailsHeader: (): JSX.Element => <div data-testid="details-header" />,
}));
jest.mock('components/Spinner', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="spinner" />,
}));

const mockHook = useGetTraceAggregations as jest.Mock;

const noop = (): void => undefined;

const renderPanel = (isOpen = true): ReturnType<typeof render> =>
	render(<AnalyticsPanel isOpen={isOpen} onClose={noop} onTabChange={noop} />);

const aggregationsResponse = {
	status: 'success',
	data: {
		aggregations: [
			{
				field: { name: 'service.name' },
				aggregation: 'execution_time_percentage',
				value: { api: 80, db: 20 },
			},
			{
				field: { name: 'service.name' },
				aggregation: 'span_count',
				value: { api: 5, db: 2 },
			},
		],
	},
};

describe('AnalyticsPanel', () => {
	beforeEach(() => {
		mockHook.mockReset();
		useTraceStore.setState({ colorByField: DEFAULT_COLOR_BY_FIELD });
	});

	it('renders nothing when closed and does not enable the fetch', () => {
		mockHook.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: false,
		});
		const { container } = renderPanel(false);
		expect(container).toBeEmptyDOMElement();
		expect(mockHook).toHaveBeenCalledWith(
			expect.objectContaining({ enabled: false }),
		);
	});

	it('requests both aggregations for the current color-by field when open', () => {
		mockHook.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
		});
		renderPanel();
		expect(mockHook).toHaveBeenCalledWith(
			expect.objectContaining({
				traceId: 'trace-123',
				enabled: true,
				aggregations: [
					{
						field: DEFAULT_COLOR_BY_FIELD,
						aggregation: 'execution_time_percentage',
					},
					{ field: DEFAULT_COLOR_BY_FIELD, aggregation: 'span_count' },
				],
			}),
		);
	});

	it('shows the loading state with the tabs still visible', () => {
		mockHook.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
		});
		renderPanel();
		expect(screen.getByTestId('spinner')).toBeInTheDocument();
		// tabs stay visible while loading
		expect(screen.getByText('% exec time')).toBeInTheDocument();
		expect(screen.getByText('Spans')).toBeInTheDocument();
	});

	it('shows an error state when the request fails', () => {
		mockHook.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		renderPanel();
		expect(screen.getByText(/couldn't load analytics/i)).toBeInTheDocument();
	});

	it('renders rows for the current field on success', () => {
		mockHook.mockReturnValue({
			data: aggregationsResponse,
			isLoading: false,
			isError: false,
		});
		renderPanel();
		expect(screen.getByText('api')).toBeInTheDocument();
		expect(screen.getByText('80.00%')).toBeInTheDocument();
	});

	it('shows an empty state when the field has no data', () => {
		mockHook.mockReturnValue({
			data: { status: 'success', data: { aggregations: [] } },
			isLoading: false,
			isError: false,
		});
		renderPanel();
		expect(screen.getByText(/no data for service.name/i)).toBeInTheDocument();
	});
});
