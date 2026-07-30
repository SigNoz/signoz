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

// CodeMirror (the where-clause editor) needs real DOM measurement APIs.
beforeAll(() => {
	const rect = {
		width: 100,
		height: 20,
		top: 0,
		left: 0,
		right: 100,
		bottom: 20,
		x: 0,
		y: 0,
		toJSON: (): unknown => rect,
	} as DOMRect;
	const rects = { length: 1, item: (): DOMRect => rect, 0: rect };
	document.createRange = (): Range =>
		({
			getClientRects: (): unknown => rects,
			getBoundingClientRect: (): DOMRect => rect,
			setStart: (): void => {},
			setEnd: (): void => {},
			startContainer: document.body,
			endContainer: document.body,
			startOffset: 0,
			endOffset: 0,
			collapsed: true,
			commonAncestorContainer: document.body,
		}) as unknown as Range;
	Element.prototype.getBoundingClientRect = (): DOMRect => rect;
});

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

jest.mock('api/querySuggestions/getKeySuggestions', () => ({
	getKeySuggestions: jest
		.fn()
		.mockResolvedValue({ data: { data: { keys: {} } } }),
}));
jest.mock('api/querySuggestions/getValueSuggestion', () => ({
	getValueSuggestions: jest.fn().mockResolvedValue({
		data: { data: { values: { stringValues: [], numberValues: [] } } },
	}),
}));

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

function makePanel(
	name: string,
	extras: Record<string, unknown>,
): DashboardtypesPanelDTO {
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
							kind: 'signoz/BuilderQuery',
							spec: {
								name: 'A',
								signal: 'logs',
								disabled: false,
								filter: { expression: "service = 'x'" },
								aggregations: [{ expression: 'count()' }],
								...extras,
							},
						},
					},
				},
			],
		},
	} as unknown as DashboardtypesPanelDTO;
}

const PANELS: Record<string, DashboardtypesPanelDTO> = {
	plain: makePanel('Plain panel', {}),
	grouped: makePanel('Grouped panel', {
		groupBy: [{ name: 'host.name', fieldDataType: 'string' }],
		having: { expression: 'count() > 5' },
	}),
};

function Harness(): JSX.Element {
	const { expandedPanelId, openView, closeView } = useViewPanel();
	return (
		<>
			<button
				type="button"
				data-testid="open-plain"
				onClick={(): void => openView('plain', PANELS.plain)}
			>
				open plain
			</button>
			<button
				type="button"
				data-testid="open-grouped"
				onClick={(): void => openView('grouped', PANELS.grouped)}
			>
				open grouped
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

// QueryAddOns picks which rows are visible once on mount and never re-seeds, so unlike
// the field values these never recover from a context swap that lands after mount.
describe('View modal, builder add-on rows', () => {
	it('shows the opened panel add-ons, not the previous panel ones', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderHarness();

		await user.click(screen.getByTestId('open-grouped'));
		expect(screen.getByTestId('group-by-content')).toBeInTheDocument();
		expect(screen.getByTestId('having-content')).toBeInTheDocument();

		await user.click(screen.getByTestId('close'));
		await user.click(screen.getByTestId('open-plain'));
		expect(screen.queryByTestId('group-by-content')).not.toBeInTheDocument();
		expect(screen.queryByTestId('having-content')).not.toBeInTheDocument();
	});

	it('shows add-ons the opened panel has after a panel without them', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderHarness();

		await user.click(screen.getByTestId('open-plain'));
		await user.click(screen.getByTestId('close'));
		await user.click(screen.getByTestId('open-grouped'));

		expect(screen.getByTestId('group-by-content')).toBeInTheDocument();
		expect(screen.getByTestId('having-content')).toBeInTheDocument();
	});
});
