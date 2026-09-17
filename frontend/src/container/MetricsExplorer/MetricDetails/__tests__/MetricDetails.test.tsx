import { render, screen } from '@testing-library/react';
import * as metricsExplorerHooks from 'api/generated/services/metrics';
import ROUTES from 'constants/routes';
import * as useHandleExplorerTabChange from 'hooks/useHandleExplorerTabChange';
import { userEvent } from 'tests/test-utils';

import MetricDetails from '../MetricDetails';
import { getMockMetricMetadataData } from './testUtlls';

const mockMetricName = 'test-metric';
const mockOpenInspectModal = vi.fn();
const mockOnClose = vi.fn();

const mockHandleExplorerTabChange = vi.fn();
vi.mock('hooks/useHandleExplorerTabChange', { spy: true });
vi.mock('api/generated/services/metrics', { spy: true });
vi
	.mocked(useHandleExplorerTabChange.useHandleExplorerTabChange)
	.mockReturnValue({
		handleExplorerTabChange: mockHandleExplorerTabChange,
	});

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.METRICS_EXPLORER}`,
	}),
}));
vi.mock('react-redux', async () => ({
	...(await vi.importActual('react-redux')),
	useSelector: vi.fn().mockReturnValue({
		maxTime: 1700000000000000000,
		minTime: 1699900000000000000,
	}),
}));
vi.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: vi.fn(),
	}),
}));
vi.mock('react-query', async () => ({
	...(await vi.importActual('react-query')),
	useQueryClient: (): { invalidateQueries: () => void } => ({
		invalidateQueries: vi.fn(),
	}),
}));

vi.mock('container/MetricsExplorer/MetricDetails/AllAttributes', () => ({
	default: function MockAllAttributes(): JSX.Element {
		return <div data-testid="all-attributes">All Attributes</div>;
	},
}));
vi.mock(
	'container/MetricsExplorer/MetricDetails/DashboardsAndAlertsPopover',
	() => ({
		default: function MockDashboardsAndAlertsPopover(): JSX.Element {
			return (
				<div data-testid="dashboards-and-alerts-popover">
					Dashboards and Alerts Popover
				</div>
			);
		},
	}),
);
vi.mock('container/MetricsExplorer/MetricDetails/Highlights', () => ({
	default: function MockHighlights(): JSX.Element {
		return <div data-testid="highlights">Highlights</div>;
	},
}));

vi.mock('container/MetricsExplorer/MetricDetails/Metadata', () => ({
	default: function MockMetadata(): JSX.Element {
		return <div data-testid="metadata">Metadata</div>;
	},
}));

vi.mock(
	'container/MetricsExplorer/VolumeControl/components/VolumeControlSection/VolumeControlSection',
	() => ({
		default: function MockVolumeControlSection(): JSX.Element {
			return <div data-testid="volume-control-section-mock">Volume Control</div>;
		},
	}),
);

const useGetMetricMetadataMock = vi.mocked(
	metricsExplorerHooks.useGetMetricMetadata,
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
