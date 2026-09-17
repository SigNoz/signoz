import { render, screen } from '@testing-library/react';
import { createMockAlertContextState } from 'container/CreateAlertV2/EvaluationSettings/__tests__/testUtils';
import { getAppContextMockState } from 'container/RoutingPolicies/__tests__/testUtils';
import * as appHooks from 'providers/App/App';

import * as context from '../../context';
import AnomalyThreshold from '../AnomalyThreshold';

vi.mock('providers/App/App', { spy: true });
vi.mock('../../context', { spy: true });

vi.mocked(appHooks.useAppContext).mockReturnValue(getAppContextMockState());

vi.mock('uplot', () => {
	const paths = {
		spline: vi.fn(),
		bars: vi.fn(),
	};
	const uplotMock: any = vi.fn(() => ({
		paths,
	}));
	uplotMock.paths = paths;
	return {
		paths,
		default: uplotMock,
	};
});

const mockSetAlertState = vi.fn();
const mockSetThresholdState = vi.fn();
vi.mocked(context.useCreateAlertState).mockReturnValue(
	createMockAlertContextState({
		setThresholdState: mockSetThresholdState,
		setAlertState: mockSetAlertState,
	}),
);

// Mock useQueryBuilder hook
vi.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): {
		currentQuery: {
			dataSource: string;
			queryName: string;
			builder: {
				queryData: Array<{ queryName: string }>;
				queryFormulas: Array<{ queryName: string }>;
			};
		};
	} => ({
		currentQuery: {
			dataSource: 'METRICS',
			queryName: 'A',
			builder: {
				queryData: [{ queryName: 'Query A' }, { queryName: 'Query B' }],
				queryFormulas: [{ queryName: 'Formula 1' }],
			},
		},
	}),
}));

const renderAnomalyThreshold = (): ReturnType<typeof render> =>
	render(
		<AnomalyThreshold
			channels={[]}
			isLoadingChannels={false}
			isErrorChannels={false}
			refreshChannels={vi.fn()}
		/>,
	);

describe('AnomalyThreshold', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the first condition sentence', () => {
		renderAnomalyThreshold();
		expect(screen.getByTestId('notification-text')).toBeInTheDocument();
		expect(screen.getByTestId('evaluation-window-text')).toBeInTheDocument();
		expect(screen.getByTestId('evaluation-window-select')).toBeInTheDocument();
	});

	it('renders the second condition sentence', () => {
		renderAnomalyThreshold();
		expect(screen.getByTestId('threshold-text')).toBeInTheDocument();
		expect(screen.getByTestId('threshold-value-select')).toBeInTheDocument();
		expect(screen.getByTestId('deviations-text')).toBeInTheDocument();
		expect(screen.getByTestId('operator-select')).toBeInTheDocument();
		expect(screen.getByTestId('predicted-data-text')).toBeInTheDocument();
		expect(screen.getByTestId('match-type-select')).toBeInTheDocument();
	});

	it('renders the third condition sentence', () => {
		renderAnomalyThreshold();
		expect(screen.getByTestId('using-the-text')).toBeInTheDocument();
		expect(screen.getByTestId('algorithm-select')).toBeInTheDocument();
		expect(screen.getByTestId('algorithm-with-text')).toBeInTheDocument();
		expect(screen.getByTestId('seasonality-select')).toBeInTheDocument();
		expect(screen.getByTestId('seasonality-text')).toBeInTheDocument();
	});
});
