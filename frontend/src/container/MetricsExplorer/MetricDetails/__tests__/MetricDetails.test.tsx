import { render, screen } from '@testing-library/react';
import * as metricsExplorerHooks from 'api/generated/services/metrics';
import ROUTES from 'constants/routes';
import * as useHandleExplorerTabChange from 'hooks/useHandleExplorerTabChange';
import { userEvent } from 'tests/test-utils';

import MetricDetails from '../MetricDetails';
import { getMockMetricMetadataData } from './testUtlls';

const mockMetricName = 'test-metric';
const mockOpenInspectModal = jest.fn();
const mockOnClose = jest.fn();

const mockHandleExplorerTabChange = jest.fn();
jest
	.spyOn(useHandleExplorerTabChange, 'useHandleExplorerTabChange')
	.mockReturnValue({
		handleExplorerTabChange: mockHandleExplorerTabChange,
	});

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.METRICS_EXPLORER}`,
	}),
}));
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));
jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueryClient: (): { invalidateQueries: () => void } => ({
		invalidateQueries: jest.fn(),
	}),
}));

jest.mock(
	'container/MetricsExplorer/MetricDetails/AllAttributes',
	() =>
		function MockAllAttributes(): JSX.Element {
			return <div data-testid="all-attributes">All Attributes</div>;
		},
);
jest.mock(
	'container/MetricsExplorer/MetricDetails/DashboardsAndAlertsPopover',
	() =>
		function MockDashboardsAndAlertsPopover(): JSX.Element {
			return (
				<div data-testid="dashboards-and-alerts-popover">
					Dashboards and Alerts Popover
				</div>
			);
		},
);
jest.mock(
	'container/MetricsExplorer/MetricDetails/Highlights',
	() =>
		function MockHighlights(): JSX.Element {
			return <div data-testid="highlights">Highlights</div>;
		},
);

jest.mock(
	'container/MetricsExplorer/MetricDetails/Metadata',
	() =>
		function MockMetadata(): JSX.Element {
			return <div data-testid="metadata">Metadata</div>;
		},
);

const useGetMetricMetadataMock = jest.spyOn(
	metricsExplorerHooks,
	'useGetMetricMetadata',
);

describe('MetricDetails', () => {
	beforeEach(() => {
		useGetMetricMetadataMock.mockReturnValue(getMockMetricMetadataData());
	});

	it('renders metric details correctly', () => {
		render(
			<MetricDetails
				onClose={mockOnClose}
				isOpen
				isModalTimeSelection
				metricName={mockMetricName}
				openInspectModal={mockOpenInspectModal}
			/>,
		);

		expect(screen.getByText(mockMetricName)).toBeInTheDocument();
		expect(screen.getByTestId('all-attributes')).toBeInTheDocument();
		expect(
			screen.getByTestId('dashboards-and-alerts-popover'),
		).toBeInTheDocument();
		expect(screen.getByTestId('highlights')).toBeInTheDocument();
		expect(screen.getByTestId('metadata')).toBeInTheDocument();
	});

	it('renders the "open in explorer" and "inspect" buttons', async () => {
		render(
			<MetricDetails
				onClose={mockOnClose}
				isOpen
				metricName={mockMetricName}
				isModalTimeSelection
				openInspectModal={mockOpenInspectModal}
			/>,
		);

		expect(screen.getByTestId('open-in-explorer-button')).toBeInTheDocument();
		expect(screen.getByTestId('inspect-metric-button')).toBeInTheDocument();

		await userEvent.click(screen.getByTestId('open-in-explorer-button'));
		expect(mockHandleExplorerTabChange).toHaveBeenCalled();

		await userEvent.click(screen.getByTestId('inspect-metric-button'));
		expect(mockOpenInspectModal).toHaveBeenCalled();
	});
});
