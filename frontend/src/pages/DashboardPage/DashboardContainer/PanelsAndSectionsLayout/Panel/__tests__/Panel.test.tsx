import { render, screen } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';
import { usePanelQuery } from 'pages/DashboardPage/DashboardContainer/hooks/usePanelQuery';

import Panel from '../Panel';

// Real registry by default; the static cases override per render.
jest.mock('pages/DashboardPage/DashboardContainer/Panels/registry', () => {
	const actual = jest.requireActual(
		'pages/DashboardPage/DashboardContainer/Panels/registry',
	);
	return { ...actual, getPanelDefinition: jest.fn(actual.getPanelDefinition) };
});
jest.mock('pages/DashboardPage/DashboardContainer/hooks/usePanelQuery', () => ({
	usePanelQuery: jest.fn(),
}));

// Chrome + query-path collaborators stubbed: this file tests the mode fork, not them.
jest.mock('../PanelHeader/PanelHeader', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="panel-header" />,
}));
jest.mock('../PanelBody/PanelBody', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="query-panel-body" />,
}));
jest.mock('../hooks/useDrilldown', () => ({
	useDrilldown: (): unknown => ({
		onPanelClick: jest.fn(),
		enableDrillDown: false,
		contextMenuProps: {},
	}),
}));
jest.mock('../hooks/usePanelInteractions', () => ({
	usePanelInteractions: (): unknown => ({
		onDragSelect: jest.fn(),
		dashboardPreference: undefined,
	}),
}));
jest.mock('periscope/components/ContextMenu', () => ({
	__esModule: true,
	default: (): null => null,
}));

const mockUsePanelQuery = usePanelQuery as jest.Mock;
const mockGetPanelDefinition = getPanelDefinition as jest.Mock;

const panel = {
	kind: 'Panel',
	spec: {
		display: { name: 'P' },
		plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
		queries: [],
	},
} as unknown as DashboardtypesPanelDTO;

function StaticRenderer(props: { panelMode: string }): JSX.Element {
	return <div data-testid="fake-static-renderer" data-mode={props.panelMode} />;
}

const staticDefinition = {
	kind: 'signoz/TimeSeriesPanel',
	displayName: 'Static',
	sections: [],
	actions: { search: false },
	mode: 'static',
	Renderer: StaticRenderer,
	EditorPane: StaticRenderer,
};

describe('Panel — authoring-mode fork', () => {
	beforeEach(() => {
		mockUsePanelQuery.mockReset();
		mockUsePanelQuery.mockReturnValue({
			data: { response: undefined, requestPayload: undefined, legendMap: {} },
			isFetching: false,
			isPreviousData: false,
			error: null,
			refetch: jest.fn(),
			pagination: undefined,
		});
	});

	it('mounts the query body and fetch for a query kind', () => {
		render(<Panel panel={panel} panelId="p1" />);

		expect(screen.getByTestId('query-panel-body')).toBeInTheDocument();
		expect(mockUsePanelQuery).toHaveBeenCalledTimes(1);
	});

	it('mounts the static renderer for a static kind with no query hook at all', () => {
		mockGetPanelDefinition.mockReturnValueOnce(staticDefinition);

		render(<Panel panel={panel} panelId="p1" />);

		expect(screen.getByTestId('static-panel-body')).toBeInTheDocument();
		expect(screen.getByTestId('fake-static-renderer')).toBeInTheDocument();
		expect(screen.queryByTestId('query-panel-body')).not.toBeInTheDocument();
		expect(mockUsePanelQuery).not.toHaveBeenCalled();
	});

	it('renders the static body in dashboard-view mode with panel chrome', () => {
		mockGetPanelDefinition.mockReturnValueOnce(staticDefinition);

		render(<Panel panel={panel} panelId="p1" />);

		expect(screen.getByTestId('fake-static-renderer')).toHaveAttribute(
			'data-mode',
			'DASHBOARD_VIEW',
		);
		expect(screen.getByTestId('panel-header')).toBeInTheDocument();
	});
});
