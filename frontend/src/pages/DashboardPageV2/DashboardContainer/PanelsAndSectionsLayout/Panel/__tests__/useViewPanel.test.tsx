import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { fromPerses } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useViewPanelMode } from '../ViewPanelModal/useViewPanelMode';
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

function makePanel(name: string, expression: string): DashboardtypesPanelDTO {
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
								filter: { expression },
								aggregations: [{ expression: 'count()' }],
							},
						},
					},
				},
			],
		},
	} as unknown as DashboardtypesPanelDTO;
}

const PANELS: Record<string, DashboardtypesPanelDTO> = {
	A: makePanel('Panel A', "service = 'alpha'"),
	B: makePanel('Panel B', "service = 'bravo'"),
};

const panelOf = (json: string): string => {
	if (json.includes('alpha')) {
		return 'A';
	}
	if (json.includes('bravo')) {
		return 'B';
	}
	return 'none';
};

/** Every render of the open modal, so a single stale frame can't hide. */
const renders: { current: string; draft: string; filterItems: number }[] = [];

const stagedIds: (string | undefined)[] = [];

function ModalBody({ panelId }: { panelId: string }): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const { draft } = useViewPanelMode({
		panel: PANELS[panelId],
		panelId,
		time: { startMs: 0, endMs: 1000 },
	});
	renders.push({
		current: panelOf(JSON.stringify(currentQuery)),
		draft: panelOf(JSON.stringify(draft.spec.queries)),
		filterItems: currentQuery.builder.queryData[0]?.filters?.items.length ?? 0,
	});
	return <div data-testid="modal-body" />;
}

function StagedQueryProbe(): null {
	const { stagedQuery } = useQueryBuilder();
	if (stagedIds.at(-1) !== stagedQuery?.id) {
		stagedIds.push(stagedQuery?.id);
	}
	return null;
}

const drilldownQuery = (base: Query): Query => ({
	...base,
	builder: {
		...base.builder,
		queryData: base.builder.queryData.map((q) => ({
			...q,
			filter: { expression: "service = 'bravo' AND host = 'h1'" },
		})),
	},
});

function Harness(): JSX.Element {
	const { expandedPanelId, openView, openViewWithQuery, closeView } =
		useViewPanel();
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
			<button
				type="button"
				data-testid="drilldown-b"
				onClick={(): void =>
					openViewWithQuery(
						'B',
						drilldownQuery(
							fromPerses(PANELS.B.spec.queries, PANEL_TYPES.TIME_SERIES),
						),
						PANEL_TYPES.TIME_SERIES,
					)
				}
			>
				drilldown B
			</button>
			<button type="button" data-testid="close" onClick={closeView}>
				close
			</button>
			<StagedQueryProbe />
			{expandedPanelId && <ModalBody panelId={expandedPanelId} />}
		</>
	);
}

const renderHarness = (): void => {
	render(
		<MemoryRouter initialEntries={['/dashboard/dash-1']}>
			<CompatRouter>
				<QueryBuilderProvider>
					<Harness />
				</QueryBuilderProvider>
			</CompatRouter>
		</MemoryRouter>,
	);
};

describe('useViewPanel', () => {
	beforeEach(() => {
		renders.length = 0;
		stagedIds.length = 0;
	});

	// The builder context is global and outlives the modal; its fields seed themselves
	// on mount, so a late swap leaves them on the previously-viewed panel.
	it('seeds the builder with the opened panel before the modal renders', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderHarness();

		await user.click(screen.getByTestId('open-a'));
		await user.click(screen.getByTestId('close'));

		renders.length = 0;
		await user.click(screen.getByTestId('open-b'));

		expect(renders.length).toBeGreaterThan(0);
		expect(renders.every((r) => r.current === 'B')).toBe(true);
	});

	// The edit session commits any staged query on mount, so a staged query left over
	// from the previous panel would make this panel's preview fetch the old query.
	it('never lets the previous panel query reach the new panel draft', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderHarness();

		await user.click(screen.getByTestId('open-a'));
		await user.click(screen.getByTestId('close'));

		renders.length = 0;
		await user.click(screen.getByTestId('open-b'));

		expect(renders.every((r) => r.draft === 'B')).toBe(true);
	});

	// The drilldown URL carries the query's own id, so a staged query with that id makes
	// the provider skip hydration — losing the normalisation that fills `filters.items`.
	it('still lets the provider hydrate a drilldown query from the URL', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderHarness();

		await user.click(screen.getByTestId('open-a'));
		await user.click(screen.getByTestId('close'));

		renders.length = 0;
		await user.click(screen.getByTestId('drilldown-b'));

		expect(renders.every((r) => r.current === 'B')).toBe(true);
		expect(renders.at(-1)?.filterItems).toBeGreaterThan(0);
	});

	// `useSyncTimeOnStagedQueryChange` (dashboard toolbar) re-anchors global time when one
	// non-null staged id replaces another, refetching every panel behind the modal.
	it.each([['open-b'], ['drilldown-b']])(
		'never swaps one staged query for another (%s)',
		async (trigger) => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderHarness();

			await user.click(screen.getByTestId('open-a'));
			await user.click(screen.getByTestId('close'));
			await user.click(screen.getByTestId(trigger));

			const swapsWithoutNull = stagedIds.some(
				(id, i) => i > 0 && id !== undefined && stagedIds[i - 1] !== undefined,
			);
			expect(swapsWithoutNull).toBe(false);
		},
	);
});
