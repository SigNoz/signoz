/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';

import { CreateAlertProvider } from '../../context';
import AlertCondition from '../AlertCondition';

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

const STEPPER_TEST_ID = 'stepper';
const ALERT_THRESHOLD_TEST_ID = 'alert-threshold';
const ANOMALY_THRESHOLD_TEST_ID = 'anomaly-threshold';
const THRESHOLD_VIEW_TEST_ID = 'threshold-view';
const ANOMALY_VIEW_TEST_ID = 'anomaly-view';
const ANOMALY_TAB_TEXT = 'Anomaly';
const THRESHOLD_TAB_TEXT = 'Threshold';
const ACTIVE_TAB_CLASS = '.active-tab';

// Mock the Stepper component
jest.mock('../../Stepper', () => ({
	__esModule: true,
	default: function MockStepper({
		stepNumber,
		label,
	}: {
		stepNumber: number;
		label: string;
	}): JSX.Element {
		return (
			<div data-testid={STEPPER_TEST_ID}>{`Step ${stepNumber}: ${label}`}</div>
		);
	},
}));

// Mock the AlertThreshold component
jest.mock('../AlertThreshold', () => ({
	__esModule: true,
	default: function MockAlertThreshold(): JSX.Element {
		return (
			<div data-testid={ALERT_THRESHOLD_TEST_ID}>Alert Threshold Component</div>
		);
	},
}));

// Mock the AnomalyThreshold component
jest.mock('../AnomalyThreshold', () => ({
	__esModule: true,
	default: function MockAnomalyThreshold(): JSX.Element {
		return (
			<div data-testid={ANOMALY_THRESHOLD_TEST_ID}>
				Anomaly Threshold Component
			</div>
		);
	},
}));

// Mock useQueryBuilder hook
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): {
		currentQuery: {
			builder: { queryData: unknown[]; queryFormulas: unknown[] };
			dataSource: string;
			queryName: string;
		};
	} => ({
		currentQuery: {
			dataSource: 'METRICS',
			queryName: 'A',
			builder: {
				queryData: [{ dataSource: 'METRICS' }],
				queryFormulas: [],
			},
		},
	}),
}));

const createTestQueryClient = (): QueryClient =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

const renderAlertCondition = (): ReturnType<typeof render> => {
	const queryClient = createTestQueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			<CreateAlertProvider>
				<AlertCondition />
			</CreateAlertProvider>
		</QueryClientProvider>,
	);
};

describe('AlertCondition', () => {
	it('renders the stepper with correct step number and label', () => {
		renderAlertCondition();
		expect(screen.getByTestId(STEPPER_TEST_ID)).toHaveTextContent(
			'Step 2: Set alert conditions',
		);
	});

	it('renders threshold tab by default', () => {
		renderAlertCondition();
		expect(screen.getByText(THRESHOLD_TAB_TEXT)).toBeInTheDocument();
		expect(screen.getByTestId(THRESHOLD_VIEW_TEST_ID)).toBeInTheDocument();
	});

	it('renders anomaly tab when alert type supports multiple tabs', () => {
		renderAlertCondition();
		expect(screen.getByText(ANOMALY_TAB_TEXT)).toBeInTheDocument();
		expect(screen.getByTestId(ANOMALY_VIEW_TEST_ID)).toBeInTheDocument();
	});

	it('shows AlertThreshold component when alert type is not anomaly based', () => {
		renderAlertCondition();
		expect(screen.getByTestId(ALERT_THRESHOLD_TEST_ID)).toBeInTheDocument();
		expect(
			screen.queryByTestId(ANOMALY_THRESHOLD_TEST_ID),
		).not.toBeInTheDocument();
	});

	it('shows AnomalyThreshold component when alert type is anomaly based', () => {
		renderAlertCondition();

		// Click on anomaly tab to switch to anomaly-based alert
		const anomalyTab = screen.getByText(ANOMALY_TAB_TEXT);
		fireEvent.click(anomalyTab);

		expect(screen.getByTestId(ANOMALY_THRESHOLD_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(ALERT_THRESHOLD_TEST_ID)).not.toBeInTheDocument();
	});

	it('switches between threshold and anomaly tabs', () => {
		renderAlertCondition();

		// Initially shows threshold component
		expect(screen.getByTestId(ALERT_THRESHOLD_TEST_ID)).toBeInTheDocument();

		// Click anomaly tab
		const anomalyTab = screen.getByText(ANOMALY_TAB_TEXT);
		fireEvent.click(anomalyTab);

		// Should show anomaly component
		expect(screen.getByTestId(ANOMALY_THRESHOLD_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(ALERT_THRESHOLD_TEST_ID)).not.toBeInTheDocument();

		// Click threshold tab
		const thresholdTab = screen.getByText(THRESHOLD_TAB_TEXT);
		fireEvent.click(thresholdTab);

		// Should show threshold component again
		expect(screen.getByTestId(ALERT_THRESHOLD_TEST_ID)).toBeInTheDocument();
		expect(
			screen.queryByTestId(ANOMALY_THRESHOLD_TEST_ID),
		).not.toBeInTheDocument();
	});

	it('applies active tab styling correctly', () => {
		renderAlertCondition();

		const thresholdTab = screen.getByText(THRESHOLD_TAB_TEXT);
		const anomalyTab = screen.getByText(ANOMALY_TAB_TEXT);

		// Threshold tab should be active by default
		expect(thresholdTab.closest(ACTIVE_TAB_CLASS)).toBeInTheDocument();
		expect(anomalyTab.closest(ACTIVE_TAB_CLASS)).not.toBeInTheDocument();

		// Click anomaly tab
		fireEvent.click(anomalyTab);

		// Anomaly tab should be active now
		expect(anomalyTab.closest(ACTIVE_TAB_CLASS)).toBeInTheDocument();
		expect(thresholdTab.closest(ACTIVE_TAB_CLASS)).not.toBeInTheDocument();
	});
});
