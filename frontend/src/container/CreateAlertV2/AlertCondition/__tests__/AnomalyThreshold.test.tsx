/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import {
	INITIAL_ALERT_STATE,
	INITIAL_ALERT_THRESHOLD_STATE,
} from 'container/CreateAlertV2/context/constants';

import * as context from '../../context';
import AnomalyThreshold from '../AnomalyThreshold';

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock: any = jest.fn(() => ({
		paths,
	}));
	uplotMock.paths = paths;
	return uplotMock;
});

const mockSetAlertState = jest.fn();
const mockSetThresholdState = jest.fn();
jest.spyOn(context, 'useCreateAlertState').mockReturnValue({
	alertState: INITIAL_ALERT_STATE,
	setAlertState: mockSetAlertState,
	thresholdState: INITIAL_ALERT_THRESHOLD_STATE,
	setThresholdState: mockSetThresholdState,
} as any);

// Mock useQueryBuilder hook
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
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
	render(<AnomalyThreshold />);

describe('AnomalyThreshold', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
