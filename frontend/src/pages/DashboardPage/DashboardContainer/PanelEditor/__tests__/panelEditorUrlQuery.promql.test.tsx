import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider as ReduxProvider } from 'react-redux';
import { matchRoute } from 'lib/router/matchRoute';
import { useAppLocation } from 'lib/router/useAppLocation';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import {
	type DashboardtypesPanelDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import configureStore from 'redux-mock-store';
import appStore from 'store';
import { TestRouter } from 'tests/router';

import { useOpenPanelEditor } from '../../hooks/useOpenPanelEditor';
import { usePanelEditorQuerySync } from '../hooks/usePanelEditorQuerySync';
import { requireQueryPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/capabilities';

import PanelEditorQueryBuilder from '../PanelEditorQueryBuilder/PanelEditorQueryBuilder';
import { useQueryModeChange } from '../hooks/useQueryModeChange';
import type { BuildersByVariant } from 'types/api/queryBuilder/queryBuilderData';

// jest.config maps the real hook to a no-op mock; this suite needs real navigation.
jest.mock('hooks/useSafeNavigate', () => {
	const { navigate } = jest.requireActual('lib/router/navigation');
	return {
		useSafeNavigate: (): unknown => ({
			safeNavigate: (to: string): void => navigate(to),
		}),
	};
});

jest.mock('../../store/useDashboardStore', () => ({
	useDashboardStore: (selector: (s: unknown) => unknown): unknown =>
		selector({ dashboardId: 'dash-1' }),
}));

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

const noop = (): void => {};

/** Stands in for the editor route: the same draft + builder sync `PanelEditorContainer` runs. */
function EditorRoute({ panelId }: { panelId: string }): JSX.Element {
	const [panel] = useState(PANELS[panelId]);

	usePanelEditorQuerySync({
		draft: panel,
		panelType: PANEL_TYPES.TIME_SERIES,
		setSpec: noop,
		refetch: noop,
		signal: TelemetrytypesSignalDTO.metrics,
		savedQueries: panel.spec.queries,
	});
	const panelDefinition = requireQueryPanelDefinition('signoz/TimeSeriesPanel');
	const parkedBuilders = useRef<BuildersByVariant>({});
	const onChangeQueryMode = useQueryModeChange({
		panelType: PANEL_TYPES.TIME_SERIES,
		supportedQueryModesKindMap: panelDefinition.supportedQueryModesKindMap,
		parkedBuilders,
	});

	return (
		<PanelEditorQueryBuilder
			panelDefinition={panelDefinition}
			onChangeQueryMode={onChangeQueryMode}
			isLoadingQueries={false}
			onStageRunQuery={noop}
			onCancelQuery={noop}
		/>
	);
}

/** Mounts the editor only while the URL is on the editor route, as `<Route>` did. */
function EditorRouteOutlet(): JSX.Element | null {
	const { pathname } = useAppLocation();
	const panelId = matchRoute<'panelId'>(
		pathname,
		'/dashboard/:dashboardId/panel/:panelId',
	)?.params.panelId;

	return panelId ? <EditorRoute panelId={panelId} /> : null;
}

function Harness(): JSX.Element {
	const openPanelEditor = useOpenPanelEditor();
	const { safeNavigate } = useSafeNavigate();

	return (
		<>
			<button
				type="button"
				data-testid="edit-a"
				onClick={(): void => openPanelEditor('A', { panel: PANELS.A })}
			>
				edit A
			</button>
			<button
				type="button"
				data-testid="edit-b"
				onClick={(): void => openPanelEditor('B', { panel: PANELS.B })}
			>
				edit B
			</button>
			<button
				type="button"
				data-testid="back"
				onClick={(): void => safeNavigate('/dashboard/dash-1')}
			>
				back
			</button>
			<EditorRouteOutlet />
		</>
	);
}

const renderHarness = (): void => {
	render(
		<TestRouter initialRoute="/dashboard/dash-1">
			<QueryClientProvider client={new QueryClient()}>
				<ReduxProvider store={configureStore([])(appStore.getState())}>
					<QueryBuilderProvider>
						<Harness />
					</QueryBuilderProvider>
				</ReduxProvider>
			</QueryClientProvider>
		</TestRouter>,
	);
};

describe('Panel editor route, PromQL panels', () => {
	it('opens on the edited panel query, not the previously edited one', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderHarness();

		await user.click(screen.getByTestId('edit-a'));
		expect(screen.getByTestId('promql-query-input')).toHaveValue(
			'up{job="alpha"}',
		);

		await user.click(screen.getByTestId('back'));
		await user.click(screen.getByTestId('edit-b'));
		expect(screen.getByTestId('promql-query-input')).toHaveValue(
			'up{job="bravo"}',
		);
	});
});
