import { IAppContext } from 'providers/App/types';
import { render, screen, userEvent } from 'tests/test-utils';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { QueryBuilderContextType } from 'types/common/queryBuilder';

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

const mockHandleSetQueryData: jest.MockedFunction<
	QueryBuilderContextType['handleSetQueryData']
> = jest.fn();
const mockRedirectWithQueryBuilderData: jest.MockedFunction<
	QueryBuilderContextType['redirectWithQueryBuilderData']
> = jest.fn();
const mockCurrentQuery = {
	dataSource: 'METRICS',
	queryName: 'A',
	builder: {
		queryData: [{ dataSource: 'METRICS' }],
		queryFormulas: [],
	},
};

// Mock useQueryBuilder hook
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => ({
		currentQuery: mockCurrentQuery,
		redirectWithQueryBuilderData: mockRedirectWithQueryBuilderData,
		handleSetQueryData: mockHandleSetQueryData,
	}),
}));

const renderAlertCondition = (
	alertType?: string,
	appContextOverrides?: Partial<IAppContext>,
): ReturnType<typeof render> =>
	render(
		<CreateAlertProvider initialAlertType={AlertTypes.METRICS_BASED_ALERT}>
			<AlertCondition />
		</CreateAlertProvider>,
		undefined,
		{
			initialRoute: alertType ? `/?alertType=${alertType}` : '/',
			appContextOverrides,
		},
	);

const clickText = async (text: string): Promise<void> => {
	const user = userEvent.setup({ pointerEventsCheck: 0 });
	await user.click(screen.getByText(text));
};

describe('AlertCondition', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the stepper with correct step number and label', () => {
		renderAlertCondition();
		expect(screen.getByTestId(STEPPER_TEST_ID)).toHaveTextContent(
			'Step 2: Set alert conditions',
		);
	});

	it('verifies default props and initial state', () => {
		renderAlertCondition();

		// Verify default alertType is METRICS_BASED_ALERT (shows AlertThreshold component)
		expect(screen.getByTestId(ALERT_THRESHOLD_TEST_ID)).toBeInTheDocument();
		expect(
			screen.queryByTestId(ANOMALY_THRESHOLD_TEST_ID),
		).not.toBeInTheDocument();

		// Verify threshold tab is active by default
		const thresholdTab = screen.getByText(THRESHOLD_TAB_TEXT);
		expect(thresholdTab.closest(ACTIVE_TAB_CLASS)).toBeInTheDocument();

		// Verify both tabs are visible (METRICS_BASED_ALERT supports multiple tabs)
		expect(screen.getByText(THRESHOLD_TAB_TEXT)).toBeInTheDocument();
		expect(screen.getByText(ANOMALY_TAB_TEXT)).toBeInTheDocument();
	});

	it('renders threshold tab by default', () => {
		renderAlertCondition();
		expect(screen.getByText(THRESHOLD_TAB_TEXT)).toBeInTheDocument();
		expect(screen.getByTestId(THRESHOLD_VIEW_TEST_ID)).toBeInTheDocument();

		// Verify default props
		expect(screen.getByTestId(ALERT_THRESHOLD_TEST_ID)).toBeInTheDocument();
		expect(
			screen.queryByTestId(ANOMALY_THRESHOLD_TEST_ID),
		).not.toBeInTheDocument();
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

	it('warns in the tab tooltip that switching changes what gets saved', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderAlertCondition();

		await user.hover(screen.getByText(ANOMALY_TAB_TEXT));
		await expect(
			screen.findByText(/saves this as an anomaly-based alert/),
		).resolves.toBeInTheDocument();

		await user.click(screen.getByText(ANOMALY_TAB_TEXT));
		await user.hover(screen.getByText(THRESHOLD_TAB_TEXT));
		await expect(
			screen.findByText(/saves this as a metrics-based alert/),
		).resolves.toBeInTheDocument();
	});

	it('shows AnomalyThreshold component when alert type is anomaly based', async () => {
		renderAlertCondition();

		// Click on anomaly tab to switch to anomaly-based alert
		await clickText(ANOMALY_TAB_TEXT);

		expect(screen.getByTestId(ANOMALY_THRESHOLD_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(ALERT_THRESHOLD_TEST_ID)).not.toBeInTheDocument();
	});

	it('switches between threshold and anomaly tabs', async () => {
		renderAlertCondition();

		// Initially shows threshold component
		expect(screen.getByTestId(ALERT_THRESHOLD_TEST_ID)).toBeInTheDocument();

		// Click anomaly tab
		await clickText(ANOMALY_TAB_TEXT);

		// Should show anomaly component
		expect(screen.getByTestId(ANOMALY_THRESHOLD_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(ALERT_THRESHOLD_TEST_ID)).not.toBeInTheDocument();

		// Click threshold tab
		await clickText(THRESHOLD_TAB_TEXT);

		// Should show threshold component again
		expect(screen.getByTestId(ALERT_THRESHOLD_TEST_ID)).toBeInTheDocument();
		expect(
			screen.queryByTestId(ANOMALY_THRESHOLD_TEST_ID),
		).not.toBeInTheDocument();
	});

	it('adds the anomaly function with the default z-score when switching to anomaly', async () => {
		renderAlertCondition();
		expect(mockHandleSetQueryData).not.toHaveBeenCalled();

		await clickText(ANOMALY_TAB_TEXT);

		expect(mockHandleSetQueryData).toHaveBeenCalledWith(
			0,
			expect.objectContaining({
				functions: [
					{
						name: 'anomaly',
						args: [],
						namedArgs: { z_score_threshold: 3, seasonality: 'hourly' },
					},
				],
			}),
		);
	});

	it('keeps the current query when switching between threshold and anomaly', async () => {
		renderAlertCondition();

		await clickText(ANOMALY_TAB_TEXT);

		expect(mockRedirectWithQueryBuilderData).toHaveBeenCalledWith(
			mockCurrentQuery,
			{ alertType: AlertTypes.ANOMALY_BASED_ALERT, ruleType: 'anomaly_rule' },
			undefined,
			true,
		);
	});

	it('applies active tab styling correctly', async () => {
		renderAlertCondition();

		const thresholdTab = screen.getByText(THRESHOLD_TAB_TEXT);
		const anomalyTab = screen.getByText(ANOMALY_TAB_TEXT);

		// Threshold tab should be active by default
		expect(thresholdTab.closest(ACTIVE_TAB_CLASS)).toBeInTheDocument();
		expect(anomalyTab.closest(ACTIVE_TAB_CLASS)).not.toBeInTheDocument();

		// Click anomaly tab
		await clickText(ANOMALY_TAB_TEXT);

		// Anomaly tab should be active now
		expect(anomalyTab.closest(ACTIVE_TAB_CLASS)).toBeInTheDocument();
		expect(thresholdTab.closest(ACTIVE_TAB_CLASS)).not.toBeInTheDocument();
	});

	it('shows multiple tabs for METRICS_BASED_ALERT', () => {
		renderAlertCondition('METRIC_BASED_ALERT');

		expect(screen.getByText(THRESHOLD_TAB_TEXT)).toBeInTheDocument();
		expect(screen.getByText(ANOMALY_TAB_TEXT)).toBeInTheDocument();
		expect(screen.getByTestId(THRESHOLD_VIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.getByTestId(ANOMALY_VIEW_TEST_ID)).toBeInTheDocument();
	});

	it('hides the anomaly tab for METRICS_BASED_ALERT on the community edition', () => {
		renderAlertCondition('METRIC_BASED_ALERT', { activeLicense: null });

		expect(screen.getByText(THRESHOLD_TAB_TEXT)).toBeInTheDocument();
		expect(screen.queryByText(ANOMALY_TAB_TEXT)).not.toBeInTheDocument();
	});

	it('shows multiple tabs for ANOMALY_BASED_ALERT', () => {
		renderAlertCondition('ANOMALY_BASED_ALERT');

		expect(screen.getByText(THRESHOLD_TAB_TEXT)).toBeInTheDocument();
		expect(screen.getByTestId(THRESHOLD_VIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.getByText(ANOMALY_TAB_TEXT)).toBeInTheDocument();
		expect(screen.getByTestId(ANOMALY_VIEW_TEST_ID)).toBeInTheDocument();
	});

	it('shows only threshold tab for LOGS_BASED_ALERT', () => {
		renderAlertCondition('LOGS_BASED_ALERT');

		// Only threshold tab should be visible
		expect(screen.getByText(THRESHOLD_TAB_TEXT)).toBeInTheDocument();
		expect(screen.queryByText(ANOMALY_TAB_TEXT)).not.toBeInTheDocument();
		expect(screen.getByTestId(THRESHOLD_VIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(ANOMALY_VIEW_TEST_ID)).not.toBeInTheDocument();
	});

	it('shows only threshold tab for TRACES_BASED_ALERT', () => {
		renderAlertCondition('TRACES_BASED_ALERT');

		// Only threshold tab should be visible
		expect(screen.getByText(THRESHOLD_TAB_TEXT)).toBeInTheDocument();
		expect(screen.queryByText(ANOMALY_TAB_TEXT)).not.toBeInTheDocument();
		expect(screen.getByTestId(THRESHOLD_VIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(ANOMALY_VIEW_TEST_ID)).not.toBeInTheDocument();
	});

	it('shows only threshold tab for EXCEPTIONS_BASED_ALERT', () => {
		renderAlertCondition('EXCEPTIONS_BASED_ALERT');

		// Only threshold tab should be visible
		expect(screen.getByText(THRESHOLD_TAB_TEXT)).toBeInTheDocument();
		expect(screen.queryByText(ANOMALY_TAB_TEXT)).not.toBeInTheDocument();
		expect(screen.getByTestId(THRESHOLD_VIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(ANOMALY_VIEW_TEST_ID)).not.toBeInTheDocument();
	});
});
