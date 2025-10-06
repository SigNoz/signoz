/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryParams } from 'constants/query';
import { AlertDetectionTypes } from 'container/FormAlertRules';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { CreateAlertProvider } from '../../context';
import QuerySection from '../QuerySection';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});
jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: (): any => ({
		globalTime: {
			selectedTime: {
				startTime: 1713734400000,
				endTime: 1713738000000,
			},
			maxTime: 1713738000000,
			minTime: 1713734400000,
		},
	}),
}));
jest.mock(
	'container/FormAlertRules/QuerySection',
	() =>
		function MockQuerySectionComponent({
			queryCategory,
			alertType,
			panelType,
		}: any): JSX.Element {
			return (
				<div data-testid="query-section-component">
					<div data-testid="query-category">{queryCategory}</div>
					<div data-testid="alert-type">{alertType}</div>
					<div data-testid="panel-type">{panelType}</div>
				</div>
			);
		},
);
jest.mock(
	'../ChartPreview',
	() =>
		function MockChartPreview(): JSX.Element {
			return <div data-testid="chart-preview">Chart Preview</div>;
		},
);
jest.mock(
	'../../Stepper',
	() =>
		function MockStepper({ stepNumber, label }: any): JSX.Element {
			return (
				<div data-testid="stepper">
					<div data-testid="step-number">{stepNumber}</div>
					<div data-testid="step-label">{label}</div>
				</div>
			);
		},
);

const mockUseQueryBuilder = {
	currentQuery: {
		queryType: 'query_builder',
		unit: 'requests/sec',
		builder: {
			queryData: [
				{
					dataSource: 'metrics',
				},
			],
		},
	},
	handleRunQuery: jest.fn(),
	redirectWithQueryBuilderData: jest.fn(),
};
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});
const renderQuerySection = (): ReturnType<typeof render> =>
	render(
		<Provider store={store}>
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<CreateAlertProvider initialAlertType={AlertTypes.METRICS_BASED_ALERT}>
						<QuerySection />
					</CreateAlertProvider>
				</MemoryRouter>
			</QueryClientProvider>
		</Provider>,
	);

const METRICS_TEXT = 'Metrics';
const QUERY_BUILDER_TEXT = 'query_builder';
const LOGS_TEXT = 'Logs';
const TRACES_TEXT = 'Traces';
const ACTIVE_TAB_CLASS = 'active-tab';

describe('QuerySection', () => {
	const { useQueryBuilder } = jest.requireMock(
		'hooks/queryBuilder/useQueryBuilder',
	);

	beforeEach(() => {
		jest.clearAllMocks();
		useQueryBuilder.mockReturnValue(mockUseQueryBuilder);
	});

	it('renders the component with all required elements', () => {
		renderQuerySection();

		// Check if Stepper is rendered
		expect(screen.getByTestId('stepper')).toBeInTheDocument();
		expect(screen.getByTestId('step-number')).toHaveTextContent('1');
		expect(screen.getByTestId('step-label')).toHaveTextContent(
			'Define the query',
		);

		// Check if ChartPreview is rendered
		expect(screen.getByTestId('chart-preview')).toBeInTheDocument();

		// Check if QuerySectionComponent is rendered
		expect(screen.getByTestId('query-section-component')).toBeInTheDocument();
		expect(screen.getByTestId('query-category')).toHaveTextContent(
			QUERY_BUILDER_TEXT,
		);
		expect(screen.getByTestId('alert-type')).toHaveTextContent(
			AlertTypes.METRICS_BASED_ALERT,
		);
		expect(screen.getByTestId('panel-type')).toHaveTextContent('graph');
	});

	it('renders all three alert type tabs', () => {
		renderQuerySection();

		// Check if all tabs are rendered
		expect(screen.getByText(METRICS_TEXT)).toBeInTheDocument();
		expect(screen.getByText('Logs')).toBeInTheDocument();
		expect(screen.getByText('Traces')).toBeInTheDocument();

		// Check if icons are rendered
		expect(screen.getByTestId('metrics-view')).toBeInTheDocument();
		expect(screen.getByTestId('logs-view')).toBeInTheDocument();
		expect(screen.getByTestId('traces-view')).toBeInTheDocument();
	});

	it('shows Metrics tab as active by default', () => {
		renderQuerySection();

		const metricsTab = screen.getByText(METRICS_TEXT).closest('button');
		expect(metricsTab).toHaveClass(ACTIVE_TAB_CLASS);
	});

	it('handles alert type change when clicking on different tabs', async () => {
		const user = userEvent.setup();
		renderQuerySection();

		// Click on Logs tab
		const logsTab = screen.getByText(LOGS_TEXT);
		await user.click(logsTab);

		// Verify that redirectWithQueryBuilderData was called with correct data
		expect(mockUseQueryBuilder.redirectWithQueryBuilderData).toHaveBeenCalledWith(
			expect.any(Object),
			{
				[QueryParams.alertType]: AlertTypes.LOGS_BASED_ALERT,
				[QueryParams.ruleType]: AlertDetectionTypes.THRESHOLD_ALERT,
			},
			undefined,
			true,
		);

		// Click on Traces tab
		const tracesTab = screen.getByText(TRACES_TEXT);
		await user.click(tracesTab);

		// Verify that redirectWithQueryBuilderData was called with correct data
		expect(mockUseQueryBuilder.redirectWithQueryBuilderData).toHaveBeenCalledWith(
			expect.any(Object),
			{
				[QueryParams.alertType]: AlertTypes.TRACES_BASED_ALERT,
				[QueryParams.ruleType]: AlertDetectionTypes.THRESHOLD_ALERT,
			},
			undefined,
			true,
		);
	});

	it('updates active tab when alert type changes', async () => {
		const user = userEvent.setup();
		renderQuerySection();

		// Initially Metrics should be active
		const metricsTab = screen.getByText(METRICS_TEXT).closest('button');
		expect(metricsTab).toHaveClass(ACTIVE_TAB_CLASS);

		// Click on Logs tab
		const logsTab = screen.getByText(LOGS_TEXT);
		await user.click(logsTab);

		// Logs should now be active
		const logsButton = logsTab.closest('button');
		expect(logsButton).toHaveClass(ACTIVE_TAB_CLASS);
		expect(metricsTab).not.toHaveClass(ACTIVE_TAB_CLASS);
	});

	it('passes correct props to QuerySectionComponent', () => {
		renderQuerySection();

		// Check if the component receives the correct props
		expect(screen.getByTestId('query-category')).toHaveTextContent(
			QUERY_BUILDER_TEXT,
		);
		expect(screen.getByTestId('alert-type')).toHaveTextContent(
			AlertTypes.METRICS_BASED_ALERT,
		);
		expect(screen.getByTestId('panel-type')).toHaveTextContent('graph');
	});

	it('has correct CSS classes for tab styling', () => {
		renderQuerySection();

		const tabs = screen.getAllByRole('button');

		tabs.forEach((tab) => {
			expect(tab).toHaveClass('list-view-tab');
			expect(tab).toHaveClass('explorer-view-option');
		});
	});

	it('renders with correct container structure', () => {
		renderQuerySection();

		const container = screen.getByText(METRICS_TEXT).closest('.query-section');
		expect(container).toBeInTheDocument();

		const tabsContainer = screen
			.getByText(METRICS_TEXT)
			.closest('.query-section-tabs');
		expect(tabsContainer).toBeInTheDocument();

		const actionsContainer = screen
			.getByText(METRICS_TEXT)
			.closest('.query-section-query-actions');
		expect(actionsContainer).toBeInTheDocument();
	});

	it('handles multiple rapid tab clicks correctly', async () => {
		const user = userEvent.setup();
		renderQuerySection();

		const logsTab = screen.getByText('Logs');
		const tracesTab = screen.getByText('Traces');

		// Rapidly click on different tabs
		await user.click(logsTab);
		await user.click(tracesTab);
		await user.click(logsTab);

		// Should have called redirectWithQueryBuilderData 3 times
		expect(
			mockUseQueryBuilder.redirectWithQueryBuilderData,
		).toHaveBeenCalledTimes(3);
	});

	it('maintains tab state correctly after interactions', async () => {
		const user = userEvent.setup();
		renderQuerySection();

		// Click on Logs tab
		const logsTab = screen.getByText('Logs');
		await user.click(logsTab);

		// Verify Logs is active
		const logsButton = logsTab.closest('button');
		expect(logsButton).toHaveClass(ACTIVE_TAB_CLASS);

		// Click back to Metrics
		const metricsTab = screen.getByText(METRICS_TEXT);
		await user.click(metricsTab);

		// Verify Metrics is active again
		const metricsButton = metricsTab.closest('button');
		expect(metricsButton).toHaveClass(ACTIVE_TAB_CLASS);
		expect(logsButton).not.toHaveClass(ACTIVE_TAB_CLASS);
	});
});
