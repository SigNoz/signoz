import {
	Querybuildertypesv5RequestTypeDTO,
	SavedviewtypesPanelTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { FontSize, LogViewMode } from 'container/OptionsMenu/types';

import { toSavedViewPanelType, toSavedViewSpec } from '../toSavedViewSpec';

jest.mock('uuid', () => ({
	v4: (): string => 'test-id',
}));

function tracesQuery(): Query {
	const base = initialQueriesMap.traces;
	return {
		...base,
		builder: {
			...base.builder,
			queryData: [
				{
					...base.builder.queryData[0],
					filter: { expression: 'has_error = true' },
					groupBy: [{ key: 'service.name', dataType: 'string', type: 'resource' }],
				},
			],
		},
	} as Query;
}

const columns = [
	{
		name: 'service.name',
		key: 'service.name',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
		isIndexed: true,
	},
	{ key: 'name' },
] as unknown as TelemetryFieldKey[];

describe('toSavedViewPanelType', () => {
	it('folds a dashboard only panel type to graph', () => {
		expect(toSavedViewPanelType(PANEL_TYPES.PIE)).toBe(
			SavedviewtypesPanelTypeDTO.graph,
		);
	});
});

describe('toSavedViewSpec', () => {
	it('stores only the field identity of the columns, naming key only ones', () => {
		const spec = toSavedViewSpec({
			query: tracesQuery(),
			panelType: PANEL_TYPES.LIST,
			displayName: 'Errors',
			options: {
				selectColumns: columns,
				format: 'raw' as LogViewMode,
				maxLines: 2,
				fontSize: FontSize.SMALL,
			},
		});

		expect(spec.selectedFields).toStrictEqual([
			{
				name: 'service.name',
				signal: 'traces',
				fieldContext: 'resource',
				fieldDataType: 'string',
			},
			{ name: 'name' },
		]);
		expect(spec.display).toStrictEqual({
			format: 'raw',
			maxLines: 2,
			fontSize: FontSize.SMALL,
		});
	});

	it('keeps the description and unit of a column, naming it by name before key', () => {
		const spec = toSavedViewSpec({
			query: tracesQuery(),
			panelType: PANEL_TYPES.LIST,
			displayName: 'Errors',
			options: {
				selectColumns: [
					{
						name: 'duration_nano',
						key: 'durationNano',
						description: 'Span duration',
						unit: 'ns',
					},
				] as unknown as TelemetryFieldKey[],
				format: 'raw' as LogViewMode,
				maxLines: 2,
				fontSize: FontSize.SMALL,
			},
		});

		expect(spec.selectedFields).toStrictEqual([
			{ name: 'duration_nano', description: 'Span duration', unit: 'ns' },
		]);
	});

	it.each([
		[
			PANEL_TYPES.LIST,
			SavedviewtypesPanelTypeDTO.list,
			Querybuildertypesv5RequestTypeDTO.raw,
		],
		[
			PANEL_TYPES.TABLE,
			SavedviewtypesPanelTypeDTO.table,
			Querybuildertypesv5RequestTypeDTO.scalar,
		],
		[
			PANEL_TYPES.TRACE,
			SavedviewtypesPanelTypeDTO.trace,
			Querybuildertypesv5RequestTypeDTO.trace,
		],
		[
			PANEL_TYPES.PIE,
			SavedviewtypesPanelTypeDTO.graph,
			Querybuildertypesv5RequestTypeDTO.scalar,
		],
	])(
		'stores the %s panel as panel type %s with request type %s',
		(panelType, storedPanelType, requestType) => {
			const spec = toSavedViewSpec({
				query: tracesQuery(),
				panelType,
				displayName: 'Errors',
			});

			expect(spec.panelType).toBe(storedPanelType);
			expect(spec.requestType).toBe(requestType);
		},
	);

	it('keeps the colour in display', () => {
		const spec = toSavedViewSpec({
			query: tracesQuery(),
			panelType: PANEL_TYPES.TIME_SERIES,
			displayName: 'Errors',
			color: 'red',
		});

		expect(spec.panelType).toBe(SavedviewtypesPanelTypeDTO.graph);
		expect(spec.requestType).toBe(Querybuildertypesv5RequestTypeDTO.time_series);
		expect(spec.display).toStrictEqual({ color: 'red' });
	});
});
