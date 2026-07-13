import { render, screen } from '@testing-library/react';
import type { DashboardtypesGettablePublicDashboardDataV2DTO } from 'api/generated/services/sigNoz.schemas';

import PublicDashboardV2 from '../PublicDashboardV2';

const mockGrid = jest.fn();

jest.mock('../PublicSectionGrid/PublicSectionGrid', () => ({
	__esModule: true,
	default: (props: unknown): JSX.Element => {
		mockGrid(props);
		return <div data-testid="public-section-grid" />;
	},
}));
jest.mock('container/TopNav/DateTimeSelectionV2', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="datetime-selection" />,
}));
jest.mock('../PublicAutoRefresh/PublicAutoRefresh', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="auto-refresh" />,
}));

function buildData(
	timeRangeEnabled: boolean,
): DashboardtypesGettablePublicDashboardDataV2DTO {
	return {
		dashboard: {
			schemaVersion: 'v6',
			spec: {
				display: { name: 'My V2 Dashboard' },
				layouts: [
					{
						kind: 'Grid',
						spec: {
							display: { title: 'Section A' },
							items: [
								{
									x: 0,
									y: 0,
									width: 6,
									height: 6,
									content: { $ref: '#/spec/panels/p1' },
								},
							],
						},
					},
				],
				panels: {
					p1: {
						kind: 'Panel',
						spec: {
							display: { name: 'p1' },
							plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
							queries: [],
						},
					},
				},
				variables: [],
			},
		},
		publicDashboard: { timeRangeEnabled, defaultTimeRange: '30m' },
	} as unknown as DashboardtypesGettablePublicDashboardDataV2DTO;
}

describe('PublicDashboardV2', () => {
	beforeEach(() => mockGrid.mockReset());

	it('renders the dashboard title, section title, and a grid per section', () => {
		render(
			<PublicDashboardV2 publicDashboardId="pub-1" data={buildData(true)} />,
		);

		expect(screen.getByText('My V2 Dashboard')).toBeInTheDocument();
		expect(screen.getByText('Section A')).toBeInTheDocument();
		expect(screen.getByTestId('public-section-grid')).toBeInTheDocument();

		const gridProps = mockGrid.mock.calls[0][0];
		expect(gridProps.publicDashboardId).toBe('pub-1');
		expect(gridProps.items).toHaveLength(1);
		expect(gridProps.items[0].id).toBe('p1');
		expect(typeof gridProps.startMs).toBe('number');
		expect(typeof gridProps.endMs).toBe('number');
		// Times are handed to the endpoint in milliseconds.
		expect(gridProps.endMs).toBeGreaterThan(gridProps.startMs);
	});

	it('shows the time controls only when the publisher enabled the time range', () => {
		const { rerender } = render(
			<PublicDashboardV2 publicDashboardId="pub-1" data={buildData(true)} />,
		);
		expect(screen.getByTestId('datetime-selection')).toBeInTheDocument();
		expect(screen.getByTestId('auto-refresh')).toBeInTheDocument();

		rerender(
			<PublicDashboardV2 publicDashboardId="pub-1" data={buildData(false)} />,
		);
		expect(screen.queryByTestId('datetime-selection')).not.toBeInTheDocument();
		expect(screen.queryByTestId('auto-refresh')).not.toBeInTheDocument();
	});
});
