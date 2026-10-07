import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import type { SpantypesGettableTraceSummaryDTO } from 'api/generated/services/sigNoz.schemas';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import ROUTES from 'constants/routes';
import { render } from 'tests/test-utils';

import TraceDetailsHeader from '../TraceDetailsHeader';
import { useTraceSummary } from '../useTraceSummary';

const MOCK_TRACE_SUMMARY: SpantypesGettableTraceSummaryDTO = {
	startTimestampMillis: 1_700_000_000_000,
	endTimestampMillis: 1_700_000_120_000,
	rootServiceName: '',
	rootServiceEntryPoint: 'Missing Span',
	rootSpanStatusCode: '404',
	totalSpansCount: 3,
	totalErrorSpansCount: 0,
	hasMissingSpans: true,
	ai: {
		tokens: {
			input: 12040,
			output: 3110,
			cacheRead: 8000,
			cacheWrite: 1200,
			reasoning: 900,
		},
		totalCost: 0.0421,
	},
};

jest.mock('../useTraceSummary', () => ({
	useTraceSummary: jest.fn(),
}));

beforeEach(() => {
	jest
		.mocked(useTraceSummary)
		.mockReturnValue({ data: MOCK_TRACE_SUMMARY, isLoading: false });
});

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

const baseProps = { onFilteredSpansChange: jest.fn() };

const metadataText = /Missing Span/;

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

	it('does not render the action buttons without a filter handler', () => {
		render(<TraceDetailsHeader />);

		expect(
			screen.queryByRole('button', { name: /^analytics$/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /trace options/i }),
		).not.toBeInTheDocument();
	});

	it('renders Analytics and Settings action buttons', () => {
		render(<TraceDetailsHeader {...baseProps} />);

		expect(
			screen.getByRole('button', { name: /^analytics$/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /trace options/i }),
		).toBeInTheDocument();
	});

	it('toggles the AnalyticsPanel open state when the Analytics button is clicked', () => {
		render(<TraceDetailsHeader {...baseProps} />);

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
	it('shows skeletons instead of the metadata while the summary loads', () => {
		jest
			.mocked(useTraceSummary)
			.mockReturnValue({ data: undefined, isLoading: true });
		const { container } = render(<TraceDetailsHeader {...baseProps} />);

		expect(screen.queryByText(metadataText)).not.toBeInTheDocument();
		expect(container.querySelectorAll('.ant-skeleton-input')).toHaveLength(3);
	});

	it('renders the summary metadata with tokens and cost', () => {
		render(<TraceDetailsHeader {...baseProps} />);

		const { startTimestampMillis, endTimestampMillis } = MOCK_TRACE_SUMMARY;
		const duration = getYAxisFormattedValue(
			`${endTimestampMillis - startTimestampMillis}`,
			'ms',
		);

		expect(screen.getByText(metadataText)).toBeInTheDocument();
		expect(screen.getByText(duration)).toBeInTheDocument();
		expect(screen.getByText('Tokens: 12,040 → 3,110')).toBeInTheDocument();
		expect(screen.getByText('$ 0.0421')).toBeInTheDocument();
	});

	it('renders the root span status code', () => {
		render(<TraceDetailsHeader {...baseProps} />);

		expect(screen.getByText('404')).toBeInTheDocument();
	});

	it('omits AI tokens and cost when the summary has no ai field', () => {
		jest.mocked(useTraceSummary).mockReturnValue({
			data: { ...MOCK_TRACE_SUMMARY, ai: undefined },
			isLoading: false,
		});
		render(<TraceDetailsHeader {...baseProps} />);

		expect(screen.queryByText(/^Tokens:/)).not.toBeInTheDocument();
		expect(screen.queryByText(/^\$ /)).not.toBeInTheDocument();
	});

	it('shows skeletons instead of the metadata when the summary is absent', () => {
		jest
			.mocked(useTraceSummary)
			.mockReturnValue({ data: undefined, isLoading: false });
		const { container } = render(<TraceDetailsHeader {...baseProps} />);

		expect(screen.queryByText(metadataText)).not.toBeInTheDocument();
		expect(container.querySelectorAll('.ant-skeleton-input')).toHaveLength(3);
	});

	it('is shown by default and can be hidden / shown again via the Trace options menu', async () => {
		const user = userEvent.setup({ delay: null });
		render(<TraceDetailsHeader {...baseProps} />);

		expect(screen.getByText(metadataText)).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /trace options/i }));
		await user.click(
			await screen.findByRole('menuitem', { name: /hide trace details/i }),
		);
		expect(screen.queryByText(metadataText)).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /trace options/i }));
		await user.click(
			await screen.findByRole('menuitem', { name: /show trace details/i }),
		);
		expect(screen.getByText(metadataText)).toBeInTheDocument();
	});
});

describe('TraceDetailsHeader – tabs', () => {
	// In-memory URL state, so a tab switch can't leak into the next test.
	const renderHeader = (): void => {
		render(
			<NuqsTestingAdapter hasMemory>
				<TraceDetailsHeader {...baseProps} />
			</NuqsTestingAdapter>,
		);
	};

	it('shows the Overview-only sections on the Overview tab', () => {
		renderHeader();

		expect(screen.getByTestId('filters-stub')).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /^analytics$/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /trace options/i }),
		).toBeInTheDocument();
		expect(screen.getByTestId('missing-spans-banner')).toBeInTheDocument();
	});

	it('keeps only the metadata row on the Thread tab', async () => {
		const user = userEvent.setup({ delay: null });
		renderHeader();

		await user.click(screen.getByTestId('trace-details-tab-thread'));

		expect(screen.queryByTestId('filters-stub')).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /^analytics$/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /trace options/i }),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('missing-spans-banner')).not.toBeInTheDocument();
		expect(screen.getByText(metadataText)).toBeInTheDocument();
	});

	it('shows the metadata row on the Thread tab even when hidden on Overview', async () => {
		const user = userEvent.setup({ delay: null });
		renderHeader();

		await user.click(screen.getByRole('button', { name: /trace options/i }));
		await user.click(
			await screen.findByRole('menuitem', { name: /hide trace details/i }),
		);
		expect(screen.queryByText(metadataText)).not.toBeInTheDocument();

		await user.click(screen.getByTestId('trace-details-tab-thread'));

		expect(screen.getByText(metadataText)).toBeInTheDocument();
	});

	it('closes the Analytics panel when switching to the Thread tab', async () => {
		const user = userEvent.setup({ delay: null });
		renderHeader();

		await user.click(screen.getByRole('button', { name: /^analytics$/i }));
		expect(screen.getByTestId('analytics-panel')).toHaveAttribute(
			'data-open',
			'true',
		);

		await user.click(screen.getByTestId('trace-details-tab-thread'));

		expect(screen.getByTestId('analytics-panel')).toHaveAttribute(
			'data-open',
			'false',
		);
	});
});
