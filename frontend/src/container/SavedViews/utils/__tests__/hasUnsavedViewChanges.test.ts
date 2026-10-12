import {
	SavedviewtypesSavedViewDTO,
	SavedviewtypesSavedViewSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	initialQueriesMap,
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
	ensureLogsRequiredColumns,
} from 'container/OptionsMenu/constants';
import { FontSize, LogViewMode } from 'container/OptionsMenu/types';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import { getSavedViewQuery } from '../getSavedViewQuery';
import { hasUnsavedViewChanges } from '../hasUnsavedViewChanges';
import { toSavedViewSpec } from '../toSavedViewSpec';

jest.mock('uuid', () => ({
	v4: (): string => 'test-id',
}));

function query(dataSource: DataSource, expression = 'has_error = true'): Query {
	const base = initialQueriesMap[dataSource];
	return {
		...base,
		builder: {
			...base.builder,
			queryData: [
				{
					...base.builder.queryData[0],
					filter: { expression },
					groupBy: [{ key: 'service.name', dataType: 'string', type: 'resource' }],
				},
			],
		},
	} as Query;
}

// The server stores the queries through typed structs: nulls, empty strings,
// zeros and empty lists do not come back.
function asStoredByServer(value: unknown): unknown {
	if (Array.isArray(value)) {
		const items = value.map(asStoredByServer).filter((v) => v !== undefined);
		return items.length > 0 ? items : undefined;
	}
	if (value !== null && typeof value === 'object') {
		const entries = Object.entries(value)
			.map(([key, v]) => [key, asStoredByServer(v)] as const)
			.filter(([, v]) => v !== undefined);
		return Object.fromEntries(entries);
	}
	return value === null || value === '' || value === 0 ? undefined : value;
}

function viewFrom(
	spec: SavedviewtypesSavedViewSpecDTO,
): SavedviewtypesSavedViewDTO {
	return {
		id: 'view-1',
		spec: {
			...spec,
			queries: asStoredByServer(
				JSON.parse(JSON.stringify(spec.queries)),
			) as SavedviewtypesSavedViewSpecDTO['queries'],
		},
	} as SavedviewtypesSavedViewDTO;
}

// What the query builder stages after the view is opened: the stored query,
// with its defaults filled in.
function stagedFrom(
	view: SavedviewtypesSavedViewDTO,
	dataSource: DataSource,
): Query {
	const saved = getSavedViewQuery(view);
	return {
		...saved,
		builder: {
			...saved.builder,
			queryData: saved.builder.queryData.map((queryData) => ({
				...initialQueryBuilderFormValuesMap[dataSource],
				...queryData,
			})),
		},
	};
}

const columns = [
	{ name: 'service.name', key: 'service.name' },
	{ name: 'name', key: 'name' },
] as TelemetryFieldKey[];

const formatting = {
	format: 'raw' as LogViewMode,
	maxLines: 2,
	fontSize: FontSize.SMALL,
};

describe('hasUnsavedViewChanges', () => {
	const options = { selectColumns: columns, ...formatting };
	const view = viewFrom(
		toSavedViewSpec({
			query: query(DataSource.TRACES),
			panelType: PANEL_TYPES.LIST,
			displayName: 'Errors',
			options,
		}),
	);
	const staged = stagedFrom(view, DataSource.TRACES);

	it('is dirty when the columns change', () => {
		expect(
			hasUnsavedViewChanges({
				view,
				stagedQuery: staged,
				panelType: PANEL_TYPES.LIST,
				options: { ...options, selectColumns: [columns[0]] },
			}),
		).toBe(true);
	});

	it('reads a traces view without columns as the default columns', () => {
		const bare = viewFrom(
			toSavedViewSpec({
				query: query(DataSource.TRACES),
				panelType: PANEL_TYPES.LIST,
				displayName: 'Errors',
			}),
		);

		expect(
			hasUnsavedViewChanges({
				view: bare,
				stagedQuery: stagedFrom(bare, DataSource.TRACES),
				panelType: PANEL_TYPES.LIST,
				options: { ...options, selectColumns: defaultTraceSelectedColumns },
			}),
		).toBe(false);
	});

	describe('on logs', () => {
		const logsView = viewFrom(
			toSavedViewSpec({
				query: query(DataSource.LOGS),
				panelType: PANEL_TYPES.LIST,
				displayName: 'Errors',
				options: { selectColumns: columns, ...formatting },
			}),
		);
		const logsStaged = stagedFrom(logsView, DataSource.LOGS);
		// The explorer always adds the required logs columns.
		const shownColumns = ensureLogsRequiredColumns(columns);

		it('is clean with the required columns the explorer adds', () => {
			expect(
				hasUnsavedViewChanges({
					view: logsView,
					stagedQuery: logsStaged,
					panelType: PANEL_TYPES.LIST,
					options: { selectColumns: shownColumns, ...formatting },
				}),
			).toBe(false);
		});

		it('is dirty when the formatting changes', () => {
			expect(
				hasUnsavedViewChanges({
					view: logsView,
					stagedQuery: logsStaged,
					panelType: PANEL_TYPES.LIST,
					options: { selectColumns: shownColumns, ...formatting, maxLines: 5 },
				}),
			).toBe(true);
		});

		it('reads a view without formatting as the default formatting', () => {
			const bare = viewFrom(
				toSavedViewSpec({
					query: query(DataSource.LOGS),
					panelType: PANEL_TYPES.LIST,
					displayName: 'Errors',
				}),
			);

			expect(
				hasUnsavedViewChanges({
					view: bare,
					stagedQuery: stagedFrom(bare, DataSource.LOGS),
					panelType: PANEL_TYPES.LIST,
					options: {
						selectColumns: defaultLogsSelectedColumns,
						format: 'table',
						maxLines: 1,
						fontSize: FontSize.SMALL,
					},
				}),
			).toBe(false);
		});
	});

	it('ignores formatting on traces', () => {
		expect(
			hasUnsavedViewChanges({
				view,
				stagedQuery: staged,
				panelType: PANEL_TYPES.LIST,
				options: { ...options, ...formatting, maxLines: 5 },
			}),
		).toBe(false);
	});
});
