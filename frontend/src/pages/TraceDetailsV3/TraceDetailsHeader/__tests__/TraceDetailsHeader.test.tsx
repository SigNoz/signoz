import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import type { SpantypesGettableTraceSummaryDTO } from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import { render } from 'tests/test-utils';

import TraceDetailsHeader from '../TraceDetailsHeader';
import { useTraceSummary } from '../useTraceSummary';

jest.mock('../useTraceSummary', () => ({
	useTraceSummary: jest.fn(() => ({ data: undefined, isLoading: false })),
}));

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
	onFilteredSpansChange: jest.fn(),
	showTraceDetailsHeaderOptions: false,
};

const SUMMARY = {
	startTimestampMillis: 1_700_000_000_000,
	endTimestampMillis: 1_700_000_120_000,
	rootServiceName: 'frontend',
	rootServiceEntryPoint: 'GET /checkout',
	rootSpanStatusCode: '200',
	hasMissingSpans: false,
	totalSpansCount: 3,
	totalErrorSpansCount: 0,
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
		jest
			.mocked(useTraceSummary)
			.mockReturnValue({ data: SUMMARY, isLoading: false });
	});

	afterEach(() => {
		jest
			.mocked(useTraceSummary)
			.mockReturnValue({ data: undefined, isLoading: false });
	});

	it('does not render the action buttons until the summary loads', () => {
		jest
			.mocked(useTraceSummary)
			.mockReturnValue({ data: undefined, isLoading: true });
		render(<TraceDetailsHeader {...baseProps} showTraceDetailsHeaderOptions />);

		expect(
			screen.queryByRole('button', { name: /^analytics$/i }),
		).not.toBeInTheDocument();
	});

	it('does not render the action buttons while data is still loading', () => {
		render(
			<TraceDetailsHeader {...baseProps} showTraceDetailsHeaderOptions={false} />,
		);

		expect(
			screen.queryByRole('button', { name: /^analytics$/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /trace options/i }),
		).not.toBeInTheDocument();
	});

	it('renders Analytics and Settings action buttons once data is loaded', () => {
		render(<TraceDetailsHeader {...baseProps} showTraceDetailsHeaderOptions />);

		expect(
			screen.getByRole('button', { name: /^analytics$/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /trace options/i }),
		).toBeInTheDocument();
	});

	it('toggles the AnalyticsPanel open state when the Analytics button is clicked', () => {
		render(<TraceDetailsHeader {...baseProps} showTraceDetailsHeaderOptions />);

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
	// useTraceSummary is mocked, so no API call is made.
	const traceMetadata = {
		startTimestampMillis: 1_700_000_000_000,
		endTimestampMillis: 1_700_000_120_000, // +120000ms = 2 min
		rootServiceName: 'inventory-frontend',
		rootServiceEntryPoint: 'large-trace-root',
		rootSpanStatusCode: '404',
		hasMissingSpans: false,
		totalSpansCount: 42,
		totalErrorSpansCount: 0,
		ai: {
			tokens: {
				input: 12040,
				output: 3110,
				cacheRead: 0,
				cacheWrite: 0,
				reasoning: 0,
			},
			totalCost: 0.0421,
		},
	};

	const mockSummary = (data?: SpantypesGettableTraceSummaryDTO): void => {
		jest.mocked(useTraceSummary).mockReturnValue({ data, isLoading: false });
	};

	afterEach(() => {
		mockSummary(undefined);
	});

	it('renders the metadata (service, entry point, duration, status) when provided', () => {
		mockSummary(traceMetadata);
		render(<TraceDetailsHeader {...baseProps} showTraceDetailsHeaderOptions />);

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

	it('renders AI tokens and cost when the summary has them', () => {
		mockSummary(traceMetadata);
		render(<TraceDetailsHeader {...baseProps} showTraceDetailsHeaderOptions />);

		expect(screen.getByText('Tokens: 12,040 → 3,110')).toBeInTheDocument();
		expect(screen.getByText('Cost — $ 0.0421')).toBeInTheDocument();
	});

	it('omits AI tokens and cost when the summary has no ai field', () => {
		mockSummary({ ...traceMetadata, ai: undefined });
		render(<TraceDetailsHeader {...baseProps} showTraceDetailsHeaderOptions />);

		expect(screen.queryByText(/^Tokens:/)).not.toBeInTheDocument();
		expect(screen.queryByText(/^Cost —/)).not.toBeInTheDocument();
	});

	it('is shown by default and can be hidden / shown again via the Trace options menu', async () => {
		const user = userEvent.setup({ delay: null });
		mockSummary(traceMetadata);
		render(<TraceDetailsHeader {...baseProps} showTraceDetailsHeaderOptions />);

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

	it('shows skeletons instead of the metadata when the summary is absent', () => {
		const { container } = render(
			<TraceDetailsHeader {...baseProps} showTraceDetailsHeaderOptions />,
		);

		expect(screen.queryByText(/inventory-frontend/)).not.toBeInTheDocument();
		expect(container.querySelectorAll('.ant-skeleton-input')).toHaveLength(3);
	});
});
