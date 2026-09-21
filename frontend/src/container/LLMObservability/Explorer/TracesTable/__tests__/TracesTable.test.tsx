import { useState } from 'react';
import { useColumnStore } from 'components/TanStackTableView/useColumnStore';
import { LOCALSTORAGE } from 'constants/localStorage';
import { render, screen, userEvent } from 'tests/test-utils';

import { buildTraceViewColumns } from '../../TracesView/configs';
import TracesTable from '../TracesTable';

const STORAGE_KEY = LOCALSTORAGE.AI_OBSERVABILITY_TRACE_VIEW_COLUMNS;
const PERSISTED_KEY = `@signoz/table-columns/${STORAGE_KEY}`;

const ROWS = [{ id: 't1', trace_id: 'abc', 'service.name': 'checkout' }];

const COLUMNS = buildTraceViewColumns([
	{ name: 'trace_id' },
	{ name: 'service.name', fieldContext: 'resource' },
	{ name: 'start_time' },
]);

function RaceHarness(): JSX.Element {
	const [columnsReady, setColumnsReady] = useState(false);

	return (
		<>
			<button type="button" onClick={(): void => setColumnsReady(true)}>
				columns-ready
			</button>
			<TracesTable
				data={ROWS}
				columns={columnsReady ? COLUMNS : []}
				columnStorageKey={STORAGE_KEY}
				respectColumnOrder
				panelType="TRACE"
				getRowHref={(): string => '/trace/abc'}
				isLoading={!columnsReady}
				isFetching={false}
				isError={false}
				error={null}
				isFilterApplied={false}
			/>
		</>
	);
}

const persistedState = (): { hiddenColumnIds: string[] } | null => {
	const raw = localStorage.getItem(PERSISTED_KEY);
	return raw ? (JSON.parse(raw) as { hiddenColumnIds: string[] }) : null;
};

describe('TracesTable column-init race', () => {
	beforeEach(() => {
		useColumnStore.setState({ tables: {} });
		localStorage.clear();
	});

	it('does not persist empty defaults when rows land before columns', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<RaceHarness />);

		expect(screen.getByText(/pending_data_placeholder/i)).toBeInTheDocument();
		expect(screen.queryByRole('table')).not.toBeInTheDocument();
		expect(useColumnStore.getState().tables[STORAGE_KEY]).toBeUndefined();
		expect(persistedState()).toBeNull();

		await user.click(screen.getByRole('button', { name: 'columns-ready' }));

		await expect(screen.findByRole('table')).resolves.toBeInTheDocument();
		expect(screen.getByText('trace_id')).toBeInTheDocument();
		expect(screen.queryByText('start_time')).not.toBeInTheDocument();
		expect(persistedState()?.hiddenColumnIds).toStrictEqual(['start_time']);
	});
});
