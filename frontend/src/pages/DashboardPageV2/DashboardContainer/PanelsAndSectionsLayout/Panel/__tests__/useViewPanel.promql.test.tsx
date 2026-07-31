import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider as ReduxProvider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import configureStore from 'redux-mock-store';
import appStore from 'store';

import ViewPanelModal from '../ViewPanelModal/ViewPanelModal';
import { useViewPanel } from '../hooks/useViewPanel';

// jest.config maps the real hook to a no-op mock; this suite needs real navigation.
jest.mock('hooks/useSafeNavigate', () => {
	const { useHistory } = jest.requireActual('react-router-dom');
	return {
		useSafeNavigate: (): unknown => {
			const history = useHistory();
			return {
				safeNavigate: (to: string, opts?: { replace?: boolean }): void => {
					if (opts?.replace) {
						history.replace(to);
					} else {
						history.push(to);
					}
				},
			};
		},
	};
});

jest.mock(
	'pages/DashboardPageV2/DashboardContainer/hooks/usePanelQuery',
	() => ({
		usePanelQuery: (): unknown => ({
			data: undefined,
			isFetching: false,
			isPreviousData: false,
			error: null,
			refetch: jest.fn(),
			cancelQuery: jest.fn(),
			pagination: undefined,
		}),
	}),
);

jest.mock(
	'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore',
	() => ({
		useDashboardStore: (selector: (s: unknown) => unknown): unknown =>
			selector({ dashboardId: 'dash-1' }),
	}),
);

jest.mock(
	'pages/DashboardPageV2/DashboardContainer/PanelEditor/PreviewPane/PreviewPane',
	() =>
		function MockPreviewPane(): ReactElement {
			return <div data-testid="preview-pane" />;
		},
);

jest.mock('../hooks/useDrilldown', () => ({
	useDrilldown: (): unknown => ({
		enableDrillDown: false,
		onPanelClick: jest.fn(),
		contextMenuProps: {
			coordinates: null,
			popoverPosition: null,
			items: null,
			onClose: jest.fn(),
		},
	}),
}));

jest.mock('../hooks/usePanelInteractions', () => ({
	usePanelInteractions: (): unknown => ({
		onDragSelect: jest.fn(),
		dashboardPreference: { syncMode: 0 },
	}),
}));

jest.mock(
	'../ViewPanelModal/ViewPanelModalHeader',
	() =>
		function MockViewPanelModalHeader(): ReactElement {
			return <div data-testid="view-panel-header" />;
		},
);

function makePromPanel(name: string, promql: string): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			display: { name },
			plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
			queries: [
				{
					kind: 'time_series',
					spec: {
						plugin: {
							kind: 'signoz/PromQLQuery',
							spec: { name: 'A', query: promql, legend: '', disabled: false },
						},
					},
				},
			],
		},
	} as unknown as DashboardtypesPanelDTO;
}

const PANELS: Record<string, DashboardtypesPanelDTO> = {
	A: makePromPanel('Panel A', 'up{job="alpha"}'),
	B: makePromPanel('Panel B', 'up{job="bravo"}'),
};

function Harness(): JSX.Element {
	const { expandedPanelId, openView, closeView } = useViewPanel();
	return (
		<>
			<button
				type="button"
				data-testid="open-a"
				onClick={(): void => openView('A', PANELS.A)}
			>
				open A
			</button>
			<button
				type="button"
				data-testid="open-b"
				onClick={(): void => openView('B', PANELS.B)}
			>
				open B
			</button>
			<button type="button" data-testid="close" onClick={closeView}>
				close
			</button>
			<ViewPanelModal
				open={!!expandedPanelId}
				panel={expandedPanelId ? PANELS[expandedPanelId] : undefined}
				panelId={expandedPanelId ?? undefined}
				onClose={closeView}
			/>
		</>
	);
}

const renderHarness = (): void => {
	render(
		<MemoryRouter initialEntries={['/dashboard/dash-1']}>
			<CompatRouter>
				<QueryClientProvider client={new QueryClient()}>
					<ReduxProvider store={configureStore([])(appStore.getState())}>
						<TooltipProvider>
							<QueryBuilderProvider>
								<Harness />
							</QueryBuilderProvider>
						</TooltipProvider>
					</ReduxProvider>
				</QueryClientProvider>
			</CompatRouter>
		</MemoryRouter>,
	);
};

describe('View modal, PromQL panels', () => {
	it('shows the opened panel query, not the previously viewed one', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0, delay: null });
		renderHarness();

		await user.click(screen.getByTestId('open-a'));
		expect(screen.getByTestId('promql-query-input')).toHaveValue(
			'up{job="alpha"}',
		);

		await user.click(screen.getByTestId('close'));
		await user.click(screen.getByTestId('open-b'));
		expect(screen.getByTestId('promql-query-input')).toHaveValue(
			'up{job="bravo"}',
		);
	});
});
