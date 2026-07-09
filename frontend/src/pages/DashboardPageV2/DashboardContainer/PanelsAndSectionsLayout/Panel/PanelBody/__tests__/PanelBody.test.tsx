import { render, screen } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { RenderablePanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import PanelBody from '../PanelBody';

// Stub the renderer so these tests focus on PanelBody's state machine.
const MockRenderer = (): JSX.Element => <div data-testid="mock-renderer" />;

const panelDefinition = {
	Renderer: MockRenderer,
} as unknown as RenderablePanelDefinition;

function panelWith(queries: unknown[]): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			display: { name: 'P' },
			plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
			queries,
		},
	} as unknown as DashboardtypesPanelDTO;
}

const baseProps = {
	panelDefinition,
	panelId: 'p1',
	data: {} as PanelQueryData,
	isFetching: false,
	error: null,
	refetch: jest.fn(),
	onDragSelect: jest.fn(),
};

describe('PanelBody', () => {
	it('shows the not-configured state when the panel has no runnable query', () => {
		render(<PanelBody {...baseProps} panel={panelWith([])} />);

		expect(screen.getByTestId('panel-no-query')).toBeInTheDocument();
		expect(screen.getByText('Nothing to visualize yet')).toBeInTheDocument();
		expect(screen.queryByTestId('mock-renderer')).not.toBeInTheDocument();
	});

	const runnablePanel = (): DashboardtypesPanelDTO =>
		panelWith([
			{
				spec: {
					plugin: {
						kind: 'signoz/CompositeQuery',
						spec: {
							queries: [
								{ type: 'builder_query', spec: { signal: 'traces', name: 'A' } },
							],
						},
					},
				},
			},
		]);

	it('renders the kind renderer once a runnable query is present', () => {
		render(<PanelBody {...baseProps} panel={runnablePanel()} />);

		expect(screen.getByTestId('mock-renderer')).toBeInTheDocument();
		expect(screen.queryByTestId('panel-no-query')).not.toBeInTheDocument();
	});

	it('shows the full-panel loader only on the first fetch (no data yet)', () => {
		render(
			<PanelBody
				{...baseProps}
				panel={runnablePanel()}
				data={{} as PanelQueryData}
				isFetching
			/>,
		);

		expect(screen.getByTestId('panel-loading')).toBeInTheDocument();
		expect(screen.queryByTestId('mock-renderer')).not.toBeInTheDocument();
	});

	it('keeps the renderer mounted during a refetch over existing data (e.g. list page change)', () => {
		render(
			<PanelBody
				{...baseProps}
				panel={runnablePanel()}
				data={
					{
						response: { data: { type: 'raw' } },
						requestPayload: { requestType: 'raw' },
					} as unknown as PanelQueryData
				}
				isFetching
			/>,
		);

		expect(screen.getByTestId('mock-renderer')).toBeInTheDocument();
		expect(screen.queryByTestId('panel-loading')).not.toBeInTheDocument();
	});

	it('shows the loader (not a NoData flash) while a stale cross-type response is replaced on a kind switch', () => {
		render(
			<PanelBody
				{...baseProps}
				panel={runnablePanel()}
				data={
					{
						response: { data: { type: 'time_series' } },
						requestPayload: { requestType: 'raw' },
					} as unknown as PanelQueryData
				}
				isFetching
			/>,
		);

		expect(screen.getByTestId('panel-loading')).toBeInTheDocument();
		expect(screen.queryByTestId('mock-renderer')).not.toBeInTheDocument();
	});
});
