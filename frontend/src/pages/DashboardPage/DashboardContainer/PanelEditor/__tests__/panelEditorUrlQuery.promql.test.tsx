import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider as ReduxProvider } from 'react-redux';
import { MemoryRouter, Route, useHistory, useParams } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import {
	type DashboardtypesPanelDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import configureStore from 'redux-mock-store';
import appStore from 'store';

import { useOpenPanelEditor } from '../../hooks/useOpenPanelEditor';
import { usePanelEditorQuerySync } from '../hooks/usePanelEditorQuerySync';
import PanelEditorQueryBuilder from '../PanelEditorQueryBuilder/PanelEditorQueryBuilder';

// jest.config maps the real hook to a no-op mock; this suite needs real navigation.
jest.mock('hooks/useSafeNavigate', () => {
	const { useHistory: useRouterHistory } =
		jest.requireActual('react-router-dom');
	return {
		useSafeNavigate: (): unknown => {
			const history = useRouterHistory();
			return {
				safeNavigate: (to: string): void => history.push(to),
			};
		},
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
function EditorRoute(): JSX.Element {
	const { panelId } = useParams<{ panelId: string }>();
	const [panel] = useState(PANELS[panelId]);

	usePanelEditorQuerySync({
		draft: panel,
		panelType: PANEL_TYPES.TIME_SERIES,
		setSpec: noop,
		refetch: noop,
		signal: TelemetrytypesSignalDTO.metrics,
		savedQueries: panel.spec.queries,
	});

	return (
		<PanelEditorQueryBuilder
			panelKind="signoz/TimeSeriesPanel"
			signal={TelemetrytypesSignalDTO.metrics}
			isLoadingQueries={false}
			onStageRunQuery={noop}
			onCancelQuery={noop}
		/>
	);
}

function Harness(): JSX.Element {
	const openPanelEditor = useOpenPanelEditor();
	const history = useHistory();

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
				onClick={(): void => history.push('/dashboard/dash-1')}
			>
				back
			</button>
			<Route
				path="/dashboard/:dashboardId/panel/:panelId"
				component={EditorRoute}
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
