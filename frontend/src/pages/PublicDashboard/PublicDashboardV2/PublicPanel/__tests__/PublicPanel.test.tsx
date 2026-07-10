import { render, screen } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';

import { usePublicPanelQuery } from '../../hooks/usePublicPanelQuery';
import PublicPanel from '../PublicPanel';

jest.mock('../../hooks/usePublicPanelQuery', () => ({
	usePublicPanelQuery: jest.fn(),
}));

// Stub the reused V2 renderers so the test targets PublicPanel's own wiring, not uPlot/timezone.
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader',
	() => ({
		__esModule: true,
		default: ({ hideActions }: { hideActions?: boolean }): JSX.Element => (
			<div data-testid="panel-header" data-hide-actions={String(!!hideActions)} />
		),
	}),
);
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelBody/PanelBody',
	() => ({
		__esModule: true,
		default: ({
			enableDrillDown,
			panelId,
		}: {
			enableDrillDown?: boolean;
			panelId: string;
		}): JSX.Element => (
			<div
				data-testid="panel-body"
				data-drilldown={String(!!enableDrillDown)}
				data-panel-id={panelId}
			/>
		),
	}),
);

const mockQuery = usePublicPanelQuery as jest.Mock;

const queryResult = {
	data: { response: undefined, requestPayload: undefined, legendMap: {} },
	isLoading: false,
	isFetching: false,
	isPreviousData: false,
	error: null,
	refetch: jest.fn(),
	cancelQuery: jest.fn(),
	pagination: undefined,
};

const timeseriesPanel = {
	kind: 'Panel',
	spec: {
		display: { name: 'panel-1' },
		plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
		queries: [],
	},
} as unknown as DashboardtypesPanelDTO;

const commonProps = {
	panelKey: 'p1',
	publicDashboardId: 'pub-1',
	startMs: 1000,
	endMs: 2000,
};

describe('PublicPanel', () => {
	beforeEach(() => {
		mockQuery.mockReset();
		mockQuery.mockReturnValue(queryResult);
	});

	it('renders the reused header/body read-only (hideActions, no drill-down)', () => {
		render(<PublicPanel panel={timeseriesPanel} {...commonProps} />);

		expect(screen.getByTestId('panel-header')).toHaveAttribute(
			'data-hide-actions',
			'true',
		);
		const body = screen.getByTestId('panel-body');
		expect(body).toHaveAttribute('data-drilldown', 'false');
		expect(body).toHaveAttribute('data-panel-id', 'p1');
	});

	it('fetches by panel key and time', () => {
		render(<PublicPanel panel={timeseriesPanel} {...commonProps} />);
		expect(mockQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				panelKey: 'p1',
				publicDashboardId: 'pub-1',
				startMs: 1000,
				endMs: 2000,
			}),
		);
	});

	it('gates the fetch when off screen', () => {
		render(
			<PublicPanel panel={timeseriesPanel} {...commonProps} isVisible={false} />,
		);
		expect(mockQuery).toHaveBeenCalledWith(
			expect.objectContaining({ enabled: false }),
		);
	});
});
