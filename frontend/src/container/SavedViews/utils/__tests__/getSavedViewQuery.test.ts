import {
	SavedviewtypesPanelTypeDTO,
	SavedviewtypesSavedViewDTO,
	SavedviewtypesSchemaVersionDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { getSavedViewQuery } from '../getSavedViewQuery';

jest.mock('uuid', () => ({
	v4: (): string => 'test-id',
}));

function makeView(): SavedviewtypesSavedViewDTO {
	return {
		id: 'view-1',
		name: 'errors-by-service-abc123',
		source: SavedviewtypesSourceDTO.traces,
		schemaVersion: SavedviewtypesSchemaVersionDTO.v2,
		createdBy: 'a@b.c',
		updatedBy: 'a@b.c',
		spec: {
			displayName: 'Errors by service',
			panelType: SavedviewtypesPanelTypeDTO.list,
			requestType: 'raw',
			queries: [
				{
					type: 'builder_query',
					spec: {
						name: 'A',
						signal: 'traces',
						stepInterval: 60,
						filter: { expression: 'has_error = true' },
						// v2 reads back fully defaulted envelopes; nulls must not break the mapper
						groupBy: null,
						order: null,
						selectFields: null,
						functions: null,
						legend: '',
						disabled: false,
					},
				},
			],
			selectedFields: [{ name: 'service.name' }],
			display: { color: 'red' },
		},
	} as SavedviewtypesSavedViewDTO;
}

describe('getSavedViewQuery', () => {
	it('maps the v2 spec through the v5 branch of mapQueryDataFromApi', () => {
		const query = getSavedViewQuery(makeView());

		expect(query.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(query.promql).toStrictEqual([]);
		expect(query.clickhouse_sql).toStrictEqual([]);
		expect(query.builder.queryData).toHaveLength(1);

		const [queryData] = query.builder.queryData;
		expect(queryData.queryName).toBe('A');
		expect(queryData.dataSource).toBe(DataSource.TRACES);
		expect(queryData.filter).toStrictEqual({ expression: 'has_error = true' });
		expect(queryData.groupBy).toStrictEqual([]);
		expect(queryData.orderBy).toStrictEqual([]);
	});

	it('keeps formulas alongside builder queries', () => {
		const view = makeView();
		view.spec.queries.push({
			type: 'builder_formula',
			spec: { name: 'F1', expression: 'A / 2' },
		} as SavedviewtypesSavedViewDTO['spec']['queries'][number]);

		const query = getSavedViewQuery(view);

		expect(query.builder.queryData).toHaveLength(1);
		expect(query.builder.queryFormulas).toHaveLength(1);
		expect(query.builder.queryFormulas[0].queryName).toBe('F1');
	});

	it('does not read the panel type into the query', () => {
		const view = makeView();
		view.spec.panelType = SavedviewtypesPanelTypeDTO.graph;

		const query = getSavedViewQuery(view);

		// panelType travels separately (url param), the Query itself has no such field
		expect(query).not.toHaveProperty('panelType', PANEL_TYPES.TIME_SERIES);
	});
});
