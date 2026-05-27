import { fireEvent, screen } from '@testing-library/react';
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

const mockSetLocalStorageKey = jest.fn();
jest.mock('api/browser/localstorage/set', () => ({
	__esModule: true,
	default: (key: string, value: string): void =>
		mockSetLocalStorageKey(key, value),
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
		mockSetLocalStorageKey.mockClear();
	});

	it('does not render the action buttons while data is still loading', () => {
		render(<TraceDetailsHeader {...baseProps} isDataLoaded={false} />);

		expect(
			screen.queryByRole('button', { name: /switch to legacy trace view/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /^analytics$/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /trace options/i }),
		).not.toBeInTheDocument();
	});

	it('renders Legacy View, Analytics, and Settings action buttons once data is loaded', () => {
		render(<TraceDetailsHeader {...baseProps} isDataLoaded />);

		expect(
			screen.getByRole('button', { name: /switch to legacy trace view/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /^analytics$/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /trace options/i }),
		).toBeInTheDocument();
	});

	it('routes to the legacy trace view and persists the preference on click', () => {
		render(<TraceDetailsHeader {...baseProps} isDataLoaded />);

		fireEvent.click(
			screen.getByRole('button', { name: /switch to legacy trace view/i }),
		);

		expect(mockSetLocalStorageKey).toHaveBeenCalledWith(
			'TRACE_DETAILS_PREFER_OLD_VIEW',
			'true',
		);
		expect(mockReplace).toHaveBeenCalledTimes(1);
		expect(mockReplace).toHaveBeenCalledWith(
			expect.stringContaining('/trace-old/trace-123'),
		);
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
