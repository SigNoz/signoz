import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import ROUTES from 'constants/routes';
import { render } from 'tests/test-utils';

import TraceDetailsHeader from '../TraceDetailsHeader';

const mockGoBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockHasInAppHistory = jest.fn();

jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		goBack: (): void => mockGoBack(),
		push: (path: string): void => mockPush(path),
		replace: (path: string): void => mockReplace(path),
		location: { pathname: '/', search: '' },
		listen: (): (() => void) => (): void => undefined,
	},
	hasInAppHistory: (): boolean => mockHasInAppHistory(),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useParams: (): { id: string } => ({ id: 'trace-123' }),
}));

jest.mock(
	'../../TraceWaterfall/TraceWaterfallStates/Success/Filters/Filters',
	() => ({
		__esModule: true,
		default: (): JSX.Element => <div data-testid="filters-stub" />,
	}),
);

jest.mock('../../SpanDetailsPanel/AnalyticsPanel/AnalyticsPanel', () => ({
	__esModule: true,
	default: ({ isOpen }: { isOpen: boolean }): JSX.Element => (
		<div data-testid="analytics-panel" data-open={isOpen ? 'true' : 'false'} />
	),
}));

jest.mock('components/FieldsSelector', () => ({
	__esModule: true,
	default: ({ isOpen }: { isOpen: boolean }): JSX.Element => (
		<div data-testid="fields-selector" data-open={isOpen ? 'true' : 'false'} />
	),
}));

const baseProps = {
	filterMetadata: {
		startTime: 0,
		endTime: 1,
		traceId: 'trace-123',
	},
	onFilteredSpansChange: jest.fn(),
	isDataLoaded: false,
};

describe('TraceDetailsHeader – back button', () => {
	beforeEach(() => {
		mockGoBack.mockClear();
		mockPush.mockClear();
		mockHasInAppHistory.mockReset();
	});

	it('calls history.goBack() when there is in-app SPA history', () => {
		mockHasInAppHistory.mockReturnValue(true);
		render(<TraceDetailsHeader {...baseProps} />);

		fireEvent.click(screen.getByRole('button', { name: /back/i }));

		expect(mockGoBack).toHaveBeenCalledTimes(1);
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('pushes to the traces explorer route when there is no in-app SPA history', () => {
		mockHasInAppHistory.mockReturnValue(false);
		render(<TraceDetailsHeader {...baseProps} />);

		fireEvent.click(screen.getByRole('button', { name: /back/i }));

		expect(mockPush).toHaveBeenCalledTimes(1);
		expect(mockPush).toHaveBeenCalledWith(ROUTES.TRACES_EXPLORER);
		expect(mockGoBack).not.toHaveBeenCalled();
	});
});

describe('TraceDetailsHeader – action cluster', () => {
	beforeEach(() => {
		mockReplace.mockClear();
	});

	it('does not render the action buttons while data is still loading', () => {
		render(<TraceDetailsHeader {...baseProps} isDataLoaded={false} />);

		expect(
			screen.queryByRole('button', { name: /^analytics$/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /trace options/i }),
		).not.toBeInTheDocument();
	});

	it('renders Analytics and Settings action buttons once data is loaded', () => {
		render(<TraceDetailsHeader {...baseProps} isDataLoaded />);

		expect(
			screen.getByRole('button', { name: /^analytics$/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /trace options/i }),
		).toBeInTheDocument();
	});

	it('toggles the AnalyticsPanel open state when the Analytics button is clicked', () => {
		render(<TraceDetailsHeader {...baseProps} isDataLoaded />);

		const panel = screen.getByTestId('analytics-panel');
		expect(panel).toHaveAttribute('data-open', 'false');

		const analyticsBtn = screen.getByRole('button', { name: /^analytics$/i });

		fireEvent.click(analyticsBtn);
		expect(panel).toHaveAttribute('data-open', 'true');

		fireEvent.click(analyticsBtn);
		expect(panel).toHaveAttribute('data-open', 'false');
	});
});

describe('TraceDetailsHeader – trace metadata row', () => {
	// Plain prop, no API mock needed: traceMetadata is passed straight in.
	const traceMetadata = {
		startTimestampMillis: 1_700_000_000_000,
		endTimestampMillis: 1_700_000_120_000, // +120000ms = 2 min
		rootServiceName: 'inventory-frontend',
		rootServiceEntryPoint: 'large-trace-root',
		rootSpanStatusCode: '404',
		hasMissingSpans: false,
	};

	it('renders the metadata (service, entry point, duration, status) when provided', () => {
		render(
			<TraceDetailsHeader
				{...baseProps}
				isDataLoaded
				traceMetadata={traceMetadata}
			/>,
		);

		expect(screen.getByText(/inventory-frontend/)).toBeInTheDocument();
		expect(screen.getByText('large-trace-root')).toBeInTheDocument();
		expect(screen.getByText('404')).toBeInTheDocument();
		// Duration goes through the shared formatter (e.g. "2 min").
		const duration = getYAxisFormattedValue(
			`${traceMetadata.endTimestampMillis - traceMetadata.startTimestampMillis}`,
			'ms',
		);
		expect(screen.getByText(duration)).toBeInTheDocument();
	});

	it('is shown by default and can be hidden / shown again via the Trace options menu', async () => {
		const user = userEvent.setup({ delay: null });
		render(
			<TraceDetailsHeader
				{...baseProps}
				isDataLoaded
				traceMetadata={traceMetadata}
			/>,
		);

		// Visible by default (showTraceDetails defaults to true).
		expect(screen.getByText(/inventory-frontend/)).toBeInTheDocument();

		// Hide it.
		await user.click(screen.getByRole('button', { name: /trace options/i }));
		await user.click(
			await screen.findByRole('menuitem', { name: /hide trace details/i }),
		);
		expect(screen.queryByText(/inventory-frontend/)).not.toBeInTheDocument();

		// Show it again.
		await user.click(screen.getByRole('button', { name: /trace options/i }));
		await user.click(
			await screen.findByRole('menuitem', { name: /show trace details/i }),
		);
		expect(screen.getByText(/inventory-frontend/)).toBeInTheDocument();
	});

	it('does not render the metadata row when traceMetadata is absent', () => {
		render(<TraceDetailsHeader {...baseProps} isDataLoaded />);

		expect(screen.queryByText(/inventory-frontend/)).not.toBeInTheDocument();
	});
});
