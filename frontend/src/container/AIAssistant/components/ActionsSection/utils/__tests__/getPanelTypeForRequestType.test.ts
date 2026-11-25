import { ApplyFilterSignalDTO } from '@signozhq/noz-client';
import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';

import {
	getPanelTypeForRequestType,
	requestTypeFromActionQuery,
} from '../getPanelTypeForRequestType';

describe('getPanelTypeForRequestType', () => {
	it.each([
		[
			Querybuildertypesv5RequestTypeDTO.scalar,
			ApplyFilterSignalDTO.logs,
			PANEL_TYPES.TABLE,
		],
		[
			Querybuildertypesv5RequestTypeDTO.time_series,
			ApplyFilterSignalDTO.logs,
			PANEL_TYPES.TIME_SERIES,
		],
		[
			Querybuildertypesv5RequestTypeDTO.raw,
			ApplyFilterSignalDTO.logs,
			PANEL_TYPES.LIST,
		],
		[
			Querybuildertypesv5RequestTypeDTO.trace,
			ApplyFilterSignalDTO.traces,
			PANEL_TYPES.TRACE,
		],
		[
			Querybuildertypesv5RequestTypeDTO.trace,
			ApplyFilterSignalDTO.logs,
			PANEL_TYPES.LIST,
		],
		[
			Querybuildertypesv5RequestTypeDTO.trace,
			ApplyFilterSignalDTO.metrics,
			PANEL_TYPES.LIST,
		],
	])('maps %s on the %s signal to the %s view', (requestType, signal, view) => {
		expect(getPanelTypeForRequestType(requestType, signal)).toBe(view);
	});

	it.each([
		undefined,
		null,
		'',
		Querybuildertypesv5RequestTypeDTO.raw_stream,
		Querybuildertypesv5RequestTypeDTO.heatmap,
		'distribution',
		'nonsense',
		'toString',
		'constructor',
		42,
		{},
	])(
		'falls back to the List view for unmapped or invalid requestType (%p)',
		(value) => {
			expect(getPanelTypeForRequestType(value, ApplyFilterSignalDTO.traces)).toBe(
				PANEL_TYPES.LIST,
			);
		},
	);
});

describe('requestTypeFromActionQuery', () => {
	it('reads the requestType envelope field and returns undefined when absent', () => {
		expect(
			requestTypeFromActionQuery({
				requestType: 'scalar',
				schemaVersion: 'v5',
				compositeQuery: { queries: [] },
			}),
		).toBe('scalar');
		expect(requestTypeFromActionQuery({})).toBeUndefined();
		expect(requestTypeFromActionQuery(null)).toBeUndefined();
		expect(requestTypeFromActionQuery(undefined)).toBeUndefined();
	});

	it('maps a grouped count() payload to the Table view', () => {
		const query = {
			requestType: 'scalar',
			schemaVersion: 'v5',
			compositeQuery: {
				queries: [
					{
						type: 'builder_query',
						spec: {
							signal: 'logs',
							aggregations: [{ expression: 'count()' }],
							groupBy: [{ name: 'service.name' }],
						},
					},
				],
			},
		};
		expect(
			getPanelTypeForRequestType(
				requestTypeFromActionQuery(query),
				ApplyFilterSignalDTO.logs,
			),
		).toBe(PANEL_TYPES.TABLE);
	});
});
