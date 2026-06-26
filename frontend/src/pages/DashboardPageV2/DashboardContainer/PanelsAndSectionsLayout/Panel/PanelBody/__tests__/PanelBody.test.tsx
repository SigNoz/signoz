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

	it('renders the kind renderer once a runnable query is present', () => {
		const panel = panelWith([
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

		render(<PanelBody {...baseProps} panel={panel} />);

		expect(screen.getByTestId('mock-renderer')).toBeInTheDocument();
		expect(screen.queryByTestId('panel-no-query')).not.toBeInTheDocument();
	});
});
